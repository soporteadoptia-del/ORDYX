import { describe, expect, it } from 'vitest';
import {
  appVersionSchema,
  compareVersions,
  detectDevice,
  fileExtension,
  formatBytes,
  formatCount,
  formatDuration,
  formatLongDuration,
  publicImageUrl,
  signUpSchema,
  slugify,
  toUserMessage,
  usernameSchema,
  audioFileSchema,
} from '../index';

describe('formato', () => {
  it('duraciones', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(61_500)).toBe('1:01');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(null)).toBe('0:00');
    expect(formatLongDuration(4_320_000)).toBe('1 h 12 min');
    expect(formatLongDuration(35 * 60_000)).toBe('35 min');
  });
  it('números y bytes', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1234)).toBe('1,2 mil');
    expect(formatCount(2_500_000)).toBe('2,5 M');
    expect(formatBytes(52_428_800)).toBe('50,0 MB');
  });
  it('slug', () => {
    expect(slugify('  Canción Ñandú & Co! ')).toBe('cancion-nandu-co');
  });
});

describe('detección de dispositivo', () => {
  it('reconoce plataformas', () => {
    expect(detectDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android');
    expect(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
    expect(detectDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios');
    expect(detectDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('desktop');
    expect(detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(detectDevice('')).toBe('unknown');
    expect(detectDevice('curl/8.0')).toBe('unknown');
  });
  it('compara versiones', () => {
    expect(compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
  });
});

describe('validación', () => {
  it('nombre de usuario', () => {
    expect(usernameSchema.safeParse('Maria_99').data).toBe('maria_99');
    expect(usernameSchema.safeParse('ab').success).toBe(false);
    expect(usernameSchema.safeParse('hola mundo').success).toBe(false);
    expect(usernameSchema.safeParse('.hola').success).toBe(false);
  });
  it('registro exige aceptar condiciones y contraseña robusta', () => {
    const base = { email: 'a@b.com', password: 'secreto123', username: 'ana' };
    expect(signUpSchema.safeParse({ ...base, acceptTerms: true }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: 'corta', acceptTerms: true }).success).toBe(
      false,
    );
  });
  it('archivo de audio', () => {
    expect(
      audioFileSchema.safeParse({ name: 'a.mp3', size: 1000, mimeType: 'audio/mpeg' }).success,
    ).toBe(true);
    expect(
      audioFileSchema.safeParse({ name: 'a.exe', size: 1000, mimeType: 'application/x-msdownload' })
        .success,
    ).toBe(false);
    expect(
      audioFileSchema.safeParse({ name: 'a.mp3', size: 500 * 1024 * 1024, mimeType: 'audio/mpeg' })
        .success,
    ).toBe(false);
  });
  it('versiones: un APK necesita hash y tamaño, y el método debe cuadrar con la plataforma', () => {
    const v = {
      platform: 'android' as const,
      channel: 'stable' as const,
      version: '1.0.0',
      build_number: 1,
      install_method: 'apk' as const,
      release_notes: null,
      min_os_version: '7.0',
      download_url: 'https://example.com/a.apk',
      storage_path: null,
      file_size_bytes: 1000,
      sha256: 'a'.repeat(64),
    };
    expect(appVersionSchema.safeParse(v).success).toBe(true);
    expect(appVersionSchema.safeParse({ ...v, sha256: null }).success).toBe(false);
    expect(appVersionSchema.safeParse({ ...v, install_method: 'testflight' }).success).toBe(false);
    expect(appVersionSchema.safeParse({ ...v, download_url: 'http://insecure' }).success).toBe(
      false,
    );
    expect(
      appVersionSchema.safeParse({ ...v, platform: 'ios', install_method: 'testflight' }).success,
    ).toBe(true);
  });
});

describe('utilidades', () => {
  it('rutas y errores', () => {
    expect(publicImageUrl('https://x.supabase.co/', 'covers', 'u/a b.png')).toBe(
      'https://x.supabase.co/storage/v1/object/public/covers/u/a%20b.png',
    );
    expect(publicImageUrl('https://x', 'covers', null)).toBeNull();
    expect(fileExtension('Song.MP3')).toBe('mp3');
    expect(toUserMessage({ message: 'ordyx:rate_limited' })).toMatch(/demasiado rápido/);
    expect(toUserMessage({ message: 'x', code: '42501' })).toMatch(/permiso/);
    expect(toUserMessage({ message: 'Invalid login credentials' })).toBe(
      'Correo o contraseña incorrectos.',
    );
    expect(toUserMessage(new TypeError('Network request failed'))).toMatch(/Sin conexión/);
  });
});
