/**
 * Hook để quản lý lịch sử làm bài của người dùng
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';

export interface QuestionHistoryItem {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  answered_at: string;
}

export interface QuestionStats {
  totalAttempts: number;
  correctCount: number;
  lastAttempt?: string;
}

export function useQuestionHistory() {
  const deviceId = useDeviceId();
  const [history, setHistory] = useState<Map<string, QuestionHistoryItem[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Tải lịch sử từ database
  const loadHistory = useCallback(async () => {
    if (!deviceId) return;
    
    try {
      const { data, error } = await supabase
        .from('question_history')
        .select('question_id, selected_answer, is_correct, answered_at')
        .eq('device_id', deviceId)
        .order('answered_at', { ascending: false });

      if (error) {
        console.error('Error loading history:', error);
        return;
      }

      // Group by question_id
      const historyMap = new Map<string, QuestionHistoryItem[]>();
      data?.forEach((item) => {
        const existing = historyMap.get(item.question_id) || [];
        existing.push(item);
        historyMap.set(item.question_id, existing);
      });

      setHistory(historyMap);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Lưu một lần trả lời vào database
  const saveAnswer = useCallback(async (
    questionId: string,
    selectedAnswer: string,
    isCorrect: boolean
  ) => {
    if (!deviceId) return;

    try {
      const { error } = await supabase
        .from('question_history')
        .insert({
          device_id: deviceId,
          question_id: questionId,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
        });

      if (error) {
        console.error('Error saving answer:', error);
        return;
      }

      // Cập nhật local state
      setHistory((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(questionId) || [];
        existing.unshift({
          question_id: questionId,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
        });
        newMap.set(questionId, existing);
        return newMap;
      });
    } catch (err) {
      console.error('Error saving answer:', err);
    }
  }, [deviceId]);

  // Lấy thống kê cho một câu hỏi
  const getQuestionStats = useCallback((questionId: string): QuestionStats => {
    const items = history.get(questionId) || [];
    return {
      totalAttempts: items.length,
      correctCount: items.filter((i) => i.is_correct).length,
      lastAttempt: items[0]?.answered_at,
    };
  }, [history]);

  return {
    history,
    isLoading,
    saveAnswer,
    getQuestionStats,
    refreshHistory: loadHistory,
  };
}
