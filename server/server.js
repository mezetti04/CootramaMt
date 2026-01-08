// server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'minha-chave-secreta-super-dificil'; 

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// --- MIDDLEWARE DE SEGURANÇA ---
const autenticar = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ erro: 'Acesso negado. Faça login.' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ erro: 'Token inválido.' });
    // Aqui guardamos quem é o usuário para usar nas rotas abaixo
    req.user = user; 
    next();
  });
};

// ==========================================
// ROTAS PÚBLICAS
// ==========================================

app.get('/', (req, res) => res.send('API Logística Segura ON!'));

app.post('/auth/registro', async (req, res) => {
  const { username, senha } = req.body;
  const hashSenha = await bcrypt.hash(senha, 10);
  try {
    const usuario = await prisma.usuario.create({
      data: { username, senha: hashSenha }
    });
    res.json({ id: usuario.id, username: usuario.username });
  } catch (error) {
    res.status(400).json({ erro: 'Usuário já existe' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, senha } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { username } });
  
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.status(400).json({ erro: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: usuario.id, username: usuario.username }, SECRET_KEY, { expiresIn: '1d' });
  res.json({ token, username: usuario.username });
});

// ==========================================
// ROTAS PROTEGIDAS (ISOLAMENTO DE DADOS)
// ==========================================

// --- MOTORISTAS ---

// Rota atualizada para contar viagens do mês
app.get('/motoristas', autenticar, async (req, res) => {
  try {
    // Calcula o primeiro e último dia do mês atual
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999);

    const motoristas = await prisma.motorista.findMany({
      where: { usuarioId: req.user.id },
      include: {
        _count: {
          select: {
            entregas: {
              where: {
                dataEntrega: {
                  gte: inicioMes,
                  lte: fimMes
                }
              }
            }
          }
        }
      }
    });

    // Formata para o frontend receber um campo simples "totalViagensMes"
    const motoristasFormatados = motoristas.map(m => ({
      ...m,
      totalViagensMes: m._count.entregas
    }));

    res.json(motoristasFormatados);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar motoristas' });
  }
});

app.post('/motoristas', autenticar, async (req, res) => {
  try {
    const { nome } = req.body;
    const novo = await prisma.motorista.create({
      data: { 
        nome, 
        usuarioId: req.user.id // Salva o dono do dado
      }
    });
    res.json(novo);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar' });
  }
});

app.put('/motoristas/:id', autenticar, async (req, res) => {
  try {
    // updateMany garante que só atualiza se o ID for esse E o dono for o usuário logado
    const resultado = await prisma.motorista.updateMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id },
      data: { nome: req.body.nome }
    });
    
    if (resultado.count === 0) return res.status(403).json({ erro: 'Não autorizado ou não encontrado' });
    res.json({ sucesso: true });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar' });
  }
});

app.delete('/motoristas/:id', autenticar, async (req, res) => {
  try {
    const resultado = await prisma.motorista.deleteMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Não autorizado' });
    res.sendStatus(200);
  } catch (error) {
    res.status(400).json({ erro: 'Erro ao excluir (possui vínculos?)' });
  }
});

// --- CARROS ---

app.get('/carros', autenticar, async (req, res) => {
  const carros = await prisma.carro.findMany({
    where: { usuarioId: req.user.id } // <--- ISOLAMENTO
  });
  res.json(carros);
});

app.post('/carros', autenticar, async (req, res) => {
  try {
    const { modelo, placa } = req.body;
    const novo = await prisma.carro.create({
      data: { modelo, placa, usuarioId: req.user.id } // <--- VINCULA AO DONO
    });
    res.json(novo);
  } catch (error) {
    res.status(400).json({ erro: 'Erro ao criar carro' });
  }
});

app.put('/carros/:id', autenticar, async (req, res) => {
  try {
    const { modelo, placa } = req.body;
    const resultado = await prisma.carro.updateMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id }, // Só atualiza se for dono
      data: { modelo, placa }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Erro' });
    res.json({ sucesso: true });
  } catch (error) {
    res.status(400).json({ erro: 'Erro ao atualizar' });
  }
});

