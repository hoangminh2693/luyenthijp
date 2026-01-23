/**
 * Hook để quản lý lịch sử làm bài của người dùng
 * - Authenticated users: Store in database + localStorage cache
 * - Anonymous users: Store only in localStorage (for privacy)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

const LOCAL_STORAGE_KEY = 'quiz_question_history';

// Helper to get localStorage history
function getLocalHistory(): Map<string, QuestionHistoryItem[]> {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return new Map();
    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

// Helper to save localStorage history
function saveLocalHistory(history: Map<string, QuestionHistoryItem[]>) {
  try {
    const obj = Object.fromEntries(history);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore localStorage errors
  }
}

export function useQuestionHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Map<string, QuestionHistoryItem[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Load history from database (authenticated) or localStorage (anonymous)
  const loadHistory = useCallback(async () => {
    try {
      // Always start with localStorage cache
      const localHistory = getLocalHistory();
      
      if (user) {
        // Authenticated user: fetch from database
        const { data, error } = await supabase
          .from('question_history')
          .select('question_id, selected_answer, is_correct, answered_at')
          .eq('user_id', user.id)
          .order('answered_at', { ascending: false });

        if (error) {
          console.error('Error loading history:', error);
          // Fallback to localStorage on error
          setHistory(localHistory);
          return;
        }

        // Group by question_id
        const historyMap = new Map<string, QuestionHistoryItem[]>();
        data?.forEach((item) => {
          const existing = historyMap.get(item.question_id) || [];
          existing.push(item);
          historyMap.set(item.question_id, existing);
        });

        // Merge with localStorage (localStorage entries not in DB are kept)
        localHistory.forEach((items, questionId) => {
          if (!historyMap.has(questionId)) {
            historyMap.set(questionId, items);
          }
        });

        setHistory(historyMap);
        // Update localStorage cache
        saveLocalHistory(historyMap);
      } else {
        // Anonymous user: use only localStorage
        setHistory(localHistory);
      }
    } catch (err) {
      console.error('Error loading history:', err);
      // Fallback to localStorage
      setHistory(getLocalHistory());
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Save an answer
  const saveAnswer = useCallback(async (
    questionId: string,
    selectedAnswer: string,
    isCorrect: boolean
  ) => {
    const newItem: QuestionHistoryItem = {
      question_id: questionId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    };

    // Always update local state and localStorage
    setHistory((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId) || [];
      existing.unshift(newItem);
      newMap.set(questionId, existing);
      saveLocalHistory(newMap);
      return newMap;
    });

    // If authenticated, also save to database
    if (user) {
      try {
        const { error } = await supabase
          .from('question_history')
          .insert({
            question_id: questionId,
            selected_answer: selectedAnswer,
            is_correct: isCorrect,
            user_id: user.id,
          });

        if (error) {
          console.error('Error saving answer to database:', error);
        }
      } catch (err) {
        console.error('Error saving answer:', err);
      }
    }
    // Anonymous users: already saved to localStorage above, no database insert
  }, [user]);

  // Get stats for a question
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
