const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- CONFIGURAÇÃO DA CHAVE SECRETA (PADRONIZADA) ---
// Agora é a mesma chave usada no routes.js
const SECRET = process.env.JWT_SECRET || 'chave-mestra-do-sistema-logistica';

// --- CONFIGURAR O CARTEIRO (TRANSPORTER) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.registro = async (req, res) => {
    const { nome, email, cpf, username, senha } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        await prisma.usuario.create({
            data: { nome, email, cpf, username, senha: hashedPassword },
        });
        res.status(201).json({ message: 'Usuário criado!' });
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ erro: 'Usuário ou Email já existe.' });
        res.status(400).json({ erro: 'Erro ao criar usuário' });
    }
};

exports.login = async (req, res) => {
    const { username, senha } = req.body;
    try {
        const user = await prisma.usuario.findUnique({ where: { username } });
        if (!user) return res.status(401).json({ erro: 'Usuário não encontrado' });

        const isValid = await bcrypt.compare(senha, user.senha);
        if (!isValid) return res.status(401).json({ erro: 'Senha incorreta' });

        // --- ATENÇÃO: Token agora dura 7 dias ('7d') ---
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
        
        res.json({ token, username: user.username, nome: user.nome });
    } catch (error) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
};

exports.esqueciSenha = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await prisma.usuario.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ erro: 'Email não encontrado.' });

        // Token de 6 dígitos
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
            subject: 'Recuperação de Senha - Sistema Logística',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Recuperação de Senha</h2>
                    <p>Olá, <strong>${user.nome}</strong>!</p>
                    <p>Você solicitou a troca de senha.</p>
                    <p>Seu código de verificação é:</p>
                    <h1 style="color: #2563eb; letter-spacing: 5px;">${token}</h1>
                    <p>Este código expira em 1 hora.</p>
                    <hr>
                    <p style="font-size: 12px; color: #777;">Se não foi você, ignore este email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email enviado para ${email}`);
        res.json({ message: 'Email de recuperação enviado!' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ erro: 'Erro ao enviar email.' });
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
        res.status(500).json({ erro: 'Erro ao redefinir senha.' });
    }
};