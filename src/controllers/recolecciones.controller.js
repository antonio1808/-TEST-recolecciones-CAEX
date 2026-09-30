const service = require('../services/recolecciones.service');

// Capa HTTP: traduce request -> servicio -> response. Los errores van al errorHandler.
module.exports = {
  crear(req, res, next) {
    try {
      res.status(201).json(service.crear(req.body || {}));
    } catch (err) { next(err); }
  },

  obtener(req, res, next) {
    try {
      res.json(service.obtener(req.params.codigo));
    } catch (err) { next(err); }
  },

  cambiarEstado(req, res, next) {
    try {
      const { estado, comentario } = req.body || {};
      res.json(service.cambiarEstado(req.params.codigo, estado, comentario));
    } catch (err) { next(err); }
  },
};
