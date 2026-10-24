import { formatBytes } from '@ordyx/shared';
import QRCode from 'qrcode';
import { getVersions, installUrl, type PublicVersion } from '@/lib/data';
import { env } from '@/lib/env';
import { PlatformPicker } from './PlatformPicker';

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

function offerFor(platform: 'android' | 'ios', stable?: PublicVersion, beta?: PublicVersion): PlatformOffer {
  const href = stable ? (platform === 'android' && stable.install_method === 'apk' ? '/descargar/android' : installUrl(stable)) : null;
  const betaHref = beta ? (platform === 'android' && beta.install_method === 'apk' ? '/descargar/android?canal=beta' : installUrl(beta)) : null;
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

/** Sección de descarga: datos reales de `app_versions` (solo versiones publicadas y verificadas). */
export async function DownloadSection() {
  const versions = await getVersions();
  const android = offerFor('android', versions.current['android:stable'], versions.current['android:beta']);
  const ios = offerFor('ios', versions.current['ios:stable'], versions.current['ios:beta']);
  const qr = await QRCode.toString(`${env.siteUrl}/#descargar`, { type: 'svg', margin: 1, color: { dark: '#07070B', light: '#FFFFFF' } });
  return <PlatformPicker android={android} ios={ios} backendOk={versions.ok} qrSvg={qr} />;
}
