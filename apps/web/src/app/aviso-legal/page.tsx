import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Aviso legal', alternates: { canonical: '/aviso-legal' } };

export default function LegalNotice() {
  return (
    <LegalPage title="Aviso legal" updated="24 de octubre de 2026">
      <h2>Datos del titular (LSSI-CE, art. 10)</h2>
      <ul>
        <li>Titular: [Pendiente]</li>
        <li>NIF/CIF: [Pendiente]</li>
        <li>Domicilio: [Pendiente]</li>
        <li>Correo electrónico: [Pendiente]</li>
        <li>Datos registrales, si es una sociedad: [Pendiente]</li>
      </ul>
      <h2>Punto de contacto (Reglamento de Servicios Digitales, arts. 11 y 12)</h2>
      <p>[Pendiente: punto único de contacto para autoridades y para usuarios, e idiomas admitidos.]</p>
    </LegalPage>
  );
}
