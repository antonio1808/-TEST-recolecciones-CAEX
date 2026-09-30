const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
  console.log(`Swagger disponible en http://localhost:${port}/api-docs`);
});
