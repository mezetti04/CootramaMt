const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- CONFIGURAÇÃO DA CHAVE SECRETA ---
const SECRET = process.env.JWT_SECRET || 'chave-mestra-do-sistema-logistica';

// --- CONFIGURAR O CARTEIRO (CORREÇÃO TIMEOUT GMAIL) ---
// Adicionamos 'family: 4' para forçar IPv4 e evitar bloqueios de rede no Render
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,       // Porta SSL direta (Mais robusta para nuvem)
  secure: true,    // TRUE para porta 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  family: 4, // <--- O SEGREDO: Força IPv4 (Resolve o erro ETIMEDOUT)
  logger: true, // Ativa logs detalhados do Nodemailer no console
  debug: true   // Mostra o processo de conexão passo-a-passo
});

exports.registro = async (req, res) => {
    let { nome, email, cpf, username, senha } = req.body;
    
    // Validação básica
    if (!email || !username || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    // Normalização (Minúsculo e sem espaços nas pontas)
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

        // Token válido por 7 dias
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

        // Gera token numérico de 6 dígitos
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expira em 1 hora
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
        
        // Envio do email
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
                resetTokenExp: { gt: new Date() } // Verifica se ainda não expirou
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