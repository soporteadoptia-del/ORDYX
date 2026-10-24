export type DetectedDevice = 'android' | 'ios' | 'desktop' | 'unknown';

/**
 * Detección orientativa del sistema a partir del User-Agent.
 * Nunca debe usarse para bloquear contenido: la web siempre permite elegir manualmente.
 * iPadOS 13+ se presenta como "Macintosh"; se distingue con `maxTouchPoints` cuando está disponible.
 */
export function detectDevice(userAgent: string | null | undefined, maxTouchPoints?: number): DetectedDevice {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (ua.includes('macintosh') && (maxTouchPoints ?? 0) > 1) return 'ios';
  if (/windows|macintosh|linux|cros/.test(ua)) return 'desktop';
  return 'unknown';
}

/** Compara versiones semánticas simples (1.2.10 > 1.2.9). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}
