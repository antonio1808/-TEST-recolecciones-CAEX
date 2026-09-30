const crypto = require('crypto');
const repo = require('../repositories/recolecciones.repository');
const notificador = require('../notifications/notificador');
const AppError = require('../errors');

// Transiciones permitidas (máquina de estados)
const TRANSICIONES = {
  'Pendiente de Asignación': ['Recolector en Camino', 'Cancelada'],
  'Recolector en Camino': ['Recolectado', 'Cancelada'],
  'Recolectado': [],
  'Cancelada': [],
};

const SUCURSAL_DEFAULT_ID = 1;

function generarCodigo() {
  let codigo;
  do {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sufijo = crypto.randomBytes(2).toString('hex').toUpperCase();
    codigo = `REC-${fecha}-${sufijo}`;
  } while (repo.existeCodigo(codigo));
  return codigo;
}

function asignarSucursal(departamento) {
  const sucursales = repo.obtenerSucursales();
  const hub = sucursales.find(s =>
    s.cobertura.some(d => d.toLowerCase() === departamento.toLowerCase())
  );
  return hub || sucursales.find(s => s.id === SUCURSAL_DEFAULT_ID);
}

function validarNueva(datos) {
  const errores = [];
  const { direccion, departamento, franjaInicio, franjaFin, pesoKg } = datos;

  if (!direccion || !String(direccion).trim()) errores.push('La dirección es obligatoria.');
  if (!departamento || !String(departamento).trim()) errores.push('El departamento es obligatorio.');

  const peso = Number(pesoKg);
  if (pesoKg === undefined || pesoKg === null || pesoKg === '' || !Number.isFinite(peso) || peso <= 0) {
    errores.push('El peso debe ser un valor numérico positivo.');
  }

  const inicio = new Date(franjaInicio);
  const fin = new Date(franjaFin);
  if (!franjaInicio || isNaN(inicio)) errores.push('La fecha/hora de inicio de la franja no es válida.');
  if (!franjaFin || isNaN(fin)) errores.push('La fecha/hora de fin de la franja no es válida.');

  if (errores.length) throw new AppError(400, 'Datos de la solicitud inválidos.', errores);

  if (inicio <= new Date()) {
    throw new AppError(400, 'La franja horaria solicitada ya pasó. Elige una fecha y hora futura.');
  }
  if (fin <= inicio) {
    throw new AppError(400, 'La hora de fin de la franja debe ser posterior a la hora de inicio.');
  }

  return { peso, inicio, fin };
}

// Convierte el registro interno en la respuesta pública de la API
function aRespuesta(solicitud) {
  const estados = repo.obtenerEstados();
  const sucursales = repo.obtenerSucursales();
  const nombreEstado = id => estados.find(e => e.id === id)?.nombre;

  return {
    codigo: solicitud.codigo,
    estadoActual: nombreEstado(solicitud.idEstadoActual),
    sucursal: sucursales.find(s => s.id === solicitud.idSucursal)?.nombre,
    nombreCliente: solicitud.nombreCliente,
    direccion: solicitud.direccion,
    departamento: solicitud.departamento,
    franjaInicio: solicitud.franjaInicio,
    franjaFin: solicitud.franjaFin,
    pesoKg: solicitud.pesoKg,
    fechaCreacion: solicitud.fechaCreacion,
    historial: [...solicitud.historial]
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map(h => ({ estado: nombreEstado(h.idEstado), fecha: h.fecha, comentario: h.comentario })),
  };
}

function crear(datos) {
  const { peso, inicio, fin } = validarNueva(datos);
  const ahora = new Date().toISOString();
  const hub = asignarSucursal(String(datos.departamento).trim());

  const solicitud = {
    codigo: generarCodigo(),
    nombreCliente: datos.nombreCliente?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    email: datos.email?.trim() || null,
    direccion: String(datos.direccion).trim(),
    departamento: String(datos.departamento).trim(),
    franjaInicio: inicio.toISOString(),
    franjaFin: fin.toISOString(),
    pesoKg: peso,
    idSucursal: hub.id,
    idEstadoActual: 1,
    fechaCreacion: ahora,
    historial: [{ idEstado: 1, fecha: ahora, comentario: 'Solicitud registrada' }],
  };

  repo.insertar(solicitud);
  notificador.notificarCambioEstado(solicitud, 'Pendiente de Asignación');
  return aRespuesta(solicitud);
}

function obtener(codigo) {
  const solicitud = repo.buscarPorCodigo(String(codigo).trim().toUpperCase());
  if (!solicitud) {
    throw new AppError(404, `No encontramos ninguna solicitud con el código "${codigo}". Verifica e intenta de nuevo.`);
  }
  return aRespuesta(solicitud);
}

function cambiarEstado(codigo, nuevoEstado, comentario) {
  const solicitud = repo.buscarPorCodigo(String(codigo).trim().toUpperCase());
  if (!solicitud) {
    throw new AppError(404, `No encontramos ninguna solicitud con el código "${codigo}".`);
  }

  const estados = repo.obtenerEstados();
  const actual = estados.find(e => e.id === solicitud.idEstadoActual).nombre;
  const destino = estados.find(e => e.nombre.toLowerCase() === String(nuevoEstado || '').toLowerCase());

  if (!destino) {
    throw new AppError(400, 'Estado no válido.', estados.map(e => e.nombre));
  }
  if (!TRANSICIONES[actual].includes(destino.nombre)) {
    throw new AppError(400, `No se puede pasar de "${actual}" a "${destino.nombre}".`);
  }

  solicitud.idEstadoActual = destino.id;
  solicitud.historial.push({
    idEstado: destino.id,
    fecha: new Date().toISOString(),
    comentario: comentario || null,
  });

  repo.actualizar(solicitud);
  notificador.notificarCambioEstado(solicitud, destino.nombre);
  return aRespuesta(solicitud);
}

module.exports = { crear, obtener, cambiarEstado };
