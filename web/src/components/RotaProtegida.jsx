import { Navigate } from 'react-router-dom';

function RotaProtegida({ children }) {
  const token = localStorage.getItem('token');

  // Se não tem token, manda para o Login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // Se tem token, mostra a página que ele queria ver
  return children;
}

export default RotaProtegida;