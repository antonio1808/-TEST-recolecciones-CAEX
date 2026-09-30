const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  apiKey: process.env.API_KEY || 'caex-demo-key-2026',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data', 'db.json'),
};
