/**
 * Hook để quản lý device ID cho việc theo dõi lịch sử làm bài
 * Lưu vào localStorage để identify thiết bị
 */
import { useState, useEffect } from 'react';

const DEVICE_ID_KEY = 'quiz_device_id';

export function useDeviceId(): string {
  const [deviceId, setDeviceId] = useState<string>(() => {
    // Lấy từ localStorage hoặc tạo mới
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DEVICE_ID_KEY);
      if (stored) return stored;
      
      // Tạo device ID mới
      const newId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, newId);
      return newId;
    }
    return '';
  });

  useEffect(() => {
    if (!deviceId && typeof window !== 'undefined') {
      const stored = localStorage.getItem(DEVICE_ID_KEY);
      if (stored) {
        setDeviceId(stored);
      } else {
        const newId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(DEVICE_ID_KEY, newId);
        setDeviceId(newId);
      }
    }
  }, [deviceId]);

  return deviceId;
}
