import type { PostgrestError } from '@supabase/supabase-js';

/** Lanza el error de Supabase para que react-query lo gestione de forma uniforme. */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | Error | null }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

export function range(page: number, pageSize: number): [number, number] {
  const from = page * pageSize;
  return [from, from + pageSize - 1];
}
