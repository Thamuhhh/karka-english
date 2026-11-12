import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { SupernovaLevel } from '../constants/curriculum';

const PUBLISHED_COURSE_CACHE_KEY = 'elvate-published-course-data-v1';

export interface PublishedCourseData {
  extraLevels: SupernovaLevel[];
  coreOverrides: Record<number, SupernovaLevel>;
}

export async function loadPublishedCourses(): Promise<PublishedCourseData> {
  const cached = await AsyncStorage.getItem(PUBLISHED_COURSE_CACHE_KEY).catch(() => null);
  const cachedCourses = cached
    ? (() => {
      try { return JSON.parse(cached) as PublishedCourseData; } catch { return null; }
    })()
    : null;
  if (!supabase) return cachedCourses || { extraLevels: [], coreOverrides: {} };
  let rows: Array<{ id: string; level_data: unknown; created_at: string }> = [];
  let loadError: string | null = null;
  try {
    const { data, error } = await supabase
      .from('custom_courses')
      .select('id, level_data, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: true });
    if (error) loadError = error.message;
    else rows = (data || []) as Array<{ id: string; level_data: unknown; created_at: string }>;
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown network error';
  }
  if (loadError) {
    console.warn('Could not load published courses:', loadError);
    return cachedCourses || { extraLevels: [], coreOverrides: {} };
  }
  const coreOverrides: Record<number, SupernovaLevel> = {};
  const customLevels = rows.flatMap((row) => {
    const level = row.level_data as SupernovaLevel;
    const unitNumber = Number(level.levelNumber);
    if (String(row.id).startsWith('builtin-unit-') && unitNumber >= 1 && unitNumber <= 4) {
      coreOverrides[unitNumber] = level;
      return [];
    }
    return [{ level, createdAt: row.created_at }];
  });
  const levels = customLevels
    .sort((a, b) => {
      const aUnit = Number(a.level.levelName.match(/^Unit\s+(\d+)\s*:/i)?.[1]);
      const bUnit = Number(b.level.levelName.match(/^Unit\s+(\d+)\s*:/i)?.[1]);
      if (Number.isFinite(aUnit) && Number.isFinite(bUnit)) return aUnit - bUnit;
      if (Number.isFinite(aUnit) !== Number.isFinite(bUnit)) return Number.isFinite(aUnit) ? 1 : -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .map((entry) => entry.level);

  const extraLevels = levels.map((level, index) => {
    const nextUnitNumber = 5 + index;
    const title = String(level.levelName || '').replace(/^Unit\s+\d+\s*:\s*/i, '').trim();
    return {
      ...level,
      levelNumber: nextUnitNumber,
      levelName: `Unit ${nextUnitNumber}: ${title || 'Custom Course'}`,
      classes: level.classes.map((lesson, lessonIndex) => ({
        ...lesson,
        levelNumber: nextUnitNumber,
        classNumber: lessonIndex + 1,
      })),
    };
  });
  const result = { extraLevels, coreOverrides };
  await AsyncStorage.setItem(PUBLISHED_COURSE_CACHE_KEY, JSON.stringify(result)).catch(() => {});
  return result;
}
