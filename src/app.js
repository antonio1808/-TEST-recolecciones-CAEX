const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const validarApiKey = require('./middleware/apiKey');
const errorHandler = require('./middleware/errorHandler');
const recoleccionesRoutes = require('./routes/recolecciones.routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const openapi = YAML.load(path.join(__dirname, '..', 'docs', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.use('/api/recolecciones', validarApiKey, recoleccionesRoutes);

app.use(errorHandler);

module.exports = app;
