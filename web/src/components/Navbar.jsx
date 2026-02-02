import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png'; // <--- 1. IMPORTANTE: O caminho da imagem

function Navbar() {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload();
  };

  const fecharMenu = () => setMenuAberto(false);

  // Estilo para alinhar Logo + Texto
  const brandStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px', // Espaço entre a logo e o texto
    textDecoration: 'none',
    color: 'inherit'
  };

  // Estilo da imagem
  const logoStyle = {
    height: '40px', // Altura fixa para não estourar a barra
    width: 'auto',
    borderRadius: '4px' // Opcional: deixa os cantos da logo arredondados
  };

  return (
    <nav className="navbar">
      
      {/* 1. Logo e Botão Hambúrguer */}
      <div className="navbar-header">
        <div className="nav-brand">
          {/* Alterado para incluir a imagem */}
          <Link to="/" onClick={fecharMenu} style={brandStyle}>
            <img src={logo} alt="Logo Cootrama" style={logoStyle} />
            <span>COOTRAMA MOTORISTAS</span>
          </Link>
        </div>
        
        {/* Botão que só aparece no celular */}
        <button className="mobile-btn" onClick={() => setMenuAberto(!menuAberto)}>
          {menuAberto ? '✖' : '☰'}
        </button>
      </div>

      {/* 2. Links para DESKTOP (Somem no celular) */}
      <div className="desktop-links">
        <Link to="/entregas">Entregas</Link> 
        <Link to="/motoristas">Motoristas</Link>
        <Link to="/carros">Carros</Link>
        <Link to="/metricas">Métricas</Link>
        <button onClick={handleLogout} className="btn-sair">Sair 🚪</button>
      </div>

      {/* 3. Menu para MOBILE (Aparece ao clicar) */}
      {menuAberto && (
        <div className="mobile-menu">
          <Link to="/entregas" onClick={fecharMenu}>Entregas</Link> 
          <Link to="/motoristas" onClick={fecharMenu}>Motoristas</Link>
          <Link to="/carros" onClick={fecharMenu}>Carros</Link>
          <Link to="/metricas" onClick={fecharMenu}>Métricas</Link>
          <hr className="mobile-divider"/>
          <button onClick={handleLogout} className="btn-sair-mobile">Sair do Sistema</button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;