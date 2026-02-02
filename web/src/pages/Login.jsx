import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [modo, setModo] = useState('login'); 
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    username: '',
    senha: '',
    token: '',
    novaSenha: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    let endpoint = '';
    let body = {};

    if (modo === 'login') {
        endpoint = '/auth/login';
        body = { username: form.username, senha: form.senha };
    } else if (modo === 'cadastro') {
        endpoint = '/auth/registro';
        body = { 
            nome: form.nome, 
            email: form.email, 
            cpf: form.cpf, 
            username: form.username, 
            senha: form.senha 
        };
    } else if (modo === 'recuperacao') {
        endpoint = '/auth/esqueci-senha';
        body = { email: form.email };
    } else if (modo === 'reset') {
        endpoint = '/auth/resetar-senha';
        body = { token: form.token, novaSenha: form.novaSenha };
    }

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.erro || 'Erro na requisição');

      if (modo === 'login') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', data.nome);
        navigate('/');
        window.location.reload();
      } else if (modo === 'cadastro') {
        setSucesso('Conta criada! Faça login.');
        setModo('login');
      } else if (modo === 'recuperacao') {
        setSucesso('Se o email existir, enviamos um código (Verifique o console do backend).');
        setModo('reset'); 
      } else if (modo === 'reset') {
        setSucesso('Senha redefinida! Agora faça login.');
        setModo('login');
      }

    } catch (err) {
      setErro(err.message);
    }
  };

  const getTitulo = () => {
    if(modo === 'login') return '🔒 Acesso ao Sistema';
    if(modo === 'cadastro') return '📝 Novo Cadastro';
    if(modo === 'recuperacao') return '🔑 Recuperar Senha';
    if(modo === 'reset') return '🔄 Criar Nova Senha';
  }

  // --- ÍCONES SVG (Profissionais e Limpos) ---
  const IconeOlhoAberto = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#64748b'}}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const IconeOlhoFechado = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#64748b'}}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );

  const renderPasswordInput = (name, placeholder = "Senha") => (
    <div className="form-group">
        <label>{placeholder}</label>
        <div style={styles.inputWrapper}>
          <input 
            type={mostrarSenha ? "text" : "password"} 
            name={name} 
            value={form[name]} 
            onChange={handleChange} 
            required 
            style={styles.inputWithIcon} // Estilo especial com espaço na direita
          />
          <button 
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            style={styles.btnEye}
            title={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlhoAberto />}
          </button>
        </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={{textAlign: 'center', color: '#1e293b'}}>{getTitulo()}</h1>
        
        {erro && <p style={styles.erro}>{erro}</p>}
        {sucesso && <p style={styles.sucesso}>{sucesso}</p>}

        <form onSubmit={handleSubmit}>
          
          {modo === 'cadastro' && (
            <>
                <div className="form-group">
                    <label>Nome Completo</label>
                    <input name="nome" value={form.nome} onChange={handleChange} required style={styles.input} />
                </div>
                <div className="form-group">
                    <label>CPF</label>
                    <input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" style={styles.input} />
                </div>
            </>
          )}

          {(modo === 'cadastro' || modo === 'recuperacao') && (
            <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required style={styles.input} />
            </div>
          )}

          {(modo === 'login' || modo === 'cadastro') && (
             <div className="form-group">
                <label>Usuário (Login)</label>
                <input name="username" value={form.username} onChange={handleChange} required style={styles.input} />
             </div>
          )}

          {/* CAMPO DE SENHA */}
          {(modo === 'login' || modo === 'cadastro') && renderPasswordInput('senha')}

           {/* CAMPOS DE RESET */}
           {modo === 'reset' && (
            <>
                <div className="form-group">
                    <label>Código recebido (Token)</label>
                    <input name="token" value={form.token} onChange={handleChange} placeholder="Cole o código aqui" required style={styles.input} />
                </div>
                {renderPasswordInput('novaSenha', 'Nova Senha')}
            </>
          )}

          <button type="submit" style={styles.btnPrimary}>
            {modo === 'login' ? 'Entrar' : 
             modo === 'cadastro' ? 'Cadastrar' : 
             modo === 'recuperacao' ? 'Enviar Código' : 'Salvar Nova Senha'}
          </button>
        </form>

        <div style={{marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center'}}>
            {modo === 'login' && (
                <>
                    <button onClick={() => setModo('recuperacao')} style={styles.btnLinkSecundario}>Esqueci minha senha</button>
                    <button onClick={() => setModo('cadastro')} style={styles.btnLink}>Não tem conta? Cadastre-se</button>
                </>
            )}

            {(modo === 'cadastro' || modo === 'recuperacao' || modo === 'reset') && (
                <button onClick={() => setModo('login')} style={styles.btnLink}>Voltar para o Login</button>
            )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1e293b', padding: 20 },
  card: { background: 'white', padding: 40, borderRadius: 12, width: '100%', maxWidth: 450, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  erro: { color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 4, textAlign: 'center', marginBottom: 15 },
  sucesso: { color: '#15803d', background: '#dcfce7', padding: 10, borderRadius: 4, textAlign: 'center', marginBottom: 15 },
  
  // Input Padrão
  input: { width: '100%', padding: '10px', marginTop: '5px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' },
  
  // Wrapper para posicionar o ícone
  inputWrapper: { position: 'relative', width: '100%', marginBottom: '15px', marginTop: '5px' },
  
  // Input com espaço na direita para o ícone não cobrir o texto
  inputWithIcon: { width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '6px', border: '1px solid #ccc' },

  // Botão do Olho (Posicionamento Perfeito)
  btnEye: {
    position: 'absolute',
    right: '10px',
    top: '50%', // Fica no meio da altura
    transform: 'translateY(-50%)', // Puxa 50% para cima para centralizar exato
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex', // Ajuda a alinhar o SVG
    alignItems: 'center',
    padding: 0
  },

  btnPrimary: { width: '100%', padding: 12, background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginTop: 15, fontWeight: 'bold' },
  btnLink: { background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' },
  btnLinkSecundario: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }
};

export default Login;

//pwbj ojqd ukrr dkyl 