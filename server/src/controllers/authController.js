const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- CONFIGURAÇÃO DA CHAVE SECRETA ---
const SECRET = process.env.JWT_SECRET || 'chave-mestra-do-sistema-logistica';

// --- CONFIGURAR O CARTEIRO (Versão Final: Porta 587 + IPv4) ---
// O Render bloqueia a porta 465, então usamos a 587 (STARTTLS).
// Mantemos 'family: 4' para garantir que ele ache o IP certo do Google.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,        // Porta padrão para envio em nuvem
  secure: false,    // OBRIGATÓRIO ser false para porta 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  family: 4,        // Força IPv4 (Resolve erro de DNS/Rede)
  tls: {
    rejectUnauthorized: false // Evita erros de certificado SSL no Render
  },
  connectionTimeout: 10000, // Timeout de 10 segundos
  logger: true,     // Logs para debug
  debug: true
});

exports.registro = async (req, res) => {
    let { nome, email, cpf, username, senha } = req.body;
    
    // Validação básica
    if (!email || !username || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    email = email.trim().toLowerCase();
    username = username.trim().toLowerCase();

    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        
        await prisma.usuario.create({
            data: { nome, email, cpf, username, senha: hashedPassword },
        });
        
        res.status(201).json({ message: 'Usuário criado com sucesso!' });

    } catch (error) {
        console.error("🚨 ERRO DETALHADO NO REGISTRO:", error);

        if (error.code === 'P2002') {
            const campo = error.meta?.target || 'dados';
            return res.status(400).json({ erro: `Já existe um usuário com este ${campo}.` });
        }
        
        res.status(500).json({ erro: 'Erro interno ao criar usuário.' });
    }
};

exports.login = async (req, res) => {
    let { username, senha } = req.body;

    try {
        const usernameBusca = username ? username.trim().toLowerCase() : '';

        const user = await prisma.usuario.findUnique({ where: { username: usernameBusca } });
        if (!user) return res.status(401).json({ erro: 'Usuário não encontrado' });

        const isValid = await bcrypt.compare(senha, user.senha);
        if (!isValid) return res.status(401).json({ erro: 'Senha incorreta' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
        
        res.json({ token, username: user.username, nome: user.nome });
    } catch (error) {
        console.error("Erro no Login:", error);
        res.status(500).json({ erro: 'Erro no servidor ao tentar logar.' });
    }
};

exports.esqueciSenha = async (req, res) => {
    let { email } = req.body;

    try {
        email = email ? email.trim().toLowerCase() : '';

        const user = await prisma.usuario.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ erro: 'Email não encontrado.' });

        const token = Math.floor(100000 + Math.random() * 900000).toString();
        
        const agora = new Date();
        agora.setHours(agora.getHours() + 1);

        await prisma.usuario.update({
            where: { id: user.id },
            data: { resetToken: token, resetTokenExp: agora }
        });

        const mailOptions = {
            from: 'Sistema Logística <noreply@logistica.com>',
            to: email,
            subject: 'Recuperação de Senha - Código de Verificação',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Recuperação de Senha</h2>
                    <p>Olá, <strong>${user.nome}</strong>!</p>
                    <p>Use o código abaixo para redefinir sua senha:</p>
                    <h1 style="color: #2563eb; letter-spacing: 5px; background: #f0f0f0; padding: 10px; display: inline-block;">${token}</h1>
                    <p>Este código expira em 1 hora.</p>
                    <hr>
                    <p style="font-size: 12px; color: #777;">Se não foi você, ignore este email.</p>
                </div>
            `
        };

        console.log(`Tentando enviar email para ${email}...`);
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`✅ Email enviado! ID: ${info.messageId}`);
        res.json({ message: 'Email de recuperação enviado!' });

    } catch (error) {
        console.error("🚨 ERRO NO ENVIO DE EMAIL:", error);
        res.status(500).json({ erro: 'Erro técnico ao enviar email. Tente novamente mais tarde.' });
    }
};

exports.resetarSenha = async (req, res) => {
    const { token, novaSenha } = req.body;
    try {
        const user = await prisma.usuario.findFirst({
            where: {
                resetToken: token,
                resetTokenExp: { gt: new Date() }
            }
        });

        if (!user) return res.status(400).json({ erro: 'Código inválido ou expirado.' });

        const hashedPassword = await bcrypt.hash(novaSenha, 10);

        await prisma.usuario.update({
            where: { id: user.id },
            data: { senha: hashedPassword, resetToken: null, resetTokenExp: null }
        });

        res.json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error("Erro ao resetar senha:", error);
        res.status(500).json({ erro: 'Erro ao redefinir senha.' });
    }
};