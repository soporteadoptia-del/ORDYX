'use client';

import { useState } from 'react';
import { btnGhost } from '@/components/ui';
import { browserClient } from '@/lib/supabase-browser';

/**
 * Sube un APK al bucket `releases` con la sesión del administrador (RLS: solo administración puede escribir)
 * y calcula su SHA-256 en el navegador para rellenar el formulario. El servidor lo vuelve a calcular al verificar.
 */
export function ReleaseUploader() {
  const [state, setState] = useState<string | null>(null);

  async function onFile(file: File) {
    try {
      setState('Calculando SHA-256…');
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const sha = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const path = `android/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      setState('Subiendo a Storage…');
      const { error } = await browserClient().storage.from('releases').upload(path, file, {
        contentType: 'application/vnd.android.package-archive',
        upsert: false,
      });
      if (error) throw error;
      const set = (name: string, value: string) => {
        const el = document.querySelector<HTMLInputElement>(`#new-version [name="${name}"]`);
        if (el) el.value = value;
      };
      set('storage_path', path);
      set('file_size_bytes', String(file.size));
      set('sha256', sha);
      setState(`Subido: ${path} (${(file.size / 1048576).toFixed(1)} MB)`);
    } catch (e) {
      setState(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-line p-3 text-sm">
      <label className={`${btnGhost} cursor-pointer`}>
        Subir APK al bucket «releases»
        <input
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      <p className="mt-2 text-xs text-muted">
        {state ??
          'Opcional. También puedes alojar el APK fuera (p. ej. GitHub Releases) y pegar su URL HTTPS. Revisa el límite de tamaño por archivo de tu plan de Supabase.'}
      </p>
    </div>
  );
}
