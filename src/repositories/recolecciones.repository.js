const fs = require('fs');
const { dbPath } = require('../config');

// Capa de datos: única parte que sabe que la "BD" es un archivo JSON.
// Para migrar a SQL Server solo habría que reemplazar este archivo.
function leer() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function guardar(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

module.exports = {
  obtenerEstados: () => leer().estados,
  obtenerSucursales: () => leer().sucursales,

  buscarPorCodigo(codigo) {
    return leer().solicitudes.find(s => s.codigo === codigo) || null;
  },

  existeCodigo(codigo) {
    return leer().solicitudes.some(s => s.codigo === codigo);
  },

  insertar(solicitud) {
    const db = leer();
    db.solicitudes.push(solicitud);
    guardar(db);
    return solicitud;
  },

  actualizar(solicitud) {
    const db = leer();
    const i = db.solicitudes.findIndex(s => s.codigo === solicitud.codigo);
    db.solicitudes[i] = solicitud;
    guardar(db);
    return solicitud;
  },
};
