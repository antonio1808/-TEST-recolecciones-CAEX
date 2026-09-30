const router = require('express').Router();
const controller = require('../controllers/recolecciones.controller');

router.post('/', controller.crear);
router.get('/:codigo', controller.obtener);
router.patch('/:codigo/estado', controller.cambiarEstado);

module.exports = router;
