/** Límites compartidos entre cliente, servidor (SQL) y documentación. Mantener sincronizados con las migraciones. */
export const LIMITS = {
  /** Tamaño máximo del archivo de audio original (bytes). Coincide con el bucket `audio`. */
  audioMaxBytes: 200 * 1024 * 1024,
  imageMaxBytes: 5 * 1024 * 1024,
  trackTitleMax: 120,
  descriptionMax: 2000,
  bioMax: 500,
  commentMax: 1000,
  playlistTitleMax: 100,
  usernameMin: 3,
  usernameMax: 30,
  searchQueryMax: 100,
  pageSize: 20,
} as const;

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/ogg',
] as const;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const AUDIO_EXTENSIONS: Record<string, (typeof AUDIO_MIME_TYPES)[number]> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
};

/**
 * Reglas de reproducción válida (deben coincidir con `public.record_play_progress` en SQL).
 * Una reproducción es válida cuando se han escuchado al menos 30 s, o la canción completa si dura menos.
 */
export const PLAY_RULES = {
  validPlayMinMs: 30_000,
  heartbeatIntervalMs: 15_000,
  completedRatio: 0.9,
} as const;

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  covers: 'covers',
  playlistImages: 'playlist-images',
  audio: 'audio',
  releases: 'releases',
} as const;

export const TRACK_STATUSES = [
  'draft',
  'processing',
  'pending_review',
  'published',
  'rejected',
  'removed',
] as const;

export const TRACK_STATUS_LABELS: Record<(typeof TRACK_STATUSES)[number], string> = {
  draft: 'Borrador',
  processing: 'En proceso',
  pending_review: 'Pendiente de revisión',
  published: 'Publicada',
  rejected: 'Rechazada',
  removed: 'Retirada',
};

export const REPORT_REASONS = ['copyright', 'spam', 'abuse', 'illegal', 'impersonation', 'other'] as const;

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  copyright: 'Infracción de derechos de autor',
  spam: 'Spam',
  abuse: 'Acoso o contenido abusivo',
  illegal: 'Contenido ilegal',
  impersonation: 'Suplantación de identidad',
  other: 'Otro motivo',
};

export const REPORT_TARGETS = ['track', 'comment', 'profile', 'playlist', 'artist', 'album'] as const;

export const TRACK_LICENSES = [
  'all-rights-reserved',
  'cc-by',
  'cc-by-sa',
  'cc-by-nc',
  'cc-by-nc-sa',
  'cc-by-nd',
  'cc-by-nc-nd',
  'cc0',
] as const;

export const LICENSE_LABELS: Record<(typeof TRACK_LICENSES)[number], string> = {
  'all-rights-reserved': 'Todos los derechos reservados',
  'cc-by': 'Creative Commons BY',
  'cc-by-sa': 'Creative Commons BY-SA',
  'cc-by-nc': 'Creative Commons BY-NC',
  'cc-by-nc-sa': 'Creative Commons BY-NC-SA',
  'cc-by-nd': 'Creative Commons BY-ND',
  'cc-by-nc-nd': 'Creative Commons BY-NC-ND',
  cc0: 'Dominio público (CC0)',
};

export const PLATFORMS = ['android', 'ios'] as const;
export const RELEASE_CHANNELS = ['stable', 'beta'] as const;
export const RELEASE_STATUSES = ['draft', 'published', 'withdrawn'] as const;
export const INSTALL_METHODS = ['apk', 'play_store', 'testflight', 'app_store', 'web_distribution'] as const;
