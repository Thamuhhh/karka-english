import { supabase } from '../lib/supabase';
import { SupernovaLevel } from '../constants/curriculum';

export async function loadPublishedCourses(): Promise<SupernovaLevel[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('custom_courses')
    .select('level_data')
    .eq('status', 'published')
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('Could not load published courses:', error.message);
    return [];
  }
  return (data || []).map((row) => row.level_data as SupernovaLevel);
}
