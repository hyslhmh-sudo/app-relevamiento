/**
 * APP DE RELEVAMIENTO DE EDIFICIOS · Red Trelew y Rawson
 * Servicio de Higiene y Seguridad Laboral · Belén Pellegrini
 * Versión 0 (23/11/2026)
 *
 * Este script recibe los datos de la app (GitHub Pages) y los guarda en el libro
 * «RELEVAMIENTO DE EDIFICIOS · Red Trelew y Rawson», hoja VISITAS.
 * La app no pide contraseña: el celular o la PC se vinculan UNA sola vez con la clave
 * que genera la función crearClave() (menú Relevamiento › Generar clave nueva).
 * Sin esa clave, el script no lee ni escribe nada.
 */

const LIBRO_ID = '17EGhqhTp9zezWyEre2jxrx4qC1naYQqs_u7UymSybd0';
const CARPETA_RELEVAMIENTO_ID = '1P1XVR9SBcAh0xaBJ0WPboeDxljGKOWv3';
const NOMBRE_CARPETA_FOTOS = 'FOTOS DE VISITAS';
const FILA_INICIO = 6; // los datos empiezan en la fila 6 en todas las hojas

/* ---------- Menú en la planilla ---------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Relevamiento')
    .addItem('Generar clave nueva para la app', 'crearClaveDesdeMenu')
    .addItem('Ver la clave actual', 'verClaveDesdeMenu')
    .addSeparator()
    .addItem('Ayuda', 'mostrarAyuda')
    .addToUi();
}

function crearClave() {
  const clave = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('CLAVE', clave);
  Logger.log('Clave nueva: ' + clave);
  return clave;
}

function crearClaveDesdeMenu() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Generar clave nueva',
    'Si generás una clave nueva, los dispositivos ya vinculados dejan de funcionar hasta que cargues la clave nueva en cada uno. ¿Seguir?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const clave = crearClave();
  ui.alert('Clave de la app', 'Copiala y pegala en la app (Ajustes › Clave):\n\n' + clave, ui.ButtonSet.OK);
}

function verClaveDesdeMenu() {
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  SpreadsheetApp.getUi().alert('Clave de la app', clave || 'Todavía no hay clave. Usá «Generar clave nueva para la app».',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function mostrarAyuda() {
  SpreadsheetApp.getUi().alert('Ayuda · App de relevamiento',
    '1. Generá la clave (menú Relevamiento).\n' +
    '2. En la app, abrí Ajustes y pegá el link de este script y la clave.\n' +
    '3. Cada visita cerrada en la app se guarda en VISITAS (una fila por dato) y las fotos en la carpeta «FOTOS DE VISITAS» del edificio.\n' +
    '4. Si la app cargó sin señal, los datos quedan en el teléfono y se envían solos cuando vuelve la conexión.\n' +
    '5. Las coordenadas tomadas en la visita (ítem A03) también actualizan EDIFICIOS.\n' +
    '6. Para cambiar qué se pregunta, editá ITEMS: la columna «Campos de carga (app)» define los campos y la «Zona de recorrido», el orden.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---------- Entrada de la app ---------- */

function doGet() {
  return json_({ ok: true, mensaje: 'Script de relevamiento activo. Se usa desde la app.' });
}

