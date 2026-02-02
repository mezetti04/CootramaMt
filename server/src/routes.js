const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const authController = require('./controllers/authController');

const prisma = new PrismaClient();

// --- CONFIGURAÇÃO DA CHAVE SECRETA (PADRONIZADA) ---
// Tem que ser IDÊNTICA à do authController.js
const SECRET_KEY = process.env.JWT_SECRET || 'chave-mestra-do-sistema-logistica';

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const autenticar = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ erro: 'Acesso negado.' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ erro: 'Token inválido.' });
    req.user = user; 
    next();
  });
};

// ================= ROTAS DE AUTENTICAÇÃO =================
router.post('/auth/registro', authController.registro);
router.post('/auth/login', authController.login);
router.post('/auth/esqueci-senha', authController.esqueciSenha);
router.post('/auth/resetar-senha', authController.resetarSenha);


// ================= ROTAS DE DADOS =================

// --- MOTORISTAS ---
router.get('/motoristas', autenticar, async (req, res) => {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999);

    const motoristas = await prisma.motorista.findMany({
      where: { usuarioId: req.user.id },
      include: {
        _count: {
          select: { entregas: { where: { dataEntrega: { gte: inicioMes, lte: fimMes } } } }
        }
      }
    });

    const formatados = motoristas.map(m => ({ ...m, totalViagensMes: m._count.entregas }));
    res.json(formatados);
  } catch (error) { res.status(500).json({ erro: 'Erro ao buscar' }); }
});

router.post('/motoristas', autenticar, async (req, res) => {
  try {
    const novo = await prisma.motorista.create({
      data: { nome: req.body.nome, usuarioId: req.user.id }
    });
    res.json(novo);
  } catch (error) { res.status(500).json({ erro: 'Erro ao criar' }); }
});

// [PUT] Rota de Edição de Motorista
router.put('/motoristas/:id', autenticar, async (req, res) => {
  try {
    const resultado = await prisma.motorista.updateMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id },
      data: { nome: req.body.nome }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Não autorizado ou não encontrado' });
    res.json({ sucesso: true });
  } catch (error) { res.status(500).json({ erro: 'Erro ao atualizar' }); }
});

router.delete('/motoristas/:id', autenticar, async (req, res) => {
    try {
        await prisma.motorista.deleteMany({ where: { id: parseInt(req.params.id), usuarioId: req.user.id } });
        res.sendStatus(200);
    } catch (error) { res.status(400).json({ erro: 'Erro ao excluir' }); }
});

// --- CARROS ---
router.get('/carros', autenticar, async (req, res) => {
  const carros = await prisma.carro.findMany({ where: { usuarioId: req.user.id } });
  res.json(carros);
});

router.post('/carros', autenticar, async (req, res) => {
  try {
    const novo = await prisma.carro.create({
      data: { modelo: req.body.modelo, placa: req.body.placa, usuarioId: req.user.id }
    });
    res.json(novo);
  } catch (error) { res.status(400).json({ erro: 'Erro ao criar' }); }
});

// [PUT] Rota de Edição de Carro
router.put('/carros/:id', autenticar, async (req, res) => {
  try {
    const { modelo, placa } = req.body;
    const resultado = await prisma.carro.updateMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id },
      data: { modelo, placa }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Erro' });
    res.json({ sucesso: true });
  } catch (error) { res.status(400).json({ erro: 'Erro ao atualizar' }); }
});

router.delete('/carros/:id', autenticar, async (req, res) => {
    try {
        await prisma.carro.deleteMany({ where: { id: parseInt(req.params.id), usuarioId: req.user.id } });
        res.sendStatus(200);
    } catch (error) { res.status(400).json({ erro: 'Erro ao excluir' }); }
});

// --- ENTREGAS ---
router.get('/entregas', autenticar, async (req, res) => {
  const entregas = await prisma.entrega.findMany({
    where: { usuarioId: req.user.id },
    include: { motorista: true, carro: true },
    orderBy: { dataRecebimento: 'desc' }
  });
  res.json(entregas);
});

