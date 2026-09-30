// Notificación simulada: en producción aquí iría un proveedor real de email/SMS.
function notificarCambioEstado(solicitud, estadoNuevo) {
  const canales = [];
  if (solicitud.email) canales.push(`EMAIL -> ${solicitud.email}`);
  if (solicitud.telefono) canales.push(`SMS -> ${solicitud.telefono}`);
  if (canales.length === 0) canales.push('SIN CONTACTO (solo log)');

  canales.forEach(canal => {
    console.log(
      `[NOTIFICACIÓN] ${new Date().toISOString()} | ${canal} | ` +
      `Hola ${solicitud.nombreCliente || 'cliente'}, tu solicitud ${solicitud.codigo} ` +
      `cambió a "${estadoNuevo}".`
    );
  });
}

module.exports = { notificarCambioEstado };
