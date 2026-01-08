import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  
  // 1. URL DINÂMICA (Fundamental para o deploy funcionar)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [isLogin, setIsLogin] = useState(true); 
  const [form, setForm] = useState({ username: '', senha: '' });
  const [erro, setErro] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const endpoint = isLogin ? '/auth/login' : '/auth/registro';

    try {
      // 2. FETCH ATUALIZADO
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.erro || 'Erro na requisição');

      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', data.username);
        navigate('/');
        window.location.reload(); 
      } else {
        alert('Conta criada! Agora faça login.');
        setIsLogin(true); 
      }

    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>{isLogin ? '🔒 Acesso Restrito' : '📝 Criar Conta'}</h1>
        
        {erro && <p style={styles.erro}>{erro}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuário</label>
            <input name="username" value={form.username} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" name="senha" value={form.senha} onChange={handleChange} required />
          </div>

          <button type="submit" style={styles.btnPrimary}>
            {isLogin ? 'Entrar no Sistema' : 'Cadastrar'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)} 
          style={styles.btnLink}
        >
          {isLogin ? 'Não tem conta? Crie uma aqui' : 'Já tem conta? Fazer Login'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1e293b' },
  card: { background: 'white', padding: 40, borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  erro: { color: 'red', background: '#fee2e2', padding: 10, borderRadius: 4, textAlign: 'center' },
  btnPrimary: { width: '100%', padding: 12, background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginTop: 10 },
  btnLink: { background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', width: '100%', marginTop: 15 }
};

export default Login;