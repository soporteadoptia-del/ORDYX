/** Formatea milisegundos como m:ss o h:mm:ss. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}

/** Duración larga legible para playlists: "1 h 12 min", "35 min", "45 s". */
export function formatLongDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '0 min';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes === 0) return `${Math.max(1, Math.round(ms / 1000))} s`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** Número compacto: 1234 → "1,2 mil", 2500000 → "2,5 M". */
export function formatCount(n: number | null | undefined): string {
  if (!n || n < 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000)
    return `${(n / 1000)
      .toFixed(n < 10_000 ? 1 : 0)
      .replace('.', ',')
      .replace(/,0$/, '')} mil`;
  return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(/,0$/, '')} M`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1).replace('.', ',')} ${units[unit]}`;
}

/** Fecha relativa corta en español ("hace 5 min", "hace 2 d"). */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'ahora';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} mes${mo === 1 ? '' : 'es'}`;
  const y = Math.floor(d / 365);
  return `hace ${y} año${y === 1 ? '' : 's'}`;
}

/** Convierte un texto a slug ASCII seguro para URLs. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
