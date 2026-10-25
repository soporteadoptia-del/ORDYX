import Image from 'next/image';

/** Logotipo «A» de Aurevix (el mismo de aurevixweb.es; ver scripts/generate-brand-assets.py). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return <Image src="/brand/logo-a.png" width={size} height={size} alt="" priority />;
}

/** Logotipo + nombre: primera palabra en crema y el resto en lima («AUREVIX MUSIC»). */
export function Wordmark({ name, size = 32 }: { name: string; size?: number }) {
  const [first, ...rest] = name.split(' ');
  return (
    <span className="flex items-center gap-2.5 font-display font-extrabold uppercase tracking-tight">
      <LogoMark size={size} />
      <span className="text-lg leading-none">
        {first}
        {rest.length ? <span className="text-accent">{rest.join(' ')}</span> : null}
      </span>
    </span>
  );
}
