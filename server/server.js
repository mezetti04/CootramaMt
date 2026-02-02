// server.js
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes'); // Importa o arquivo de rotas que criamos

const app = express();

app.use(express.json());
app.use(cors());

// Usa as rotas importadas
app.use(routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});