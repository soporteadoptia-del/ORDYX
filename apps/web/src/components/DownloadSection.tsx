import QRCode from 'qrcode';
import { getVersions } from '@/lib/data';
import { env } from '@/lib/env';
import { offerFor } from '@/lib/offers';
import { PlatformPicker } from './PlatformPicker';

/** Sección de descarga: datos reales de `app_versions` (solo versiones publicadas y verificadas). */
export async function DownloadSection() {
  const versions = await getVersions();
  const android = offerFor(
    'android',
    versions.current['android:stable'],
    versions.current['android:beta'],
  );
  const ios = offerFor('ios', versions.current['ios:stable'], versions.current['ios:beta']);
  const qr = await QRCode.toString(`${env.siteUrl}/#descargar`, {
    type: 'svg',
    margin: 1,
    color: { dark: '#07070B', light: '#FFFFFF' },
  });
  return <PlatformPicker android={android} ios={ios} backendOk={versions.ok} qrSvg={qr} />;
}
