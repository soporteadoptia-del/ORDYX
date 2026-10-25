import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  alternates: { canonical: '/privacidad' },
};

export default function Privacy() {
  return (
    <LegalPage title="Política de privacidad" updated="24 de octubre de 2026">
      <h2>1. Responsable del tratamiento</h2>
      <p>
        [Pendiente: nombre o razón social, NIF, domicilio y correo de contacto del titular. Si
        procede, datos del Delegado de Protección de Datos.]
      </p>
      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          Datos de cuenta: correo electrónico, contraseña (almacenada cifrada por el proveedor de
          autenticación), nombre de usuario, nombre visible, foto y biografía.
        </li>
        <li>
          Actividad en el servicio: favoritos, playlists, seguimientos, comentarios, búsquedas
          recientes, historial de escucha y eventos de reproducción.
        </li>
        <li>
          Contenido que publicas: canciones, portadas y metadatos, junto con la declaración de
          derechos.
        </li>
        <li>
          Datos técnicos: registros de errores de la app (sin contenido privado) y datos necesarios
          para la seguridad y la prevención de abusos.
        </li>
      </ul>
      <h2>3. Finalidades y bases jurídicas (RGPD art. 6)</h2>
      <ul>
        <li>
          Prestar el servicio que solicitas (ejecución del contrato): cuenta, reproducción,
          biblioteca sincronizada y funciones sociales.
        </li>
        <li>
          Seguridad, moderación y cumplimiento de obligaciones legales (por ejemplo, tramitar
          reclamaciones de derechos y avisos de contenido ilícito).
        </li>
        <li>
          Estadísticas agregadas de reproducción para artistas y para el funcionamiento del catálogo
          (interés legítimo). No vendemos datos personales.
        </li>
        <li>
          Comunicaciones comerciales solo con tu consentimiento, que puedes retirar en cualquier
          momento.
        </li>
      </ul>
      <h2>4. Visibilidad</h2>
      <p>
        Tu perfil, tus playlists públicas y tus comentarios son públicos. Tus favoritos son privados
        salvo que los hagas públicos en Ajustes. Tu historial de escucha y tus búsquedas solo los
        ves tú.
      </p>
      <h2>5. Encargados y transferencias</h2>
      <p>
        Usamos Supabase (base de datos, autenticación y almacenamiento) con alojamiento en la región
        UE (Irlanda) y los servicios de compilación y distribución de Expo, Apple y Google.
        [Pendiente: listar encargados, contratos (art. 28) y, si hay transferencias fuera del EEE,
        sus garantías.]
      </p>
      <h2>6. Conservación</h2>
      <p>
        Mientras mantengas tu cuenta. El historial de escucha conserva las últimas 500
        reproducciones. Al eliminar la cuenta borramos tus datos y archivos, salvo los que debamos
        conservar por obligación legal. [Pendiente: plazos concretos.]
      </p>
      <h2>7. Tus derechos</h2>
      <p>
        Acceso, rectificación, supresión, oposición, limitación y portabilidad. Desde la app puedes
        exportar tus datos (Ajustes → Exportar mis datos) y eliminar tu cuenta (Ajustes → Eliminar
        mi cuenta). También puedes escribirnos y, si no estás conforme, reclamar ante la Agencia
        Española de Protección de Datos (aepd.es).
      </p>
      <h2>8. Cookies y almacenamiento local</h2>
      <p>
        Esta web no usa cookies de analítica ni publicidad. La app guarda en tu dispositivo la
        sesión (cifrada) y la última cola de reproducción.
      </p>
      <h2>9. Menores</h2>
      <p>
        [Pendiente: edad mínima. En España, el consentimiento propio para el tratamiento de datos se
        admite desde los 14 años (LOPDGDD art. 7).]
      </p>
    </LegalPage>
  );
}
