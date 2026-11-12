import { supabase } from '../lib/supabase';
import { SupernovaLevel } from '../constants/curriculum';

export interface PublishedCourseData {
  extraLevels: SupernovaLevel[];
  coreOverrides: Record<number, SupernovaLevel>;
}

export async function loadPublishedCourses(): Promise<PublishedCourseData> {
  if (!supabase) return { extraLevels: [], coreOverrides: {} };
  const { data, error } = await supabase
    .from('custom_courses')
    .select('id, level_data, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('Could not load published courses:', error.message);
    return { extraLevels: [], coreOverrides: {} };
  }
  const coreOverrides: Record<number, SupernovaLevel> = {};
  const customLevels = (data || []).flatMap((row) => {
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
  return { extraLevels, coreOverrides };
}
