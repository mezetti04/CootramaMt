import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Entregas from './pages/Entregas';
import ListaEntregas from './pages/ListaEntregas';
import Motoristas from './pages/Motoristas';
import Carros from './pages/Carros';
import Metricas from './pages/Metricas';
import Login from './pages/Login'; // <--- Importe
import RotaProtegida from './components/RotaProtegida'; // <--- Importe

function App() {
  // Verifica se está logado para mostrar a Navbar (opcional, mas fica melhor visualmente)
  const isLogado = !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      {isLogado && <Navbar />} {/* Só mostra navbar se logado */}
      
      <div className={isLogado ? "content-wrapper" : ""}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* ROTAS PROTEGIDAS */}
          <Route path="/" element={<RotaProtegida><Home /></RotaProtegida>} />
          <Route path="/entregas" element={<RotaProtegida><ListaEntregas /></RotaProtegida>} />
          <Route path="/entregas/nova" element={<RotaProtegida><Entregas /></RotaProtegida>} />
          <Route path="/motoristas" element={<RotaProtegida><Motoristas /></RotaProtegida>} />
          <Route path="/carros" element={<RotaProtegida><Carros /></RotaProtegida>} />
          <Route path="/metricas" element={<RotaProtegida><Metricas /></RotaProtegida>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;