function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Pedido ilegible' });
  }
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave || pedido.clave !== clave) {
    return json_({ ok: false, error: 'Clave incorrecta o sin configurar' });
  }
  try {
    if (pedido.accion === 'datos') return json_(leerDatos_());
    if (pedido.accion === 'guardar') return json_(guardar_(pedido.registros || []));
    return json_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Lectura: edificios, ítems y último dato ---------- */

function leerDatos_() {
  const libro = SpreadsheetApp.openById(LIBRO_ID);

  const hE = libro.getSheetByName('EDIFICIOS');
  const filasE = leerFilas_(hE, 47);
  const edificios = filasE.filter(f => f[0]).map(f => ({
    codigo: s_(f[0]), red: s_(f[1]), depende: s_(f[2]), tipo: s_(f[3]),
    nombre: s_(f[4]), oficial: s_(f[5]), direccion: s_(f[9]), barrio: s_(f[10]),
    localidad: s_(f[11]), lat: num_(f[13]), lng: num_(f[14]), fuenteCoord: s_(f[15]),
    telefono: s_(f[17]), mail: s_(f[18]), horario: s_(f[19]),
    faltantes: num_(f[44]), completo: num_(f[45])
  }));

  const hI = libro.getSheetByName('ITEMS');
  const filasI = leerFilas_(hI, 14);
  const items = filasI.filter(f => f[0]).map(f => ({
    codigo: s_(f[0]), bloque: s_(f[1]), item: s_(f[2]), como: s_(f[3]), donde: s_(f[4]),
    dato: s_(f[5]), criterio: s_(f[6]), norma: s_(f[7]), capa: s_(f[8]), aplica: s_(f[9]),
    minimo: s_(f[10]), campos: s_(f[12]), zona: s_(f[13])
  }));

  const hV = libro.getSheetByName('VISITAS');
  const filasV = leerFilas_(hV, 13);
  const ultimos = {};
  filasV.forEach(f => {
    if (!f[2] || !f[4]) return;
    const clave = s_(f[2]) + '|' + s_(f[4]);
    ultimos[clave] = { // las filas de abajo son las más nuevas
      fecha: fecha_(f[1]), dato: s_(f[6]), estado: s_(f[7]), fuente: s_(f[8]), informante: s_(f[9])
    };
  });

  return { ok: true, actualizado: new Date().toISOString(), edificios, items, ultimos };
}

function leerFilas_(hoja, columnas) {
  const ultima = hoja.getLastRow();
  if (ultima < FILA_INICIO) return [];
  return hoja.getRange(FILA_INICIO, 1, ultima - FILA_INICIO + 1, columnas).getValues();
}

/* ---------- Escritura: una fila por dato en VISITAS ---------- */

function guardar_(registros) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const libro = SpreadsheetApp.openById(LIBRO_ID);
    const hV = libro.getSheetByName('VISITAS');
    const existentes = new Set(leerFilas_(hV, 1).map(f => s_(f[0])));
    const guardados = [];
    let fila = primeraFilaLibre_(hV);

    registros.forEach(r => {
      if (!r.id) return;
      if (existentes.has(r.id)) { guardados.push(r.id); return; } // ya estaba: reenvío sin señal

      const links = (r.fotos || []).map((foto, i) => subirFoto_(r, foto, i)).filter(Boolean);
      const fecha = r.fecha ? new Date(r.fecha + 'T12:00:00') : new Date();

      // D (Edificio) y F (Ítem) se completan solos con fórmulas: no se escriben.
      hV.getRange(fila, 1, 1, 3).setValues([[r.id, fecha, r.edificio]]);
      hV.getRange(fila, 2).setNumberFormat('dd/mm/yyyy');
      hV.getRange(fila, 5).setValue(r.item);
      hV.getRange(fila, 7, 1, 7).setValues([[
        r.dato || 's/d', r.estado || 's/d', r.fuente || 'Visita', r.informante || '',
        r.observaciones || '', links.join(' | '), r.brechaSSB || ''
      ]]);

      if (r.item === 'A03' && r.lat && r.lng) actualizarCoordenadas_(libro, r, fecha);

      existentes.add(r.id);
      guardados.push(r.id);
      fila++;
    });

    SpreadsheetApp.flush();
    return { ok: true, guardados };
  } finally {
    lock.releaseLock();
  }
}

function primeraFilaLibre_(hoja) {
  const col = hoja.getRange(FILA_INICIO, 1, Math.max(hoja.getMaxRows() - FILA_INICIO + 1, 1), 1).getValues();
  let i = col.length;
  while (i > 0 && col[i - 1][0] === '') i--;
  const fila = FILA_INICIO + i;
  if (fila > hoja.getMaxRows() - 50) hoja.insertRowsAfter(hoja.getMaxRows(), 500);
  return fila;
}

function subirFoto_(r, foto, i) {
  try {
    const carpeta = carpetaEdificio_(r.edificio);
    const datos = String(foto.datos).replace(/^data:[^,]+,/, '');
    const blob = Utilities.newBlob(Utilities.base64Decode(datos), foto.tipo || 'image/jpeg',
      r.edificio + '_' + r.item + '_' + (r.fecha || '') + '_' + (i + 1) + '.' + ((foto.tipo || '').includes('pdf') ? 'pdf' : 'jpg'));
    return carpeta.createFile(blob).getUrl();
  } catch (err) {
    return '';
  }
}

function carpetaEdificio_(codigo) {
  const raiz = DriveApp.getFolderById(CARPETA_RELEVAMIENTO_ID);
  const fotos = obtenerSubcarpeta_(raiz, NOMBRE_CARPETA_FOTOS);
  return obtenerSubcarpeta_(fotos, codigo || 'SIN CÓDIGO');
}

function obtenerSubcarpeta_(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function actualizarCoordenadas_(libro, r, fecha) {
  const hE = libro.getSheetByName('EDIFICIOS');
  const codigos = leerFilas_(hE, 1).map(f => s_(f[0]));
  const i = codigos.indexOf(r.edificio);
  if (i < 0) return;
  // N Latitud · O Longitud · P Fuente de coordenadas · Q Fecha de verificación
  hE.getRange(FILA_INICIO + i, 14, 1, 4).setValues([[Number(r.lat), Number(r.lng), 'GPS en visita (app)', fecha]]);
  hE.getRange(FILA_INICIO + i, 17).setNumberFormat('dd/mm/yyyy');
}

/* ---------- Utilidades ---------- */

function s_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return fecha_(v);
  return String(v).trim();
}

function num_(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.').replace('%', ''));
  return isNaN(n) ? null : n;
}

function fecha_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
  return s_(v);
}
