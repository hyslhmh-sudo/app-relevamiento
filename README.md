# App de relevamiento de edificios · Red Trelew y Rawson

Servicio de Higiene y Seguridad Laboral (HySL) · Belén Pellegrini · Versión 0 (23/11/2026)

App web para cargar en el lugar (celular o PC) el relevamiento de los edificios de la red Trelew y de la red Rawson. Funciona sin señal: guarda en el dispositivo y envía a la planilla cuando vuelve la conexión.

- `index.html`, `sw.js`, `manifest.json`, `icono.svg`, `logo-hysl.png`: la app (GitHub Pages).
- `apps-script/Code.gs`: copia del script vinculado al libro «RELEVAMIENTO DE EDIFICIOS · Red Trelew y Rawson» (Extensiones › Apps Script). La versión que funciona es la del editor de Apps Script.

La app no contiene datos ni claves. Cada dispositivo se vincula una sola vez (Ajustes) con el link del script y la clave del menú Relevamiento de la planilla. Lo que se pregunta se define en la hoja ITEMS del libro.
