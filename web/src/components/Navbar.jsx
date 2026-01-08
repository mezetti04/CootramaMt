import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

  return (
    <nav className="navbar">
      
      {/* 1. Logo e Botão Hambúrguer */}
      <div className="navbar-header">
        <div className="nav-brand">
          <Link to="/" onClick={fecharMenu}>🚚 COOTRAMA MOTORISTAS</Link>
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