import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      <h1>Bem-vindo ao Sistema de Logística</h1>
      <p>Selecione uma opção para começar:</p>
      
      <div className="dashboard-grid">
        
        <Link to="/entregas" className="card card-destaque">
          <h2>📦 Entregas</h2>
        </Link>

        <Link to="/motoristas" className="card card-destaque">
          <h2>👷 Motoristas</h2>
        </Link>

        <Link to="/carros" className="card card-destaque">
          <h2>🚛  Veículos</h2>

        </Link>

        <Link to="/metricas" className="card card-destaque">
          <h2>📈 Consultar Desempenho</h2>
        </Link>
      </div>
    </div>
  );
}

export default Home;