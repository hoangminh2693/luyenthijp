/**
 * Quiz Data - Dữ liệu mẫu cho ứng dụng luyện đề thi
 * 
 * Cấu trúc dữ liệu mới:
 * - Subject: Môn học (id, name, slug, description, icon)
 * - Level: Cấp độ (id, subjectId, name, slug, description, order)
 * - Section: Phần (id, levelId, name, slug, description)
 * - Exam: Đề thi (id, sectionId, name, description, questionCount)
 * - Question: Câu hỏi (id, examId, content, options, correctOption)
 */

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Level {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string;
  order: number; // Thứ tự sắp xếp (N5 = 1, N4 = 2, ...)
}

export interface Section {
  id: string;
  levelId: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Exam {
  id: string;
  sectionId: string;
  name: string;
  description: string;
  questionCount: number;
  duration: number; // minutes
}

export interface Question {
  id: string;
  examId: string;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
}

// =====================
// DANH SÁCH MÔN HỌC
// =====================
export const subjects: Subject[] = [
  {
    id: 'tieng-nhat',
    name: 'Tiếng Nhật',
    slug: 'tieng-nhat',
    description: 'Luyện thi JLPT từ N5 đến N1',
    icon: '🇯🇵',
  },
  {
    id: 'toan',
    name: 'Toán học',
    slug: 'toan',
    description: 'Các đề thi trắc nghiệm Toán từ cơ bản đến nâng cao',
    icon: '📐',
  },
  {
    id: 'ly',
    name: 'Vật lý',
    slug: 'ly',
    description: 'Các đề thi trắc nghiệm Vật lý bao gồm lý thuyết và bài tập',
    icon: '⚡',
  },
];

// =====================
// DANH SÁCH CẤP ĐỘ
// =====================
export const levels: Level[] = [
  // Cấp độ tiếng Nhật
  { id: 'n5', subjectId: 'tieng-nhat', name: 'N5', slug: 'n5', description: 'Trình độ sơ cấp - Hiểu tiếng Nhật cơ bản', order: 1 },
  { id: 'n4', subjectId: 'tieng-nhat', name: 'N4', slug: 'n4', description: 'Trình độ sơ trung cấp - Hiểu tiếng Nhật cơ bản', order: 2 },
  { id: 'n3', subjectId: 'tieng-nhat', name: 'N3', slug: 'n3', description: 'Trình độ trung cấp - Hiểu tiếng Nhật trong nhiều tình huống', order: 3 },
  { id: 'n2', subjectId: 'tieng-nhat', name: 'N2', slug: 'n2', description: 'Trình độ trung cao cấp - Hiểu tiếng Nhật ở mức độ rộng', order: 4 },
  { id: 'n1', subjectId: 'tieng-nhat', name: 'N1', slug: 'n1', description: 'Trình độ cao cấp - Hiểu tiếng Nhật trong nhiều tình huống phức tạp', order: 5 },
  
  // Cấp độ Toán
  { id: 'toan-co-ban', subjectId: 'toan', name: 'Cơ bản', slug: 'co-ban', description: 'Kiến thức nền tảng', order: 1 },
  { id: 'toan-nang-cao', subjectId: 'toan', name: 'Nâng cao', slug: 'nang-cao', description: 'Kiến thức nâng cao', order: 2 },
  
  // Cấp độ Vật lý
  { id: 'ly-co-ban', subjectId: 'ly', name: 'Cơ bản', slug: 'co-ban', description: 'Kiến thức nền tảng', order: 1 },
  { id: 'ly-nang-cao', subjectId: 'ly', name: 'Nâng cao', slug: 'nang-cao', description: 'Kiến thức nâng cao', order: 2 },
];

// =====================
// DANH SÁCH PHẦN
// =====================
export const sections: Section[] = [
  // Phần N5
  { id: 'n5-moji-goi', levelId: 'n5', name: '文字・語彙', slug: 'moji-goi', description: 'Chữ và Từ vựng', icon: '📝' },
  { id: 'n5-bunpou', levelId: 'n5', name: '文法', slug: 'bunpou', description: 'Ngữ pháp', icon: '📖' },
  { id: 'n5-dokkai', levelId: 'n5', name: '読解', slug: 'dokkai', description: 'Đọc hiểu', icon: '📚' },
  { id: 'n5-choukai', levelId: 'n5', name: '聴解', slug: 'choukai', description: 'Nghe hiểu', icon: '🎧' },
  { id: 'n5-tronlan', levelId: 'n5', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần N4
  { id: 'n4-moji-goi', levelId: 'n4', name: '文字・語彙', slug: 'moji-goi', description: 'Chữ và Từ vựng', icon: '📝' },
  { id: 'n4-bunpou', levelId: 'n4', name: '文法', slug: 'bunpou', description: 'Ngữ pháp', icon: '📖' },
  { id: 'n4-dokkai', levelId: 'n4', name: '読解', slug: 'dokkai', description: 'Đọc hiểu', icon: '📚' },
  { id: 'n4-choukai', levelId: 'n4', name: '聴解', slug: 'choukai', description: 'Nghe hiểu', icon: '🎧' },
  { id: 'n4-tronlan', levelId: 'n4', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần N3
  { id: 'n3-moji-goi', levelId: 'n3', name: '文字・語彙', slug: 'moji-goi', description: 'Chữ và Từ vựng', icon: '📝' },
  { id: 'n3-bunpou', levelId: 'n3', name: '文法', slug: 'bunpou', description: 'Ngữ pháp', icon: '📖' },
  { id: 'n3-dokkai', levelId: 'n3', name: '読解', slug: 'dokkai', description: 'Đọc hiểu', icon: '📚' },
  { id: 'n3-choukai', levelId: 'n3', name: '聴解', slug: 'choukai', description: 'Nghe hiểu', icon: '🎧' },
  { id: 'n3-tronlan', levelId: 'n3', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần N2
  { id: 'n2-moji-goi', levelId: 'n2', name: '文字・語彙', slug: 'moji-goi', description: 'Chữ và Từ vựng', icon: '📝' },
  { id: 'n2-bunpou', levelId: 'n2', name: '文法', slug: 'bunpou', description: 'Ngữ pháp', icon: '📖' },
  { id: 'n2-dokkai', levelId: 'n2', name: '読解', slug: 'dokkai', description: 'Đọc hiểu', icon: '📚' },
  { id: 'n2-choukai', levelId: 'n2', name: '聴解', slug: 'choukai', description: 'Nghe hiểu', icon: '🎧' },
  { id: 'n2-tronlan', levelId: 'n2', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần N1
  { id: 'n1-moji-goi', levelId: 'n1', name: '文字・語彙', slug: 'moji-goi', description: 'Chữ và Từ vựng', icon: '📝' },
  { id: 'n1-bunpou', levelId: 'n1', name: '文法', slug: 'bunpou', description: 'Ngữ pháp', icon: '📖' },
  { id: 'n1-dokkai', levelId: 'n1', name: '読解', slug: 'dokkai', description: 'Đọc hiểu', icon: '📚' },
  { id: 'n1-choukai', levelId: 'n1', name: '聴解', slug: 'choukai', description: 'Nghe hiểu', icon: '🎧' },
  { id: 'n1-tronlan', levelId: 'n1', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần Toán cơ bản
  { id: 'toan-cb-dai-so', levelId: 'toan-co-ban', name: 'Đại số', slug: 'dai-so', description: 'Các bài tập đại số', icon: '➗' },
  { id: 'toan-cb-hinh-hoc', levelId: 'toan-co-ban', name: 'Hình học', slug: 'hinh-hoc', description: 'Các bài tập hình học', icon: '📐' },
  { id: 'toan-cb-tronlan', levelId: 'toan-co-ban', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần Toán nâng cao
  { id: 'toan-nc-giai-tich', levelId: 'toan-nang-cao', name: 'Giải tích', slug: 'giai-tich', description: 'Các bài tập giải tích', icon: '∫' },
  { id: 'toan-nc-hinh-khong', levelId: 'toan-nang-cao', name: 'Hình học không gian', slug: 'hinh-khong-gian', description: 'Các bài tập hình học không gian', icon: '🔷' },
  { id: 'toan-nc-tronlan', levelId: 'toan-nang-cao', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần Vật lý cơ bản
  { id: 'ly-cb-co-hoc', levelId: 'ly-co-ban', name: 'Cơ học', slug: 'co-hoc', description: 'Các bài tập cơ học', icon: '⚙️' },
  { id: 'ly-cb-dien', levelId: 'ly-co-ban', name: 'Điện học', slug: 'dien', description: 'Các bài tập điện học', icon: '⚡' },
  { id: 'ly-cb-tronlan', levelId: 'ly-co-ban', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
  
  // Phần Vật lý nâng cao
  { id: 'ly-nc-quang', levelId: 'ly-nang-cao', name: 'Quang học', slug: 'quang', description: 'Các bài tập quang học', icon: '💡' },
  { id: 'ly-nc-hat-nhan', levelId: 'ly-nang-cao', name: 'Hạt nhân', slug: 'hat-nhan', description: 'Các bài tập vật lý hạt nhân', icon: '⚛️' },
  { id: 'ly-nc-tronlan', levelId: 'ly-nang-cao', name: 'Trộn lẫn', slug: 'tron-lan', description: 'Đề thi tổng hợp', icon: '🎯' },
];

// =====================
// DANH SÁCH ĐỀ THI
// =====================
export const exams: Exam[] = [
  // Đề N5 - Moji Goi
  { id: 'n5-moji-1', sectionId: 'n5-moji-goi', name: 'Đề 1 - 文字・語彙', description: 'Đề luyện tập từ vựng và chữ N5', questionCount: 5, duration: 15 },
  { id: 'n5-moji-2', sectionId: 'n5-moji-goi', name: 'Đề 2 - 文字・語彙', description: 'Đề luyện tập từ vựng và chữ N5', questionCount: 5, duration: 15 },
  
  // Đề N5 - Bunpou
  { id: 'n5-bunpou-1', sectionId: 'n5-bunpou', name: 'Đề 1 - 文法', description: 'Đề luyện tập ngữ pháp N5', questionCount: 5, duration: 20 },
  
  // Đề N5 - Trộn lẫn
  { id: 'n5-tronlan-1', sectionId: 'n5-tronlan', name: 'Đề thi thử N5 - Kỳ 1', description: 'Đề thi tổng hợp N5', questionCount: 5, duration: 60 },
  
  // Đề Toán cơ bản - Đại số
  { id: 'toan-cb-ds-1', sectionId: 'toan-cb-dai-so', name: 'Đề 1 - Đại số', description: 'Đề luyện tập đại số cơ bản', questionCount: 5, duration: 30 },
  
  // Đề Toán cơ bản - Trộn lẫn  
  { id: 'toan-cb-tl-1', sectionId: 'toan-cb-tronlan', name: 'Đề thi thử Toán cơ bản - Kỳ 1', description: 'Đề thi tổng hợp Toán cơ bản', questionCount: 8, duration: 60 },
  
  // Đề Vật lý cơ bản - Cơ học
  { id: 'ly-cb-ch-1', sectionId: 'ly-cb-co-hoc', name: 'Đề 1 - Cơ học', description: 'Đề luyện tập cơ học cơ bản', questionCount: 5, duration: 30 },
  
  // Đề Vật lý cơ bản - Trộn lẫn
  { id: 'ly-cb-tl-1', sectionId: 'ly-cb-tronlan', name: 'Đề thi thử Vật lý cơ bản - Kỳ 1', description: 'Đề thi tổng hợp Vật lý cơ bản', questionCount: 8, duration: 50 },
];

// =====================
// NGÂN HÀNG CÂU HỎI
// =====================
export const questions: Question[] = [
  // ---- CÂU HỎI N5 - MOJI GOI ----
  {
    id: 'n5-moji-1-1',
    examId: 'n5-moji-1',
    content: '「やま」の漢字はどれですか。',
    options: { A: '川', B: '山', C: '田', D: '森' },
    correctOption: 'B',
  },
  {
    id: 'n5-moji-1-2',
    examId: 'n5-moji-1',
    content: '「みず」の漢字はどれですか。',
    options: { A: '火', B: '土', C: '水', D: '金' },
    correctOption: 'C',
  },
  {
    id: 'n5-moji-1-3',
    examId: 'n5-moji-1',
    content: '「ひと」の漢字はどれですか。',
    options: { A: '人', B: '大', C: '入', D: '八' },
    correctOption: 'A',
  },
  {
    id: 'n5-moji-1-4',
    examId: 'n5-moji-1',
    content: '「日」の読み方はどれですか。',
    options: { A: 'つき', B: 'ひ', C: 'ほし', D: 'そら' },
    correctOption: 'B',
  },
  {
    id: 'n5-moji-1-5',
    examId: 'n5-moji-1',
    content: '「月」の読み方はどれですか。',
    options: { A: 'つき', B: 'ひ', C: 'ほし', D: 'かぜ' },
    correctOption: 'A',
  },
  
  // Đề 2 - Moji Goi
  {
    id: 'n5-moji-2-1',
    examId: 'n5-moji-2',
    content: '「くるま」の漢字はどれですか。',
    options: { A: '電', B: '車', C: '駅', D: '道' },
    correctOption: 'B',
  },
  {
    id: 'n5-moji-2-2',
    examId: 'n5-moji-2',
    content: '「がっこう」の漢字はどれですか。',
    options: { A: '学校', B: '会社', C: '病院', D: '図書館' },
    correctOption: 'A',
  },
  {
    id: 'n5-moji-2-3',
    examId: 'n5-moji-2',
    content: '「食べる」の読み方はどれですか。',
    options: { A: 'のべる', B: 'たべる', C: 'あべる', D: 'しべる' },
    correctOption: 'B',
  },
  {
    id: 'n5-moji-2-4',
    examId: 'n5-moji-2',
    content: '「飲む」の読み方はどれですか。',
    options: { A: 'やむ', B: 'かむ', C: 'のむ', D: 'すむ' },
    correctOption: 'C',
  },
  {
    id: 'n5-moji-2-5',
    examId: 'n5-moji-2',
    content: '「本」の読み方はどれですか。',
    options: { A: 'もと', B: 'ほん', C: 'かみ', D: 'ふみ' },
    correctOption: 'B',
  },
  
  // ---- CÂU HỎI N5 - BUNPOU ----
  {
    id: 'n5-bunpou-1-1',
    examId: 'n5-bunpou-1',
    content: '私___学生です。',
    options: { A: 'が', B: 'を', C: 'は', D: 'に' },
    correctOption: 'C',
  },
  {
    id: 'n5-bunpou-1-2',
    examId: 'n5-bunpou-1',
    content: '毎日、学校___行きます。',
    options: { A: 'を', B: 'が', C: 'で', D: 'に' },
    correctOption: 'D',
  },
  {
    id: 'n5-bunpou-1-3',
    examId: 'n5-bunpou-1',
    content: 'りんご___食べました。',
    options: { A: 'が', B: 'を', C: 'に', D: 'で' },
    correctOption: 'B',
  },
  {
    id: 'n5-bunpou-1-4',
    examId: 'n5-bunpou-1',
    content: '図書館___本を読みます。',
    options: { A: 'を', B: 'が', C: 'で', D: 'に' },
    correctOption: 'C',
  },
  {
    id: 'n5-bunpou-1-5',
    examId: 'n5-bunpou-1',
    content: 'これは田中さん___かばんです。',
    options: { A: 'が', B: 'を', C: 'に', D: 'の' },
    correctOption: 'D',
  },
  
  // ---- CÂU HỎI N5 - TRỘN LẪN ----
  {
    id: 'n5-tronlan-1-1',
    examId: 'n5-tronlan-1',
    content: '「おはようございます」は何時に使いますか。',
    options: { A: '朝', B: '昼', C: '夜', D: 'いつでも' },
    correctOption: 'A',
  },
  {
    id: 'n5-tronlan-1-2',
    examId: 'n5-tronlan-1',
    content: '「ありがとう」の丁寧な言い方は何ですか。',
    options: { A: 'すみません', B: 'ごめんなさい', C: 'ありがとうございます', D: 'どういたしまして' },
    correctOption: 'C',
  },
  {
    id: 'n5-tronlan-1-3',
    examId: 'n5-tronlan-1',
    content: '1,2,3,4,5...「五」の読み方はどれですか。',
    options: { A: 'いち', B: 'に', C: 'さん', D: 'ご' },
    correctOption: 'D',
  },
  {
    id: 'n5-tronlan-1-4',
    examId: 'n5-tronlan-1',
    content: '私は日本語___勉強しています。',
    options: { A: 'が', B: 'を', C: 'に', D: 'で' },
    correctOption: 'B',
  },
  {
    id: 'n5-tronlan-1-5',
    examId: 'n5-tronlan-1',
    content: '「さようなら」はいつ使いますか。',
    options: { A: '会う時', B: '別れる時', C: '食べる時', D: '寝る時' },
    correctOption: 'B',
  },
  
  // ---- CÂU HỎI TOÁN CƠ BẢN - ĐẠI SỐ ----
  {
    id: 'toan-cb-ds-1-1',
    examId: 'toan-cb-ds-1',
    content: 'Phương trình x² - 5x + 6 = 0 có hai nghiệm là:',
    options: { A: 'x = 1 và x = 6', B: 'x = 2 và x = 3', C: 'x = -2 và x = -3', D: 'x = 1 và x = 5' },
    correctOption: 'B',
  },
  {
    id: 'toan-cb-ds-1-2',
    examId: 'toan-cb-ds-1',
    content: 'Giá trị của biểu thức 2³ + 3² bằng:',
    options: { A: '15', B: '17', C: '13', D: '19' },
    correctOption: 'B',
  },
  {
    id: 'toan-cb-ds-1-3',
    examId: 'toan-cb-ds-1',
    content: 'Nghiệm của phương trình 2x + 4 = 10 là:',
    options: { A: 'x = 2', B: 'x = 3', C: 'x = 4', D: 'x = 5' },
    correctOption: 'B',
  },
  {
    id: 'toan-cb-ds-1-4',
    examId: 'toan-cb-ds-1',
    content: 'Cho hệ phương trình x + y = 5 và x - y = 1. Giá trị của x là:',
    options: { A: '2', B: '3', C: '4', D: '5' },
    correctOption: 'B',
  },
  {
    id: 'toan-cb-ds-1-5',
    examId: 'toan-cb-ds-1',
    content: 'Tổng của các số tự nhiên từ 1 đến 10 bằng:',
    options: { A: '45', B: '50', C: '55', D: '60' },
    correctOption: 'C',
  },
  
  // ---- CÂU HỎI TOÁN CƠ BẢN - TRỘN LẪN ----
  {
    id: 'toan-cb-tl-1-1',
    examId: 'toan-cb-tl-1',
    content: 'Giá trị của biểu thức log₂(8) bằng:',
    options: { A: '2', B: '3', C: '4', D: '8' },
    correctOption: 'B',
  },
  {
    id: 'toan-cb-tl-1-2',
    examId: 'toan-cb-tl-1',
    content: 'Đạo hàm của hàm số y = x³ + 2x² - 5x + 1 là:',
    options: { A: '3x² + 4x - 5', B: '3x² + 2x - 5', C: 'x² + 4x - 5', D: '3x² + 4x + 5' },
    correctOption: 'A',
  },
  {
    id: 'toan-cb-tl-1-3',
    examId: 'toan-cb-tl-1',
    content: 'Phương trình 2^x = 16 có nghiệm x bằng:',
    options: { A: '2', B: '3', C: '4', D: '8' },
    correctOption: 'C',
  },
  {
    id: 'toan-cb-tl-1-4',
    examId: 'toan-cb-tl-1',
    content: 'Tích phân ∫₀¹ 2x dx bằng:',
    options: { A: '0', B: '1', C: '2', D: '4' },
    correctOption: 'B',
  },
  {
    id: 'toan-cb-tl-1-5',
    examId: 'toan-cb-tl-1',
    content: 'Cho hàm số y = x² - 4x + 3. Giá trị nhỏ nhất của hàm số là:',
    options: { A: '-1', B: '0', C: '1', D: '3' },
    correctOption: 'A',
  },
  {
    id: 'toan-cb-tl-1-6',
    examId: 'toan-cb-tl-1',
    content: 'Số phức z = 3 + 4i có môđun bằng:',
    options: { A: '3', B: '4', C: '5', D: '7' },
    correctOption: 'C',
  },
  {
    id: 'toan-cb-tl-1-7',
    examId: 'toan-cb-tl-1',
    content: 'Trong không gian Oxyz, khoảng cách từ điểm M(1, 2, 2) đến gốc tọa độ O là:',
    options: { A: '1', B: '2', C: '3', D: '5' },
    correctOption: 'C',
  },
  {
    id: 'toan-cb-tl-1-8',
    examId: 'toan-cb-tl-1',
    content: 'Cho cấp số cộng với u₁ = 3 và công sai d = 2. Giá trị của u₅ là:',
    options: { A: '9', B: '10', C: '11', D: '12' },
    correctOption: 'C',
  },
  
  // ---- CÂU HỎI VẬT LÝ CƠ BẢN - CƠ HỌC ----
  {
    id: 'ly-cb-ch-1-1',
    examId: 'ly-cb-ch-1',
    content: 'Công thức tính động năng của một vật là:',
    options: { A: 'Wđ = mgh', B: 'Wđ = ½mv²', C: 'Wđ = Fs', D: 'Wđ = Pt' },
    correctOption: 'B',
  },
  {
    id: 'ly-cb-ch-1-2',
    examId: 'ly-cb-ch-1',
    content: 'Theo định luật II Newton, gia tốc của một vật tỉ lệ thuận với:',
    options: { A: 'Khối lượng của vật', B: 'Vận tốc của vật', C: 'Lực tác dụng lên vật', D: 'Thời gian chuyển động' },
    correctOption: 'C',
  },
  {
    id: 'ly-cb-ch-1-3',
    examId: 'ly-cb-ch-1',
    content: 'Công thức tính thế năng trọng trường là:',
    options: { A: 'Wt = ½mv²', B: 'Wt = mgh', C: 'Wt = ½kx²', D: 'Wt = Fs' },
    correctOption: 'B',
  },
  {
    id: 'ly-cb-ch-1-4',
    examId: 'ly-cb-ch-1',
    content: 'Định luật bảo toàn động lượng áp dụng cho hệ:',
    options: { A: 'Có ngoại lực tác dụng', B: 'Kín (cô lập)', C: 'Có ma sát', D: 'Bất kỳ' },
    correctOption: 'B',
  },
  {
    id: 'ly-cb-ch-1-5',
    examId: 'ly-cb-ch-1',
    content: 'Chu kỳ dao động của con lắc đơn phụ thuộc vào:',
    options: { A: 'Khối lượng quả nặng', B: 'Biên độ dao động', C: 'Chiều dài dây treo', D: 'Năng lượng dao động' },
    correctOption: 'C',
  },
  
  // ---- CÂU HỎI VẬT LÝ CƠ BẢN - TRỘN LẪN ----
  {
    id: 'ly-cb-tl-1-1',
    examId: 'ly-cb-tl-1',
    content: 'Đơn vị đo cường độ dòng điện trong hệ SI là:',
    options: { A: 'Volt (V)', B: 'Ohm (Ω)', C: 'Ampe (A)', D: 'Watt (W)' },
    correctOption: 'C',
  },
  {
    id: 'ly-cb-tl-1-2',
    examId: 'ly-cb-tl-1',
    content: 'Đơn vị đo điện áp trong hệ SI là:',
    options: { A: 'Ampe (A)', B: 'Volt (V)', C: 'Ohm (Ω)', D: 'Farad (F)' },
    correctOption: 'B',
  },
  {
    id: 'ly-cb-tl-1-3',
    examId: 'ly-cb-tl-1',
    content: 'Ánh sáng có bước sóng λ = 600nm thuộc vùng ánh sáng màu:',
    options: { A: 'Đỏ', B: 'Vàng', C: 'Xanh lá', D: 'Tím' },
    correctOption: 'A',
  },
  {
    id: 'ly-cb-tl-1-4',
    examId: 'ly-cb-tl-1',
    content: 'Hiện tượng cảm ứng điện từ được phát hiện bởi nhà khoa học nào?',
    options: { A: 'Newton', B: 'Einstein', C: 'Faraday', D: 'Tesla' },
    correctOption: 'C',
  },
  {
    id: 'ly-cb-tl-1-5',
    examId: 'ly-cb-tl-1',
    content: 'Trong mạch điện, điện trở mắc nối tiếp có tổng trở bằng:',
    options: { A: 'Tổng nghịch đảo các điện trở', B: 'Tổng các điện trở', C: 'Tích các điện trở', D: 'Trung bình cộng các điện trở' },
    correctOption: 'B',
  },
  {
    id: 'ly-cb-tl-1-6',
    examId: 'ly-cb-tl-1',
    content: 'Vận tốc ánh sáng trong chân không xấp xỉ bằng:',
    options: { A: '300.000 m/s', B: '3.000.000 m/s', C: '300.000.000 m/s', D: '3.000.000.000 m/s' },
    correctOption: 'C',
  },
  {
    id: 'ly-cb-tl-1-7',
    examId: 'ly-cb-tl-1',
    content: 'Công suất điện được tính bằng công thức:',
    options: { A: 'P = U/I', B: 'P = I²R', C: 'P = R/I²', D: 'P = U/R' },
    correctOption: 'B',
  },
  {
    id: 'ly-cb-tl-1-8',
    examId: 'ly-cb-tl-1',
    content: 'Trong hiện tượng giao thoa ánh sáng, vân sáng xuất hiện khi hiệu đường đi bằng:',
    options: { A: 'Số lẻ lần nửa bước sóng', B: 'Số nguyên lần bước sóng', C: 'Số lẻ lần bước sóng', D: 'Không phụ thuộc hiệu đường đi' },
    correctOption: 'B',
  },
];

// =====================
// HÀM TIỆN ÍCH
// =====================

/**
 * Lấy danh sách cấp độ theo môn học
 */
export function getLevelsBySubject(subjectId: string): Level[] {
  return levels.filter((level) => level.subjectId === subjectId).sort((a, b) => a.order - b.order);
}

/**
 * Lấy danh sách phần theo cấp độ
 */
export function getSectionsByLevel(levelId: string): Section[] {
  return sections.filter((section) => section.levelId === levelId);
}

/**
 * Lấy danh sách đề thi theo phần
 */
export function getExamsBySection(sectionId: string): Exam[] {
  return exams.filter((exam) => exam.sectionId === sectionId);
}

/**
 * Lấy danh sách câu hỏi theo đề thi
 */
export function getQuestionsByExam(examId: string): Question[] {
  return questions.filter((q) => q.examId === examId);
}

/**
 * Lấy danh sách câu hỏi theo phần (section) - gom tất cả câu hỏi từ các đề trong phần đó
 */
export function getQuestionsBySection(sectionId: string): Question[] {
  const sectionExams = exams.filter((e) => e.sectionId === sectionId);
  const examIds = sectionExams.map((e) => e.id);
  return questions.filter((q) => examIds.includes(q.examId));
}

/**
 * Lấy câu hỏi ngẫu nhiên từ một phần với số lượng chỉ định
 */
export function getRandomQuestions(sectionId: string, count: number): Question[] {
  const allQuestions = getQuestionsBySection(sectionId);
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Lấy thông tin môn học theo slug
 */
export function getSubjectBySlug(slug: string): Subject | undefined {
  return subjects.find((s) => s.slug === slug);
}

/**
 * Lấy thông tin cấp độ theo slug và môn học
 */
export function getLevelBySlug(subjectId: string, levelSlug: string): Level | undefined {
  return levels.find((l) => l.subjectId === subjectId && l.slug === levelSlug);
}

/**
 * Lấy thông tin phần theo slug và cấp độ
 */
export function getSectionBySlug(levelId: string, sectionSlug: string): Section | undefined {
  return sections.find((s) => s.levelId === levelId && s.slug === sectionSlug);
}

/**
 * Lấy thông tin đề thi theo id
 */
export function getExamById(examId: string): Exam | undefined {
  return exams.find((e) => e.id === examId);
}

/**
 * Lấy thông tin level theo id
 */
export function getLevelById(levelId: string): Level | undefined {
  return levels.find((l) => l.id === levelId);
}

/**
 * Lấy thông tin section theo id
 */
export function getSectionById(sectionId: string): Section | undefined {
  return sections.find((s) => s.id === sectionId);
}

/**
 * Lấy thông tin subject theo id
 */
export function getSubjectById(subjectId: string): Subject | undefined {
  return subjects.find((s) => s.id === subjectId);
}

/**
 * Tính điểm bài thi
 */
export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
  percentage: number;
  details: {
    questionId: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

export function calculateResult(
  examId: string,
  userAnswers: Record<string, string>
): QuizResult {
  const examQuestions = getQuestionsByExam(examId);
  const details = examQuestions.map((q) => ({
    questionId: q.id,
    userAnswer: userAnswers[q.id] || null,
    correctAnswer: q.correctOption,
    isCorrect: userAnswers[q.id] === q.correctOption,
  }));

  const correctAnswers = details.filter((d) => d.isCorrect).length;
  const totalQuestions = examQuestions.length;

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers: totalQuestions - correctAnswers,
    score: correctAnswers,
    percentage: Math.round((correctAnswers / totalQuestions) * 100),
    details,
  };
}
