import { toUserMessage } from '@ordyx/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/** Ejecuta una operación administrativa y vuelve a la página con un mensaje legible. */
export async function runAndReturn(
  path: string,
  okMessage: string,
  fn: () => Promise<{ error: unknown } | void>,
) {
  let errorMessage: string | null = null;
  try {
    const result = await fn();
    if (result && result.error) errorMessage = toUserMessage(result.error) + detail(result.error);
  } catch (e) {
    errorMessage = toUserMessage(e) + detail(e);
  }
  revalidatePath(path);
  const sep = path.includes('?') ? '&' : '?';
  redirect(
    `${path}${sep}${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : `ok=${encodeURIComponent(okMessage)}`}`,
  );
}

function detail(e: unknown) {
  const d =
    (e as { details?: string; detail?: string })?.details ?? (e as { detail?: string })?.detail;
  return d ? ` (${d})` : '';
}

export function str(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}
