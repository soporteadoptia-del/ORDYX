import { z } from 'zod';
import {
  AUDIO_MIME_TYPES,
  IMAGE_MIME_TYPES,
  INSTALL_METHODS,
  LIMITS,
  PLATFORMS,
  RELEASE_CHANNELS,
  REPORT_REASONS,
  REPORT_TARGETS,
  TRACK_LICENSES,
} from './constants';

/**
 * Esquemas de validación del lado del cliente. El servidor aplica las mismas reglas mediante
 * restricciones CHECK, triggers y funciones SQL: estos esquemas mejoran la UX, no sustituyen esa validación.
 */

const trimmed = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(LIMITS.usernameMin, `Mínimo ${LIMITS.usernameMin} caracteres`)
  .max(LIMITS.usernameMax, `Máximo ${LIMITS.usernameMax} caracteres`)
  .regex(/^[a-z0-9_.]+$/, 'Solo letras minúsculas, números, punto y guion bajo')
  .refine((v) => !v.startsWith('.') && !v.endsWith('.'), 'No puede empezar ni terminar con punto');

export const emailSchema = z.string().trim().toLowerCase().email('Correo electrónico no válido');

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  acceptTerms: z.literal(true, { message: 'Debes aceptar las condiciones y la política de privacidad' }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Introduce tu contraseña'),
});

export const profileUpdateSchema = z.object({
  username: usernameSchema,
  display_name: trimmed(60).nullable(),
  bio: trimmed(LIMITS.bioMax).nullable(),
});

export const playlistSchema = z.object({
  title: trimmed(LIMITS.playlistTitleMax).min(1, 'El título es obligatorio'),
  description: trimmed(LIMITS.descriptionMax).nullable(),
  is_public: z.boolean(),
});

export const commentSchema = z.object({
  body: trimmed(LIMITS.commentMax).min(1, 'El comentario no puede estar vacío'),
  timestamp_ms: z.number().int().nonnegative().nullable(),
});

export const trackMetadataSchema = z.object({
  title: trimmed(LIMITS.trackTitleMax).min(1, 'El título es obligatorio'),
  description: trimmed(LIMITS.descriptionMax).nullable(),
  genre_id: z.number().int().positive().nullable(),
  license: z.enum(TRACK_LICENSES),
  rights_holder: trimmed(200).min(2, 'Indica el titular de los derechos'),
  is_explicit: z.boolean(),
  release_date: z.iso.date().nullable(),
});

export const rightsConfirmationSchema = z.literal(true, {
  message: 'Debes confirmar que tienes los derechos para publicar esta canción',
});

export const audioFileSchema = z.object({
  name: z.string().min(1),
  size: z
    .number()
    .positive('El archivo está vacío')
    .max(LIMITS.audioMaxBytes, `El archivo supera ${LIMITS.audioMaxBytes / 1024 / 1024} MB`),
  mimeType: z.enum(AUDIO_MIME_TYPES, { message: 'Formato de audio no compatible (MP3, M4A, AAC, WAV, FLAC u OGG)' }),
});

export const imageFileSchema = z.object({
  size: z
    .number()
    .positive()
    .max(LIMITS.imageMaxBytes, `La imagen supera ${LIMITS.imageMaxBytes / 1024 / 1024} MB`),
  mimeType: z.enum(IMAGE_MIME_TYPES, { message: 'Formato de imagen no compatible (JPG, PNG o WebP)' }),
});

export const artistSchema = z.object({
  name: trimmed(80).min(1, 'El nombre artístico es obligatorio'),
  bio: trimmed(LIMITS.bioMax * 4).nullable(),
});

export const reportSchema = z.object({
  target_type: z.enum(REPORT_TARGETS),
  target_id: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: trimmed(2000).nullable(),
});

export const rightsClaimSchema = z.object({
  claimant_name: trimmed(200).min(2, 'Indica tu nombre o el de la entidad'),
  claimant_email: emailSchema,
  content_url: trimmed(500).min(5, 'Indica el enlace al contenido'),
  original_work: trimmed(1000).min(3, 'Describe la obra protegida'),
  details: trimmed(5000).min(10, 'Explica la reclamación'),
  good_faith: z.literal(true, { message: 'Debes confirmar la declaración de buena fe' }),
});

export const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Usa el formato MAJOR.MINOR.PATCH (p. ej. 1.2.0)');

export const appVersionSchema = z
  .object({
    platform: z.enum(PLATFORMS),
    channel: z.enum(RELEASE_CHANNELS),
    version: semverSchema,
    build_number: z.number().int().positive(),
    install_method: z.enum(INSTALL_METHODS),
    release_notes: trimmed(5000).nullable(),
    min_os_version: trimmed(20).nullable(),
    download_url: z.url({ protocol: /^https$/ }).nullable(),
    storage_path: trimmed(300).nullable(),
    file_size_bytes: z.number().int().positive().nullable(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/, 'SHA-256 en hexadecimal (64 caracteres)')
      .nullable(),
  })
  .refine((v) => v.download_url !== null || v.storage_path !== null, {
    message: 'Indica una URL de descarga/instalación o una ruta en Storage',
    path: ['download_url'],
  })
  .refine((v) => (v.platform === 'android' ? true : v.install_method !== 'apk' && v.install_method !== 'play_store'), {
    message: 'Método de instalación no válido para iOS',
    path: ['install_method'],
  })
  .refine((v) => (v.platform === 'ios' ? true : ['apk', 'play_store'].includes(v.install_method)), {
    message: 'Método de instalación no válido para Android',
    path: ['install_method'],
  })
  .refine((v) => v.install_method !== 'apk' || (v.sha256 !== null && v.file_size_bytes !== null), {
    message: 'Un APK necesita tamaño y SHA-256 para poder verificarse',
    path: ['sha256'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PlaylistInput = z.infer<typeof playlistSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type TrackMetadataInput = z.infer<typeof trackMetadataSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type RightsClaimInput = z.infer<typeof rightsClaimSchema>;
export type AppVersionInput = z.infer<typeof appVersionSchema>;

/** Devuelve el primer mensaje de error legible de un resultado de zod. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Datos no válidos';
}
