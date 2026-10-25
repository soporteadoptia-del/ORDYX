# Requisitos legales a revisar antes del lanzamiento (UE y España)

> Esto es una lista de trabajo técnica, **no asesoramiento jurídico**. Las páginas legales incluidas son borradores marcados como tales. Que existan no significa que el servicio cumpla la normativa.

## Contenido musical y derechos

- **Licencias de la música publicada.** Solo se aceptan canciones que el artista declara como propias o autorizadas (casilla obligatoria, `rights_confirmed_at`, titular y licencia guardados). Revisar con un abogado si la plataforma, al comunicar públicamente obras de autores gestionados por entidades (SGAE, AIE, AGEDI, etc.), necesita licencias propias además de la declaración del artista.
- **Directiva (UE) 2019/790, art. 17** (transpuesta en España por el RDL 24/2021): un «prestador de servicios para compartir contenidos en línea» puede tener que hacer «los mayores esfuerzos» por obtener autorización de los titulares y responder ante infracciones. Evaluar si Ordyx entra en esa categoría según su tamaño y antigüedad.
- **Procedimiento de notificación y retirada:** implementado (formulario público `/derechos`, denuncias en la app, retirada desde el panel con notificación). Falta definir plazos, contranotificación formal y conservación de pruebas.
- No se extrae música de Spotify, SoundCloud, YouTube ni otros servicios. El contenido de demostración es audio sintetizado propio (CC0) marcado como demo.

## Protección de datos (RGPD + LOPDGDD)

- Completar el responsable, finalidades y bases jurídicas en `/privacidad`; registro de actividades de tratamiento.
- Contratos de encargado (art. 28) con Supabase, Expo, Apple, Google y el alojamiento de la web; revisar transferencias internacionales.
- Derechos ejercitables en la app: exportación de datos (`export_my_data`) y borrado de cuenta (Edge Function `delete-account`).
- Edad mínima (en España, 14 años para consentir) y controles asociados.
- Evaluación de impacto si se añaden recomendaciones personalizadas o perfilado.

## Servicios digitales

- **LSSI-CE:** datos identificativos del titular en `/aviso-legal`.
- **Reglamento de Servicios Digitales (DSA):** punto de contacto, mecanismo de notificación de contenido ilícito (implementado), motivación de las decisiones de moderación y vía de reclamación interna; informes de transparencia si aplica por tamaño.
- **Cookies (art. 22.2 LSSI):** la web no usa cookies de analítica ni publicidad; si se añaden, hará falta banner de consentimiento.

## Consumo, accesibilidad y tiendas

- Condiciones de uso conforme a la normativa de consumidores (claridad, ley aplicable y fuero).
- **Acta Europea de Accesibilidad** (Directiva 2019/882, aplicable desde junio de 2025) para servicios dirigidos a consumidores: la app y la web siguen buenas prácticas (etiquetas accesibles, contraste, tamaño táctil), pero falta una auditoría formal (WCAG 2.2 AA / EN 301 549) y una declaración de accesibilidad.
- Fichas de las tiendas: etiquetas de privacidad de Apple y sección de seguridad de datos de Google Play coherentes con la política.
- Futuras funciones de pago: normativa de pagos, IVA de servicios electrónicos, reglas de las tiendas y, en iOS, condiciones de la UE.