app.delete('/carros/:id', autenticar, async (req, res) => {
  try {
    const resultado = await prisma.carro.deleteMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Erro' });
    res.sendStatus(200);
  } catch (error) {
    res.status(400).json({ erro: 'Erro ao excluir' });
  }
});

// --- ENTREGAS ---

app.get('/entregas', autenticar, async (req, res) => {
  const entregas = await prisma.entrega.findMany({
    where: { usuarioId: req.user.id }, // <--- ISOLAMENTO TOTAL
    include: { motorista: true, carro: true },
    orderBy: { dataRecebimento: 'desc' }
  });
  res.json(entregas);
});

app.post('/entregas', autenticar, async (req, res) => {
  try {
    const dados = req.body;
    const entrega = await prisma.entrega.create({
      data: {
        nomeRota: dados.nomeRota || "Rota Padrão",
        dataRecebimento: new Date(dados.dataRecebimento), 
        dataEntrega: new Date(dados.dataEntrega), 
        valorEntrega: parseFloat(dados.valorEntrega),
        valorPedagio: parseFloat(dados.valorPedagio || 0),
        valorAbastecimento: parseFloat(dados.valorAbastecimento || 0),
        outrosGastos: parseFloat(dados.outrosGastos || 0),
        motoristaId: parseInt(dados.motoristaId),
        carroId: parseInt(dados.carroId),
        usuarioId: req.user.id // <--- VINCULA AO USUÁRIO LOGADO
      }
    });
    res.json(entrega);
  } catch (error) {
    console.log(error);
    res.status(500).json({ erro: 'Erro ao lançar entrega' });
  }
});

app.put('/entregas/:id', autenticar, async (req, res) => {
  try {
    const dados = req.body;
    const resultado = await prisma.entrega.updateMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id }, // Segurança
      data: {
        nomeRota: dados.nomeRota,
        dataRecebimento: new Date(dados.dataRecebimento),
        dataEntrega: new Date(dados.dataEntrega),
        valorEntrega: parseFloat(dados.valorEntrega),
        valorPedagio: parseFloat(dados.valorPedagio),
        valorAbastecimento: parseFloat(dados.valorAbastecimento),
        outrosGastos: parseFloat(dados.outrosGastos),
        motoristaId: parseInt(dados.motoristaId),
        carroId: parseInt(dados.carroId)
      }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Erro' });
    res.json({ sucesso: true });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar' });
  }
});

app.delete('/entregas/:id', autenticar, async (req, res) => {
  try {
    const resultado = await prisma.entrega.deleteMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Erro' });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao excluir' });
  }
});

// --- MANUTENÇÕES (NOVO) ---

// Listar manutenções de um carro específico
app.get('/carros/:id/manutencoes', autenticar, async (req, res) => {
  try {
    const manutencoes = await prisma.manutencao.findMany({
      where: { 
        carroId: parseInt(req.params.id),
        usuarioId: req.user.id 
      },
      orderBy: { data: 'desc' }
    });
    res.json(manutencoes);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar manutenções' });
  }
});

// Cadastrar nova manutenção
app.post('/manutencoes', autenticar, async (req, res) => {
  try {
    const { titulo, observacao, valor, data, carroId } = req.body;
    
    const nova = await prisma.manutencao.create({
      data: {
        titulo,
        observacao,
        valor: parseFloat(valor),
        data: new Date(data),
        carroId: parseInt(carroId),
        usuarioId: req.user.id
      }
    });
    res.json(nova);
  } catch (error) {
    console.log(error);
    res.status(500).json({ erro: 'Erro ao criar manutenção' });
  }
});

// Excluir manutenção
app.delete('/manutencoes/:id', autenticar, async (req, res) => {
  try {
    const resultado = await prisma.manutencao.deleteMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Erro' });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao excluir' });
  }
});


// Rota para buscar TODAS as manutenções (Para o Dashboard)
app.get('/manutencoes', autenticar, async (req, res) => {
  try {
    const manutencoes = await prisma.manutencao.findMany({
      where: { usuarioId: req.user.id }, // Pega tudo do usuário
      orderBy: { data: 'desc' }
    });
    res.json(manutencoes);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar manutenções' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Seguro rodando em http://localhost:${PORT}`);
});