router.post('/entregas', autenticar, async (req, res) => {
  try {
    const dados = req.body;
    const entrega = await prisma.entrega.create({
      data: {
        nomeRota: dados.nomeRota || "Rota Padrão",
        dataRecebimento: dados.dataRecebimento ? new Date(dados.dataRecebimento) : null, 
        dataEntrega: new Date(dados.dataEntrega), 
        valorEntrega: parseFloat(dados.valorEntrega),
        valorPedagio: parseFloat(dados.valorPedagio || 0),
        valorAbastecimento: parseFloat(dados.valorAbastecimento || 0),
        valorDiaria: parseFloat(dados.valorDiaria || 0), // <--- CAMPO IMPORTANTE
        outrosGastos: parseFloat(dados.outrosGastos || 0),
        motoristaId: parseInt(dados.motoristaId),
        carroId: parseInt(dados.carroId),
        usuarioId: req.user.id
      }
    });
    res.json(entrega);
  } catch (error) { res.status(500).json({ erro: 'Erro ao lançar entrega' }); }
});

// [PUT] Rota de Edição de Entrega
router.put('/entregas/:id', autenticar, async (req, res) => {
  try {
    const dados = req.body;
    const resultado = await prisma.entrega.updateMany({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id },
      data: {
        nomeRota: dados.nomeRota,
        dataRecebimento: dados.dataRecebimento ? new Date(dados.dataRecebimento) : null,
        dataEntrega: new Date(dados.dataEntrega),
        valorEntrega: parseFloat(dados.valorEntrega),
        valorPedagio: parseFloat(dados.valorPedagio || 0),
        valorAbastecimento: parseFloat(dados.valorAbastecimento || 0),
        valorDiaria: parseFloat(dados.valorDiaria || 0), // <--- CAMPO IMPORTANTE NA EDIÇÃO
        outrosGastos: parseFloat(dados.outrosGastos || 0),
        motoristaId: parseInt(dados.motoristaId),
        carroId: parseInt(dados.carroId)
      }
    });
    if (resultado.count === 0) return res.status(403).json({ erro: 'Erro' });
    res.json({ sucesso: true });
  } catch (error) { res.status(500).json({ erro: 'Erro ao atualizar' }); }
});

router.delete('/entregas/:id', autenticar, async (req, res) => {
    try {
        await prisma.entrega.deleteMany({ where: { id: parseInt(req.params.id), usuarioId: req.user.id } });
        res.sendStatus(200);
    } catch (error) { res.status(500).json({ erro: 'Erro ao excluir' }); }
});

// --- MANUTENÇÕES ---
router.get('/manutencoes', autenticar, async (req, res) => {
    const manutencoes = await prisma.manutencao.findMany({ where: { usuarioId: req.user.id }, orderBy: { data: 'desc' } });
    res.json(manutencoes);
});

router.get('/carros/:id/manutencoes', autenticar, async (req, res) => {
  try {
    const manutencoes = await prisma.manutencao.findMany({
      where: { 
        carroId: parseInt(req.params.id),
        usuarioId: req.user.id 
      },
      orderBy: { data: 'desc' }
    });
    res.json(manutencoes);
  } catch (error) { res.status(500).json({ erro: 'Erro ao buscar' }); }
});

router.post('/manutencoes', autenticar, async (req, res) => {
  try {
    const { titulo, observacao, valor, data, carroId } = req.body;
    const nova = await prisma.manutencao.create({
      data: {
        titulo, observacao, valor: parseFloat(valor), data: new Date(data),
        carroId: parseInt(carroId), usuarioId: req.user.id
      }
    });
    res.json(nova);
  } catch (error) { res.status(500).json({ erro: 'Erro ao criar' }); }
});

router.delete('/manutencoes/:id', autenticar, async (req, res) => {
    try {
        await prisma.manutencao.deleteMany({ where: { id: parseInt(req.params.id), usuarioId: req.user.id } });
        res.sendStatus(200);
    } catch (error) { res.status(500).json({ erro: 'Erro ao excluir' }); }
});

module.exports = router;