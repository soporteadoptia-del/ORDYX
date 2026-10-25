# El disco de Aurevix (vídeo de la portada)

La portada usa el motor de [scroll-world](https://github.com/oso95/scroll-world) (MIT): el scroll
mueve el tiempo de unos vídeos. En lugar de generarlos con IA de pago, los renderizamos nosotros
con Three.js en Chromium sin pantalla: un plano de producto con la funda de Aurevix, el vinilo y el
móvil con la app.

Para regenerarlos (por ejemplo, con una captura nueva de la app):

1. En una carpeta de trabajo, `npm i three@0.170.0` y copia ahí `vinyl.js`, `vinyl.html` y
   `vrender.cjs`, más las fuentes `BricolageGrotesque_800ExtraBold.ttf` e
   `InstrumentSans_600SemiBold.ttf` (de `node_modules/@expo-google-fonts/…`) y la captura de la app
   como `phone.png` (390×844 a 3×).
2. Sirve la carpeta: `python3 -m http.server 8123`.
3. Renderiza: `node vrender.cjs 1280 720 vf-d` y `node vrender.cjs 720 1280 vf-m`.
4. Codifica con `encode.sh` (deja `apps/web/public/disco/vid` y `still`).

Las uniones entre los tres clips son fotogramas idénticos porque es un único plano continuo.
