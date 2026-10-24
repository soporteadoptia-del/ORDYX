/** Isotipo de Ordyx (misma geometría que el icono de la app, ver scripts/generate-brand-assets.py). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Ordyx">
      <defs>
        <linearGradient id="ordyx-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="26" fill="url(#ordyx-g)" />
      <circle cx="50" cy="50" r="24.25" fill="none" stroke="#fff" strokeWidth="7.5" />
      <rect x="37.4" y="41" width="7" height="18" rx="3.5" fill="#fff" />
      <rect x="46.5" y="34" width="7" height="32" rx="3.5" fill="#fff" />
      <rect x="55.6" y="39" width="7" height="22" rx="3.5" fill="#fff" />
    </svg>
  );
}
