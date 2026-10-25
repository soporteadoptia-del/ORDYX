import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheLife: () => undefined, cacheTag: () => undefined }));
vi.mock('../env', () => ({
  env: { supabaseUrl: 'https://x.supabase.co', supabaseKey: 'k', siteUrl: 'https://ordyx.app' },
  isConfigured: true,
}));

const { offerFor } = await import('../offers');
type V = Parameters<typeof offerFor>[1];

const base = {
  id: '1',
  channel: 'stable' as const,
  version: '1.2.0',
  build_number: 7,
  release_notes: null,
  min_os_version: '7.0',
  download_url: null,
  storage_path: 'android/ordyx.apk',
  file_size_bytes: 52_428_800,
  sha256: 'a'.repeat(64),
  published_at: '2026-10-24T10:00:00Z',
};

describe('ofertas de descarga', () => {
  it('sin versión publicada no hay enlace (nunca un botón roto)', () => {
    const o = offerFor('android', undefined, undefined);
    expect(o.available).toBe(false);
    expect(o.href).toBeNull();
  });

  it('un APK publicado usa el enlace estable y muestra versión, tamaño y hash', () => {
    const o = offerFor('android', { ...base, platform: 'android', install_method: 'apk' } as V);
    expect(o.available).toBe(true);
    expect(o.href).toBe('/descargar/android');
    expect(o.label).toBe('Descargar para Android');
    expect(o.version).toBe('1.2.0 (7)');
    expect(o.sizeLabel).toBe('50,0 MB');
    expect(o.sha256).toHaveLength(64);
  });

  it('iOS con TestFlight usa el enlace público de Apple', () => {
    const o = offerFor('ios', {
      ...base,
      platform: 'ios',
      install_method: 'testflight',
      storage_path: null,
      download_url: 'https://testflight.apple.com/join/ABCDEFG',
      sha256: null,
      file_size_bytes: null,
    } as V);
    expect(o.href).toBe('https://testflight.apple.com/join/ABCDEFG');
    expect(o.label).toBe('Instalar en iPhone');
    expect(o.method).toBe('testflight');
  });

  it('Google Play cambia el texto del botón', () => {
    const o = offerFor('android', {
      ...base,
      platform: 'android',
      install_method: 'play_store',
      download_url: 'https://play.google.com/store/apps/details?id=app.ordyx.music',
      storage_path: null,
    } as V);
    expect(o.label).toBe('Abrir en Google Play');
    expect(o.href).toContain('play.google.com');
  });

  it('una beta APK se ofrece por el canal beta', () => {
    const o = offerFor(
      'android',
      { ...base, platform: 'android', install_method: 'apk' } as V,
      {
        ...base,
        platform: 'android',
        install_method: 'apk',
        channel: 'beta',
        version: '1.3.0',
      } as V,
    );
    expect(o.beta).toEqual({ href: '/descargar/android?canal=beta', version: '1.3.0' });
  });
});
