/**
 * ImportQuestionsPage - Trang import câu hỏi từ file Excel/CSV hoặc nhập trực tiếp bằng bảng
 * Hỗ trợ:
 * - Môn có levels/sections (legacy: JLPT)
 * - Môn có layers/categories (dynamic: BJT, etc.)
 * - Import đề thi 聴解 (Listening) với cấu trúc Mondai
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSEO } from '@/hooks/useSEO';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, LogIn, Shield, Table2, FileText, Headphones, CopyCheck, Car, Plus, Trash2, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TableImport, type TableQuestion } from '@/components/admin/TableImport';
import { 
  ListeningImport, 
  type ListeningExamData, 
  flattenListeningExam, 
  countValidListeningQuestions 
} from '@/components/admin/ListeningImport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sanitizeRichText } from '@/lib/richText';
import { Checkbox } from '@/components/ui/checkbox';

interface ParsedQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation?: string;
}

interface DrivingSubQuestion {
  content: string;
  correct_option: 'A' | 'B';
  explanation?: string;
}

interface DrivingQuestion {
  content: string;
  correct_option: 'A' | 'B'; // A = O (Đúng), B = X (Sai)
  explanation?: string;
  image_url?: string;
  subQuestions?: DrivingSubQuestion[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  has_levels: boolean;
}

interface Level {
  id: string;
  name: string;
  slug: string;
  subject_id: string | null;
  description: string | null;
}

interface Section {
  id: string;
  name: string;
  slug: string;
  level_id: string;
  description: string | null;
}

interface SubjectLayer {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  order_index: number;
  required: boolean;
}

interface Category {
  id: string;
  subject_id: string;
  layer_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  order_index: number | null;
  allow_random: boolean;
  allow_count_selection: boolean;
  fixed_exam_mode: boolean;
}

function isValidTableQuestion(q: TableQuestion): boolean {
  const optionCount = q.option_count ?? 4;
  const questionType = q.question_type ?? 'standard';
  
  if (questionType === 'audio_only' && q.subQuestions && q.subQuestions.length > 0) {
    return q.subQuestions.some(sq => {
      const sqType = sq.question_type ?? 'standard';
      if (sqType === 'audio_only') return !!sq.correct_option;
      const sqCount = sq.option_count ?? 4;
      const hasReqOpts = !!sq.option_a && !!sq.option_b && 
        (sqCount < 3 || !!sq.option_c) && (sqCount < 4 || !!sq.option_d);
      return !!sq.content && hasReqOpts && !!sq.correct_option;
    });
  }
  
  if (questionType === 'audio_only') {
    return !!q.correct_option;
  }
  
  if (!q.content) return false;

  const hasRequiredOptions = 
    !!q.option_a && !!q.option_b && 
    (optionCount < 3 || !!q.option_c) && 
    (optionCount < 4 || !!q.option_d);
  
  const hasDirectAnswer = hasRequiredOptions && !!q.correct_option;

  const hasValidSubQuestions = (q.subQuestions ?? []).some(sq => {
    const sqType = sq.question_type ?? 'standard';
    if (sqType === 'audio_only') return !!sq.correct_option;
    const sqCount = sq.option_count ?? 4;
    const hasReqOpts = !!sq.option_a && !!sq.option_b && 
      (sqCount < 3 || !!sq.option_c) && (sqCount < 4 || !!sq.option_d);
    return !!sq.content && hasReqOpts && !!sq.correct_option;
  });

  return hasDirectAnswer || hasValidSubQuestions;
}

const ImportQuestionsPage = () => {
  useRobotsMeta('noindex, nofollow');
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [tableQuestions, setTableQuestions] = useState<TableQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'table' | 'file' | 'listening' | 'driving'>('table');
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Driving import state
  const [drivingImportTab, setDrivingImportTab] = useState<'manual' | 'excel'>('manual');
  const [drivingQuestions, setDrivingQuestions] = useState<DrivingQuestion[]>([
    { content: '', correct_option: 'A', explanation: '', image_url: '' }
  ]);
  const [drivingJsonText, setDrivingJsonText] = useState('');
  const [drivingExcelFile, setDrivingExcelFile] = useState<File | null>(null);
  const validDrivingCount = useMemo(
    () => drivingQuestions.filter(q => q.content.trim().length > 0).length,
    [drivingQuestions]
  );
  const totalDrivingSubQuestions = useMemo(
    () => drivingQuestions.reduce((sum, q) => sum + (q.subQuestions?.filter(sq => sq.content.trim().length > 0).length || 0), 0),
    [drivingQuestions]
  );

  // Listening import data
  const [listeningData, setListeningData] = useState<ListeningExamData>({ audioUrl: '', mondais: [] });
  const validListeningCount = useMemo(() => countValidListeningQuestions(listeningData), [listeningData]);

  const validTableQuestionsCount = useMemo(
    () => tableQuestions.filter(isValidTableQuestion).length,
    [tableQuestions]
  );

  // Legacy data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  // Dynamic layer data
  const [subjectLayers, setSubjectLayers] = useState<SubjectLayer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);

  // Selected values
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  
  // Dynamic layer selections: layerIndex → categoryId
  const [selectedCategories, setSelectedCategories] = useState<Record<number, string>>({});

  // Get selected subject
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  
  // Determine if subject uses layers (dynamic) vs levels (legacy)
  const subjectLayersList = useMemo(
    () => subjectLayers.filter(l => l.subject_id === selectedSubjectId).sort((a, b) => a.order_index - b.order_index),
    [subjectLayers, selectedSubjectId]
  );
  const usesLayers = subjectLayersList.length > 0;
  const subjectHasLevels = selectedSubject?.has_levels ?? true;

  // Tải dữ liệu từ database
  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsRes, levelsRes, sectionsRes, layersRes, categoriesRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('levels').select('*').order('order_index'),
          supabase.from('sections').select('*').order('order_index'),
          supabase.from('subject_layers').select('*').order('order_index'),
          supabase.from('categories').select('*').order('order_index'),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (levelsRes.error) throw levelsRes.error;
        if (sectionsRes.error) throw sectionsRes.error;
        if (layersRes.error) throw layersRes.error;
        if (categoriesRes.error) throw categoriesRes.error;

        setSubjects(subjectsRes.data || []);
        setLevels(levelsRes.data || []);
        setSections(sectionsRes.data || []);
        setSubjectLayers(layersRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Reset selections when subject changes
  useEffect(() => {
    setSelectedLevelId('');
    setSelectedSectionId('');
    setSelectedCategories({});
  }, [selectedSubjectId]);

  useEffect(() => {
    setSelectedSectionId('');
  }, [selectedLevelId]);

  // Reset form data when target changes (section or leaf category)
  const importTarget = useMemo(() => {
    if (usesLayers) {
      // Find the deepest selected category
      const maxIdx = Math.max(...Object.keys(selectedCategories).map(Number), -1);
      return maxIdx >= 0 ? selectedCategories[maxIdx] : '';
    }
    return selectedSectionId;
  }, [usesLayers, selectedCategories, selectedSectionId]);

  useEffect(() => {
    setTableQuestions([]);
    setParsedQuestions([]);
    setFile(null);
    setImportResult(null);
    setListeningData({ audioUrl: '', mondais: [] });
    setDrivingQuestions([{ content: '', correct_option: 'A', explanation: '', image_url: '' }]);
    setDrivingJsonText('');
    setDrivingExcelFile(null);
  }, [importTarget]);

  // Filter levels and sections based on selection (legacy)
  const filteredLevels = levels.filter(l => l.subject_id === selectedSubjectId);
  const filteredSections = subjectHasLevels
    ? sections.filter(s => s.level_id === selectedLevelId)
    : sections.filter(s => {
        const level = levels.find(l => l.id === s.level_id);
        return level?.subject_id === selectedSubjectId;
      });

  // Get categories for a specific layer with optional parent filter
  const getCategoriesForLayer = useCallback((layerIdx: number): Category[] => {
    const layer = subjectLayersList[layerIdx];
    if (!layer) return [];
    
    const parentCatId = layerIdx > 0 ? selectedCategories[layerIdx - 1] : undefined;
    
    return categories.filter(c => {
      if (c.layer_id !== layer.id) return false;
      if (layerIdx === 0) return c.parent_id === null;
      return c.parent_id === (parentCatId || null);
    });
  }, [subjectLayersList, categories, selectedCategories]);

  // Check if we have a valid leaf category selected (for layer-based subjects)
  const selectedLeafCategory = useMemo(() => {
    if (!usesLayers) return null;
    // Find the deepest selected category
    const maxIdx = Math.max(...Object.keys(selectedCategories).map(Number), -1);
    if (maxIdx < 0) return null;
    const catId = selectedCategories[maxIdx];
    return categories.find(c => c.id === catId) || null;
  }, [usesLayers, selectedCategories, categories]);

  // Determine if import is ready
  const isReadyToImport = usesLayers ? !!selectedLeafCategory : !!selectedSectionId;

  // Handle category selection change
  const handleCategoryChange = useCallback((layerIdx: number, categoryId: string) => {
    setSelectedCategories(prev => {
      const next: Record<number, string> = {};
      // Keep selections up to this layer
      for (let i = 0; i < layerIdx; i++) {
        if (prev[i]) next[i] = prev[i];
      }
      if (categoryId) next[layerIdx] = categoryId;
      return next;
    });
  }, []);

  // Parse CSV file
  const parseCSV = useCallback((text: string): ParsedQuestion[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const dataLines = lines.slice(1);
    const questions: ParsedQuestion[] = [];

    dataLines.forEach((line) => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length >= 6) {
        let correctOption = values[5]?.trim().toUpperCase();
        
        if (correctOption.startsWith('OPTION_')) {
          correctOption = correctOption.replace('OPTION_', '');
        }
        
        if (['A', 'B', 'C', 'D'].includes(correctOption)) {
          questions.push({
            content: values[0] || '',
            option_a: values[1] || '',
            option_b: values[2] || '',
            option_c: values[3] || '',
            option_d: values[4] || '',
            correct_option: correctOption,
            explanation: values[6] || undefined,
          });
        }
      }
    });

    return questions;
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const questions = parseCSV(text);
      setParsedQuestions(questions);

      if (questions.length === 0) {
        toast.error('Không tìm thấy câu hỏi hợp lệ trong file');
      } else {
        toast.success(`Đã đọc ${questions.length} câu hỏi từ file`);
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      toast.error('Lỗi khi đọc file. Vui lòng kiểm tra định dạng.');
    }
  }, [parseCSV]);

  // Import questions to database
  const handleImport = useCallback(async () => {
    let questionsToImport: any[];
    let listeningQuestions: ReturnType<typeof flattenListeningExam> = [];
    
    // Determine effective import mode (driving is determined by subject slug, not importMode state)
    const effectiveMode = selectedSubject?.slug === 'bang-lai-xe' ? 'driving' : importMode;
    
    if (effectiveMode === 'listening') {
      listeningQuestions = flattenListeningExam(listeningData);
      questionsToImport = listeningQuestions;
    } else if (effectiveMode === 'driving') {
      // Generate a unique exam group key for this batch
      const drivingExamKey = `driving-exam-${Date.now()}`;
      
      // Parse driving questions from manual or excel/csv/json
      if (drivingImportTab === 'excel') {
        // If drivingJsonText has parsed data from file, use it; otherwise try as JSON
        if (drivingQuestions.length > 0 && drivingExcelFile) {
          // Already parsed from Excel/CSV into drivingQuestions
          questionsToImport = drivingQuestions
            .filter(q => q.content.trim().length > 0)
            .map(q => ({
              content: q.content.trim(),
              option_a: 'Đúng (○)',
              option_b: 'Sai (✕)',
              option_c: null,
              option_d: null,
              correct_option: q.correct_option,
              explanation: q.explanation || null,
              image_url: q.image_url || null,
              audio_url: drivingExamKey,
              option_count: 2,
              question_type: 'standard',
            }));
        } else if (drivingJsonText.trim()) {
          try {
            const parsed = JSON.parse(drivingJsonText);
            const arr = Array.isArray(parsed) ? parsed : [];
            questionsToImport = arr.map((item: any) => ({
              content: item.content || item.question || item.câu_hỏi || '',
              option_a: 'Đúng (○)',
              option_b: 'Sai (✕)',
              option_c: null,
              option_d: null,
              correct_option: (item.correct_option || item.answer || item.đáp_án || 'A').toUpperCase() === 'A' || 
                             (item.correct_option || item.answer || item.đáp_án || '') === 'O' || 
                             (item.correct_option || '') === '○' ? 'A' : 'B',
              explanation: item.explanation || item.giải_thích || null,
              image_url: item.image_url || item.hình_ảnh || null,
              audio_url: drivingExamKey,
              option_count: 2,
              question_type: 'standard',
            }));
          } catch {
            toast.error('JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.');
            return;
          }
        } else {
          toast.error('Chưa có dữ liệu. Vui lòng tải file hoặc dán JSON.');
          return;
        }
      } else {
        questionsToImport = drivingQuestions
          .filter(q => q.content.trim().length > 0)
          .map(q => ({
            content: q.content.trim(),
            option_a: 'Đúng (○)',
            option_b: 'Sai (✕)',
            option_c: null,
            option_d: null,
            correct_option: q.correct_option,
            explanation: q.explanation || null,
            image_url: q.image_url || null,
            audio_url: drivingExamKey,
            option_count: 2,
            question_type: 'standard',
            subQuestions: q.subQuestions?.filter(sq => sq.content.trim().length > 0).map(sq => ({
              content: sq.content.trim(),
              option_a: 'Đúng (○)',
              option_b: 'Sai (✕)',
              option_c: null,
              option_d: null,
              correct_option: sq.correct_option,
              explanation: sq.explanation || null,
              option_count: 2,
              question_type: 'standard',
            })),
          }));
      }
    } else if (effectiveMode === 'table') {
      questionsToImport = tableQuestions.filter(isValidTableQuestion);
    } else {
      questionsToImport = parsedQuestions;
    }

    if (!isReadyToImport || questionsToImport.length === 0) {
      toast.error('Vui lòng chọn đầy đủ phân loại và nhập câu hỏi');
      return;
    }

    setIsLoading(true);
    const result: ImportResult & { duplicates: number } = { success: 0, failed: 0, duplicates: 0, errors: [] };

    try {
      const normalizeContent = (content: string) => {
        return content
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      };

      // Determine target: section_id (legacy) or category_id (dynamic)
      const targetSectionId = usesLayers ? null : selectedSectionId;
      const targetCategoryId = usesLayers ? selectedLeafCategory?.id : null;

      // Skip duplicate check if allowDuplicates is enabled
      let existingContents = new Set<string>();
      if (!allowDuplicates) {
        let fetchQuery = supabase.from('questions').select('content');
        if (targetSectionId) {
          fetchQuery = fetchQuery.eq('section_id', targetSectionId);
        } else if (targetCategoryId) {
          fetchQuery = fetchQuery.eq('category_id', targetCategoryId);
        }
        const { data: existingQuestions, error: fetchError } = await fetchQuery;

        if (fetchError) {
          console.error('Error fetching existing questions:', fetchError);
          toast.error('Lỗi khi kiểm tra câu hỏi trùng lặp');
          setIsLoading(false);
          return;
        }

        existingContents = new Set(
          (existingQuestions || []).map(q => normalizeContent(q.content))
        );
      }

      for (let i = 0; i < questionsToImport.length; i++) {
        const q = questionsToImport[i];
        const normalizedContent = normalizeContent(q.content);

        if (!allowDuplicates && normalizedContent && existingContents.has(normalizedContent)) {
          result.duplicates++;
          continue;
        }

        const explanationRaw = (q as { explanation?: string }).explanation;
        const safeExplanation = explanationRaw && explanationRaw.trim().length > 0
          ? sanitizeRichText(explanationRaw)
          : null;

        // Build insert object
        const insertData: Record<string, any> = {
          content: sanitizeRichText(q.content || ''),
          option_a: sanitizeRichText(q.option_a || ''),
          option_b: sanitizeRichText(q.option_b || ''),
          option_c: sanitizeRichText(q.option_c || '') || null,
          option_d: sanitizeRichText(q.option_d || '') || null,
          correct_option: q.correct_option || 'A',
          explanation: safeExplanation,
          image_url: q.image_url || null,
          audio_url: q.audio_url || null,
          question_type: q.question_type || 'standard',
          option_count: q.option_count || 4,
        };

        // Set target: legacy section_id or dynamic category_id
        if (targetSectionId) {
          insertData.section_id = targetSectionId;
        }
        if (targetCategoryId) {
          insertData.category_id = targetCategoryId;
        }

        // Add mondai fields for listening mode
        if (effectiveMode === 'listening' && q.mondai_index != null) {
          insertData.mondai_index = q.mondai_index;
          insertData.mondai_title = q.mondai_title || null;
        }

        const { data: parentQuestion, error } = await supabase
          .from('questions')
          .insert(insertData as any)
          .select('id')
          .single();

        // Insert sub-questions if any
        const subQuestions = q.subQuestions;
        if (!error && parentQuestion && subQuestions && subQuestions.length > 0) {
          for (const sq of subQuestions) {
            const subInsert: Record<string, any> = {
              parent_id: parentQuestion.id,
              content: sanitizeRichText(sq.content || ''),
              option_a: sanitizeRichText(sq.option_a || ''),
              option_b: sanitizeRichText(sq.option_b || ''),
              option_c: sanitizeRichText(sq.option_c || '') || null,
              option_d: sanitizeRichText(sq.option_d || '') || null,
              correct_option: sq.correct_option,
              explanation: sq.explanation ? sanitizeRichText(sq.explanation) : null,
              question_type: sq.question_type || 'standard',
              option_count: sq.option_count || 4,
            };
            if (targetSectionId) subInsert.section_id = targetSectionId;
            if (targetCategoryId) subInsert.category_id = targetCategoryId;
            if (effectiveMode === 'listening' && q.mondai_index != null) {
              subInsert.mondai_index = q.mondai_index;
              subInsert.mondai_title = q.mondai_title || null;
            }
            await supabase.from('questions').insert(subInsert as any);
          }
        }

        if (error) {
          result.failed++;
          result.errors.push(`Câu ${i + 1}: ${error.message}`);
        } else {
          result.success++;
          if (normalizedContent) existingContents.add(normalizedContent);
        }
      }

      setImportResult(result);

      const messages: string[] = [];
      if (result.success > 0) messages.push(`${result.success} câu hỏi mới`);
      if (result.duplicates > 0) messages.push(`${result.duplicates} câu trùng lặp bỏ qua`);
      if (result.failed > 0) messages.push(`${result.failed} lỗi`);

      if (result.success > 0) {
        toast.success(`Import thành công: ${messages.join(', ')}`);
        setTableQuestions([]);
        setParsedQuestions([]);
        setFile(null);
        setImportResult(null);
        setListeningData({ audioUrl: '', mondais: [] });
      } else if (result.duplicates > 0) {
        toast.warning(`Tất cả ${result.duplicates} câu hỏi đều trùng lặp`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} câu hỏi không import được`);
      }
    } catch (err) {
      console.error('Error importing:', err);
      toast.error('Lỗi khi import câu hỏi');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSectionId, parsedQuestions, tableQuestions, importMode, listeningData, usesLayers, selectedLeafCategory, isReadyToImport, allowDuplicates, drivingQuestions, drivingImportTab, drivingJsonText, drivingExcelFile, selectedSubject]);

  // Download sample template
  const downloadTemplate = useCallback(() => {
    const headers = 'câu hỏi,đáp án 1,đáp án 2,đáp án 3,đáp án 4,đáp án đúng,giải thích';
    const sample1 = '"「やま」の漢字はどれですか。","川","山","田","森","B","山 có nghĩa là núi"';
    const sample2 = '"「みず」の漢字はどれですか。","火","土","水","金","C",""';
    const csv = `${headers}\n${sample1}\n${sample2}`;

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau_import_cau_hoi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Handle driving file upload (Excel/CSV)
  const handleDrivingFileUpload = useCallback(async (file: File) => {
    setDrivingExcelFile(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (ext === 'csv') {
        const text = await file.text();
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
          toast.error('File CSV không có dữ liệu');
          return;
        }
        const dataLines = lines.slice(1);
        const parsed: DrivingQuestion[] = dataLines.map(line => {
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else { current += char; }
          }
          values.push(current.trim());
          
          const correctRaw = (values[2] || 'A').toUpperCase();
          const correctOption: 'A' | 'B' = correctRaw === 'B' || correctRaw === 'X' || correctRaw === '✕' || correctRaw === 'SAI' ? 'B' : 'A';
          
          return {
            content: values[0] || '',
            image_url: values[1] || '',
            correct_option: correctOption,
            explanation: values[3] || '',
          };
        }).filter(q => q.content.trim().length > 0);
        
        setDrivingQuestions(parsed);
        toast.success(`Đã đọc ${parsed.length} câu hỏi từ CSV`);
      } else if (ext === 'xlsx') {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet || worksheet.rowCount < 2) {
          toast.error('File Excel không có dữ liệu');
          return;
        }
        
        const parsed: DrivingQuestion[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const values = row.values as any[];
          // exceljs row.values is 1-indexed (index 0 is undefined)
          const correctRaw = String(values[3] || 'A').toUpperCase();
          const correctOption: 'A' | 'B' = correctRaw === 'B' || correctRaw === 'X' || correctRaw === '✕' || correctRaw === 'SAI' ? 'B' : 'A';
          const content = String(values[1] || '').trim();
          if (content.length > 0) {
            parsed.push({
              content,
              image_url: String(values[2] || ''),
              correct_option: correctOption,
              explanation: String(values[4] || ''),
            });
          }
        });
        
        setDrivingQuestions(parsed);
        toast.success(`Đã đọc ${parsed.length} câu hỏi từ Excel`);
      } else {
        toast.error('Chỉ hỗ trợ file .xlsx hoặc .csv');
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      toast.error('Lỗi khi đọc file. Vui lòng kiểm tra định dạng.');
    }
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mx-auto max-w-md text-center">
            <LogIn className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Yêu cầu đăng nhập</h1>
            <p className="mb-6 text-muted-foreground">
              Bạn cần đăng nhập với tài khoản admin để import câu hỏi
            </p>
            <Link to="/auth">
              <Button className="gap-2">
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mx-auto max-w-md text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Không có quyền truy cập</h1>
            <p className="mb-6 text-muted-foreground">
              Chỉ admin mới có thể import câu hỏi. Liên hệ quản trị viên để được cấp quyền.
            </p>
            <Link to="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Count current step number
  let stepNumber = 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', href: '/' },
              { label: 'Import câu hỏi' },
            ]}
          />
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              Import câu hỏi
            </h1>
            <p className="text-muted-foreground">
              Nhập trực tiếp vào bảng hoặc tải lên file CSV để thêm câu hỏi vào ngân hàng
            </p>
          </div>

          {/* Step 1: Select subject */}
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold text-foreground">{stepNumber++}. Chọn môn học</h2>
            <div className="mb-4">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={loadingData}
              >
                <option value="">-- Chọn môn học --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {subjects.length === 0 && !loadingData && (
              <p className="text-sm text-muted-foreground">
                Chưa có môn học. <Link to="/manage-subjects" className="text-primary hover:underline">Thêm môn học</Link> trước khi import.
              </p>
            )}
          </div>

          {/* Dynamic Layer Selection (for layer-based subjects like BJT) */}
          {selectedSubjectId && usesLayers && (
            <>
              {subjectLayersList.map((layer, idx) => {
                // Only show this layer if previous layers are selected (or it's the first)
                if (idx > 0 && !selectedCategories[idx - 1]) return null;
                
                const layerCategories = getCategoriesForLayer(idx);
                
                // Skip layers that have no categories (e.g., "Chủ đề" when subject only has skills)
                if (layerCategories.length === 0 && idx > 0) return null;
                
                const currentStep = stepNumber++;
                
                return (
                  <div key={layer.id} className="mb-6 rounded-xl border border-border bg-card p-6">
                    <h2 className="mb-3 font-semibold text-foreground">
                      {currentStep}. Chọn {layer.name}
                    </h2>
                    <div className="mb-4">
                      <select
                        value={selectedCategories[idx] || ''}
                        onChange={(e) => handleCategoryChange(idx, e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- Chọn {layer.name} --</option>
                        {layerCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {layerCategories.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Chưa có {layer.name}. <Link to="/manage-subjects" className="text-primary hover:underline">Thêm {layer.name}</Link> trước.
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Legacy Level Selection (for level-based subjects like JLPT) */}
          {selectedSubjectId && !usesLayers && subjectHasLevels && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">{stepNumber++}. Chọn cấp độ</h2>
              <div className="mb-4">
                <select
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Chọn cấp độ --</option>
                  {filteredLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              {filteredLevels.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chưa có cấp độ. <Link to="/manage-subjects" className="text-primary hover:underline">Thêm cấp độ</Link> trước.
                </p>
              )}
            </div>
          )}

          {/* Legacy Section Selection */}
          {selectedSubjectId && !usesLayers && ((subjectHasLevels && selectedLevelId) || !subjectHasLevels) && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">
                {stepNumber++}. Chọn phần
              </h2>
              <div className="mb-4">
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Chọn phần --</option>
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {filteredSections.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chưa có phần luyện thi. <Link to="/manage-subjects" className="text-primary hover:underline">Thêm phần</Link> trước.
                </p>
              )}
            </div>
          )}

          {/* Input questions - Tabs for table/file */}
          {isReadyToImport && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">
                {stepNumber++}. Nhập câu hỏi
              </h2>

              {/* Driving mode: special O/X input UI */}
              {selectedSubject?.slug === 'bang-lai-xe' ? (
                <div className="space-y-4">
                  <Tabs value={drivingImportTab} onValueChange={(v) => setDrivingImportTab(v as 'manual' | 'excel')}>
                    <TabsList className="mb-4 grid w-full grid-cols-2">
                      <TabsTrigger value="manual" className="gap-2">
                        <Table2 className="h-4 w-4" />
                        Nhập trực tiếp
                      </TabsTrigger>
                      <TabsTrigger value="excel" className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Import đề trọn vẹn (Excel / CSV / JSON)
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="mt-0 space-y-3">
                      <p className="text-xs text-muted-foreground">Nhập nội dung câu hỏi và chọn đáp án Đúng (○) hoặc Sai (✕)</p>
                      {drivingQuestions.map((q, idx) => (
                        <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Câu {idx + 1}</span>
                            {drivingQuestions.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDrivingQuestions(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <textarea
                            value={q.content}
                            onChange={(e) => setDrivingQuestions(prev => prev.map((item, i) => i === idx ? { ...item, content: e.target.value } : item))}
                            placeholder="Nhập nội dung câu hỏi..."
                            className="w-full min-h-[60px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            rows={2}
                          />
                          {/* Image upload */}
                          <MediaUpload
                            type="image"
                            value={q.image_url || undefined}
                            onChange={(url) => setDrivingQuestions(prev => prev.map((item, i) => i === idx ? { ...item, image_url: url || '' } : item))}
                          />
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">Đáp án:</span>
                            <button
                              onClick={() => setDrivingQuestions(prev => prev.map((item, i) => i === idx ? { ...item, correct_option: 'A' } : item))}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all"
                              style={{
                                backgroundColor: q.correct_option === 'A' ? '#dbeafe' : '#f3f4f6',
                                borderColor: q.correct_option === 'A' ? '#2563eb' : '#d1d5db',
                                color: q.correct_option === 'A' ? '#1d4ed8' : '#6b7280',
                              }}
                            >
                              ○ Đúng
                            </button>
                            <button
                              onClick={() => setDrivingQuestions(prev => prev.map((item, i) => i === idx ? { ...item, correct_option: 'B' } : item))}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all"
                              style={{
                                backgroundColor: q.correct_option === 'B' ? '#fee2e2' : '#f3f4f6',
                                borderColor: q.correct_option === 'B' ? '#dc2626' : '#d1d5db',
                                color: q.correct_option === 'B' ? '#dc2626' : '#6b7280',
                              }}
                            >
                              ✕ Sai
                            </button>
                          </div>
                          <input
                            value={q.explanation || ''}
                            onChange={(e) => setDrivingQuestions(prev => prev.map((item, i) => i === idx ? { ...item, explanation: e.target.value } : item))}
                            placeholder="Giải thích (tùy chọn)..."
                            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          {/* Sub-questions */}
                          {q.subQuestions && q.subQuestions.length > 0 && (
                            <div className="ml-4 space-y-2 border-l-2 border-primary/20 pl-3">
                              <p className="text-xs font-medium text-muted-foreground">Câu hỏi con:</p>
                              {q.subQuestions.map((sq, sqIdx) => (
                                <div key={sqIdx} className="rounded-md border border-border/50 bg-background p-2 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-muted-foreground">Câu con {sqIdx + 1}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                      onClick={() => setDrivingQuestions(prev => prev.map((item, i) => {
                                        if (i !== idx) return item;
                                        const newSubs = [...(item.subQuestions || [])];
                                        newSubs.splice(sqIdx, 1);
                                        return { ...item, subQuestions: newSubs.length > 0 ? newSubs : undefined };
                                      }))}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <textarea
                                    value={sq.content}
                                    onChange={(e) => setDrivingQuestions(prev => prev.map((item, i) => {
                                      if (i !== idx) return item;
                                      const newSubs = [...(item.subQuestions || [])];
                                      newSubs[sqIdx] = { ...newSubs[sqIdx], content: e.target.value };
                                      return { ...item, subQuestions: newSubs };
                                    }))}
                                    placeholder="Nội dung câu hỏi con..."
                                    className="w-full min-h-[40px] rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                    rows={1}
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground">Đáp án:</span>
                                    <button
                                      onClick={() => setDrivingQuestions(prev => prev.map((item, i) => {
                                        if (i !== idx) return item;
                                        const newSubs = [...(item.subQuestions || [])];
                                        newSubs[sqIdx] = { ...newSubs[sqIdx], correct_option: 'A' };
                                        return { ...item, subQuestions: newSubs };
                                      }))}
                                      className="px-2 py-0.5 rounded text-xs font-bold border transition-all"
                                      style={{
                                        backgroundColor: sq.correct_option === 'A' ? '#dbeafe' : '#f3f4f6',
                                        borderColor: sq.correct_option === 'A' ? '#2563eb' : '#d1d5db',
                                        color: sq.correct_option === 'A' ? '#1d4ed8' : '#6b7280',
                                      }}
                                    >
                                      ○
                                    </button>
                                    <button
                                      onClick={() => setDrivingQuestions(prev => prev.map((item, i) => {
                                        if (i !== idx) return item;
                                        const newSubs = [...(item.subQuestions || [])];
                                        newSubs[sqIdx] = { ...newSubs[sqIdx], correct_option: 'B' };
                                        return { ...item, subQuestions: newSubs };
                                      }))}
                                      className="px-2 py-0.5 rounded text-xs font-bold border transition-all"
                                      style={{
                                        backgroundColor: sq.correct_option === 'B' ? '#fee2e2' : '#f3f4f6',
                                        borderColor: sq.correct_option === 'B' ? '#dc2626' : '#d1d5db',
                                        color: sq.correct_option === 'B' ? '#dc2626' : '#6b7280',
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <input
                                    value={sq.explanation || ''}
                                    onChange={(e) => setDrivingQuestions(prev => prev.map((item, i) => {
                                      if (i !== idx) return item;
                                      const newSubs = [...(item.subQuestions || [])];
                                      newSubs[sqIdx] = { ...newSubs[sqIdx], explanation: e.target.value };
                                      return { ...item, subQuestions: newSubs };
                                    }))}
                                    placeholder="Giải thích câu con (tùy chọn)..."
                                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setDrivingQuestions(prev => prev.map((item, i) => {
                              if (i !== idx) return item;
                              const newSubs = [...(item.subQuestions || []), { content: '', correct_option: 'A' as const, explanation: '' }];
                              return { ...item, subQuestions: newSubs };
                            }))}
                          >
                            <Plus className="h-3 w-3" />
                            Thêm câu hỏi con
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setDrivingQuestions(prev => [...prev, { content: '', correct_option: 'A', explanation: '', image_url: '' }])}
                      >
                        <Plus className="h-4 w-4" />
                        Thêm câu hỏi
                      </Button>
                      {validDrivingCount > 0 && (
                        <p className="text-sm text-success flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          {validDrivingCount} câu hỏi hợp lệ
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="excel" className="mt-0 space-y-4">
                      {/* Template download */}
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                          const headers = 'Nội dung câu hỏi,Link hình ảnh (nếu có),Đáp án (A=Đúng/B=Sai),Giải thích';
                          const sample1 = '"シートベルトは運転者のみ装着すれば良い。","","B","全員が着用する必要がある。"';
                          const sample2 = '"赤信号では必ず停止しなければならない。","https://example.com/image.jpg","A","赤信号は停止の意味。"';
                          const csv = `${headers}\n${sample1}\n${sample2}`;
                          const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = 'mau_de_thi_bang_lai_xe.csv';
                          link.click();
                          URL.revokeObjectURL(url);
                        }}>
                          <Download className="h-4 w-4" />
                          Tải file mẫu
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          CSV/Excel: 4 cột (Nội dung | Link ảnh | Đáp án | Giải thích)
                        </span>
                      </div>

                      {/* Drag & Drop file upload */}
                      <label
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-primary/5"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;
                          await handleDrivingFileUpload(file);
                        }}
                      >
                        <FileSpreadsheet className="mb-3 h-12 w-12 text-muted-foreground" />
                        <span className="mb-1 font-medium text-foreground">
                          {drivingExcelFile ? drivingExcelFile.name : 'Kéo thả file Excel/CSV vào đây'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Hỗ trợ .xlsx, .csv — hoặc click để chọn file
                        </span>
                        <input
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await handleDrivingFileUpload(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>

                      {drivingExcelFile && validDrivingCount > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-success flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Đã đọc {validDrivingCount} câu hỏi từ file
                          </p>
                          <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-48 overflow-y-auto">
                            {drivingQuestions.slice(0, 5).map((q, i) => (
                              <div key={i} className="text-xs py-1 border-b border-border/50 last:border-0">
                                <span className="font-medium">{i + 1}.</span> {q.content.slice(0, 80)}{q.content.length > 80 ? '...' : ''} 
                                <span className="ml-2 font-bold" style={{ color: q.correct_option === 'A' ? '#2563eb' : '#dc2626' }}>
                                  {q.correct_option === 'A' ? '○' : '✕'}
                                </span>
                              </div>
                            ))}
                            {drivingQuestions.length > 5 && (
                              <p className="text-xs text-muted-foreground pt-1">...và {drivingQuestions.length - 5} câu khác</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* JSON fallback */}
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          Hoặc dán JSON trực tiếp ▾
                        </summary>
                        <div className="mt-2 space-y-2">
                          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold">Định dạng JSON:</p>
                            <pre className="font-mono text-[10px] overflow-x-auto">{`[{"content":"...","correct_option":"A","explanation":"..."}]`}</pre>
                          </div>
                          <textarea
                            value={drivingJsonText}
                            onChange={(e) => setDrivingJsonText(e.target.value)}
                            placeholder='Dán JSON mảng câu hỏi vào đây...'
                            className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                            rows={6}
                          />
                          {drivingJsonText.trim() && (() => {
                            try {
                              const arr = JSON.parse(drivingJsonText);
                              return (
                                <p className="text-sm text-success flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  JSON hợp lệ: {Array.isArray(arr) ? arr.length : 0} câu hỏi
                                </p>
                              );
                            } catch {
                              return (
                                <p className="text-sm text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-4 w-4" />
                                  JSON không hợp lệ
                                </p>
                              );
                            }
                          })()}
                        </div>
                      </details>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
              <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'table' | 'file' | 'listening')} className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-3">
                  <TabsTrigger value="table" className="gap-2">
                    <Table2 className="h-4 w-4" />
                    Nhập trực tiếp
                  </TabsTrigger>
                  <TabsTrigger value="file" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Tải file CSV
                  </TabsTrigger>
                  <TabsTrigger value="listening" className="gap-2">
                    <Headphones className="h-4 w-4" />
                    聴解 Import
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="table" className="mt-0">
                  <TableImport onQuestionsChange={setTableQuestions} />
                </TabsContent>

                <TabsContent value="file" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={downloadTemplate} size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Tải file mẫu
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Tải về để xem định dạng chuẩn
                      </span>
                    </div>

                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <FileSpreadsheet className="mb-3 h-12 w-12 text-muted-foreground" />
                      <span className="mb-1 font-medium text-foreground">
                        {file ? file.name : 'Chọn file CSV'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Click để chọn hoặc kéo thả file vào đây
                      </span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {parsedQuestions.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Đã đọc {parsedQuestions.length} câu hỏi từ file
                      </div>
                    )}

                    {parsedQuestions.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <h3 className="mb-2 text-sm font-medium text-foreground">Xem trước</h3>
                        <div className="max-h-48 space-y-2 overflow-y-auto">
                          {parsedQuestions.slice(0, 3).map((q, i) => (
                            <div key={i} className="rounded bg-background p-2 text-xs">
                              <p className="mb-1 font-medium">{i + 1}. {q.content}</p>
                              <p className="text-muted-foreground">
                                A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d}
                              </p>
                              <p className="text-success">Đáp án: {q.correct_option}</p>
                            </div>
                          ))}
                          {parsedQuestions.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              ... và {parsedQuestions.length - 3} câu khác
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="listening" className="mt-0">
                  <ListeningImport onDataChange={setListeningData} />
                </TabsContent>
              </Tabs>
              )}
            </div>
          )}

          {/* Duplicate control + Import button */}
          {isReadyToImport && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <Checkbox
                  id="allow-duplicates"
                  checked={allowDuplicates}
                  onCheckedChange={(checked) => setAllowDuplicates(!!checked)}
                />
                <label htmlFor="allow-duplicates" className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <CopyCheck className="h-4 w-4 text-muted-foreground" />
                  Cho phép import câu hỏi trùng lặp
                </label>
                {allowDuplicates && (
                  <span className="ml-auto text-xs text-warning">
                    ⚠ Sẽ không kiểm tra trùng lặp
                  </span>
                )}
              </div>
            <Button
              onClick={handleImport}
              disabled={
                !isReadyToImport ||
                isLoading ||
                (selectedSubject?.slug === 'bang-lai-xe'
                  ? drivingImportTab === 'excel'
                    ? (!drivingExcelFile && !drivingJsonText.trim()) || validDrivingCount === 0
                    : validDrivingCount === 0
                  : importMode === 'table'
                  ? validTableQuestionsCount === 0
                  : importMode === 'listening'
                  ? validListeningCount === 0 || !listeningData.audioUrl
                  : parsedQuestions.length === 0)
              }
              size="lg"
              className="w-full gap-2"
            >
              <Upload className="h-5 w-5" />
              {isLoading
                ? 'Đang import...'
                : `Import ${
                    selectedSubject?.slug === 'bang-lai-xe'
                      ? validDrivingCount
                      : importMode === 'table'
                      ? validTableQuestionsCount
                      : importMode === 'listening'
                      ? validListeningCount
                      : parsedQuestions.length
                  } câu hỏi`}
            </Button>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">Kết quả import</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Thành công: {importResult.success} câu
                </div>
                {importResult.failed > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-error">
                      <AlertCircle className="h-4 w-4" />
                      Thất bại: {importResult.failed} câu
                    </div>
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                      {importResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportQuestionsPage;
