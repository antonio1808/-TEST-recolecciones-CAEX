const { apiKey } = require('../config');

module.exports = function validarApiKey(req, res, next) {
  if (req.header('x-api-key') !== apiKey) {
    return res.status(401).json({ error: 'No autorizado', mensaje: 'API Key inválida o ausente en el header x-api-key.' });
  }
  next();
};
