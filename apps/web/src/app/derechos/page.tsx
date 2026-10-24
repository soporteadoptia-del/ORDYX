import type { Metadata } from 'next';
import { ClaimForm } from './ClaimForm';

export const metadata: Metadata = { title: 'Reclamación de derechos de autor', alternates: { canonical: '/derechos' } };

export default function RightsClaim() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-3 text-3xl font-extrabold">Reclamación de derechos de autor</h1>
      <p className="mb-2 text-muted">
        Si crees que un contenido publicado en Ordyx infringe tus derechos, cuéntanoslo. Revisamos cada reclamación, retiramos el contenido cuando procede e informamos a quien lo
        publicó, que puede presentar una contranotificación.
      </p>
      <p className="mb-8 text-sm text-subtle">No necesitas una cuenta. Usaremos tus datos solo para tramitar esta reclamación.</p>
      <ClaimForm />
    </div>
  );
}
