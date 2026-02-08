/**
 * Hook to fetch audio durations from URLs using the Audio API.
 * Returns a map of URL -> duration in seconds, and an average duration.
 */
import { useState, useEffect } from 'react';

function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(0);
    audio.src = url;
    // Timeout after 10s
    setTimeout(() => resolve(0), 10000);
  });
}

export function useAudioDurations(urls: string[]) {
  const [durations, setDurations] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urls.length === 0) {
      setDurations(new Map());
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      urls.map(async (url) => {
        const duration = await getAudioDuration(url);
        return [url, duration] as [string, number];
      })
    ).then((results) => {
      if (!cancelled) {
        setDurations(new Map(results));
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [urls.join(',')]);

  const totalDuration = Array.from(durations.values()).reduce((a, b) => a + b, 0);
  const avgDuration = durations.size > 0 ? totalDuration / durations.size : 0;

  return { durations, avgDuration, totalDuration, loading };
}
