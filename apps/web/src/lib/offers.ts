import { formatBytes } from '@ordyx/shared';
import { installUrl, type PublicVersion } from './data';

export interface PlatformOffer {
  available: boolean;
  label: string;
  href: string | null;
  method: PublicVersion['install_method'] | null;
  version: string | null;
  sizeLabel: string | null;
  sha256: string | null;
  publishedAt: string | null;
  minOs: string | null;
  notes: string | null;
  beta: { href: string; version: string } | null;
}

export function offerFor(
  platform: 'android' | 'ios',
  stable?: PublicVersion,
  beta?: PublicVersion,
): PlatformOffer {
  const href = stable
    ? platform === 'android' && stable.install_method === 'apk'
      ? '/descargar/android'
      : installUrl(stable)
    : null;
  const betaHref = beta
    ? platform === 'android' && beta.install_method === 'apk'
      ? '/descargar/android?canal=beta'
      : installUrl(beta)
    : null;
  const label =
    platform === 'android'
      ? stable?.install_method === 'play_store'
        ? 'Abrir en Google Play'
        : 'Descargar para Android'
      : stable?.install_method === 'app_store'
        ? 'Abrir en el App Store'
        : 'Instalar en iPhone';
  return {
    available: Boolean(stable && href),
    label,
    href,
    method: stable?.install_method ?? null,
    version: stable ? `${stable.version} (${stable.build_number})` : null,
    sizeLabel: stable?.file_size_bytes ? formatBytes(stable.file_size_bytes) : null,
    sha256: stable?.sha256 ?? null,
    publishedAt: stable?.published_at ?? null,
    minOs: stable?.min_os_version ?? null,
    notes: stable?.release_notes ?? null,
    beta: beta && betaHref ? { href: betaHref, version: beta.version } : null,
  };
}
