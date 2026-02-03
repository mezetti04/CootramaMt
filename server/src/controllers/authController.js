const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- CONFIGURAÇÕES ---
const SECRET = process.env.JWT_SECRET || 'chave-mestra-do-sistema-logistica';

// Função auxiliar para enviar e-mail via Brevo API (Porta 443 - Anti-Bloqueio)
async function enviarEmailBrevo(para, assunto, html) {
    const url = 'https://api.brevo.com/v3/smtp/email';
    const options = {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY, // Pega do Render
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: { 
                name: 'Sistema Logística', 
                email: process.env.EMAIL_REMETENTE // O e-mail que você validou na Brevo
            },
            to: [{ email: para }],
            subject: assunto,
            htmlContent: html
        })
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const erro = await response.json();
            console.error('Erro Brevo:', erro);
            throw new Error('Falha ao enviar e-mail');
        }
        return true;
    } catch (error) {
        console.error('Erro técnico no envio:', error);
        return false;
    }
}

exports.registro = async (req, res) => {
    let { nome, email, cpf, username, senha } = req.body;
    
    if (!email || !username || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });

    email = email.trim().toLowerCase();
    username = username.trim().toLowerCase();

    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        await prisma.usuario.create({
            data: { nome, email, cpf, username, senha: hashedPassword },
        });
        res.status(201).json({ message: 'Usuário criado com sucesso!' });
    } catch (error) {
        console.error("Erro Registro:", error);
        if (error.code === 'P2002') {
            const campo = error.meta?.target || 'dados';
            return res.status(400).json({ erro: `Já existe um cadastro com este ${campo}.` });
        }
        res.status(500).json({ erro: 'Erro ao criar usuário.' });
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
        res.status(500).json({ erro: 'Erro no login.' });
    }
};

exports.esqueciSenha = async (req, res) => {
    let { email } = req.body;

    try {
        email = email ? email.trim().toLowerCase() : '';
        const user = await prisma.usuario.findUnique({ where: { email } });
        
        if (!user) return res.status(404).json({ erro: 'Email não encontrado.' });

        // Gera token
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const agora = new Date();
        agora.setHours(agora.getHours() + 1);

        await prisma.usuario.update({
            where: { id: user.id },
            data: { resetToken: token, resetTokenExp: agora }
        });

        // --- ENVIO PROFISSIONAL ---
        const htmlEmail = `
            <div style="font-family: Arial, color: #333;">
                <h2>Recuperação de Senha</h2>
                <p>Olá, <strong>${user.nome}</strong>.</p>
                <p>Seu código é:</p>
                <h1 style="color: #007bff; letter-spacing: 5px;">${token}</h1>
                <p>Válido por 1 hora.</p>
            </div>
        `;

        const enviado = await enviarEmailBrevo(email, 'Código de Recuperação', htmlEmail);

        if (enviado) {
            console.log(`✅ Email enviado para ${email} via Brevo.`);
            res.json({ message: 'Email enviado com sucesso!' });
        } else {
            res.status(500).json({ erro: 'Erro ao enviar e-mail. Tente novamente.' });
        }

    } catch (error) {
        console.error("Erro Geral:", error);
        res.status(500).json({ erro: 'Erro técnico no servidor.' });
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

        res.json({ message: 'Senha alterada!' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao redefinir senha.' });
    }
};