import { supabase } from './supabase';
import { TasaBcv } from '../types/database';

export async function obtenerTasaBcv(): Promise<TasaBcv & { desde_cache?: boolean; advertencia?: string }> {
  const { data, error } = await supabase.functions.invoke('bcv-tasa');
  if (error) throw error;
  return data;
}
