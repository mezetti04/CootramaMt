const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- CONFIGURAÇÃO DA CHAVE SECRETA (PADRONIZADA) ---
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
    // Melhoria: Remove espaços em branco e força minúsculo para evitar erros de digitação
    let { nome, email, cpf, username, senha } = req.body;
    
    // Tratamento básico para evitar crash se vier nulo
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
        // --- O PULO DO GATO PARA O RENDER ---
        // Isso vai imprimir o erro real no painel de logs do Render
        console.error("🚨 ERRO DETALHADO NO REGISTRO:", error);

        // Erro P2002 = Violação de campo único (já existe no banco)
        if (error.code === 'P2002') {
            const campo = error.meta?.target || 'dados';
            return res.status(400).json({ erro: `Já existe um usuário com este ${campo}.` });
        }
        
        // Outros erros (ex: banco desconectado, coluna faltando)
        res.status(500).json({ erro: 'Erro interno ao criar usuário. Verifique os logs.' });
    }
};

exports.login = async (req, res) => {
    let { username, senha } = req.body;

    try {
        // Normaliza o username para garantir que ache mesmo se digitar com maiúscula
        const usernameBusca = username ? username.trim().toLowerCase() : '';

        const user = await prisma.usuario.findUnique({ where: { username: usernameBusca } });
        if (!user) return res.status(401).json({ erro: 'Usuário não encontrado' });

        const isValid = await bcrypt.compare(senha, user.senha);
        if (!isValid) return res.status(401).json({ erro: 'Senha incorreta' });

        // Token dura 7 dias
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
        console.error("Erro no envio de email:", error);
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
        console.error("Erro ao resetar senha:", error);
        res.status(500).json({ erro: 'Erro ao redefinir senha.' });
    }
};