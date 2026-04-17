import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Entregas() {
  const navigate = useNavigate();
  const [motoristas, setMotoristas] = useState([]);
  const [carros, setCarros] = useState([]);

  // 1. URL DINÂMICA
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [formulario, setFormulario] = useState({
    nomeRota: '',
    motoristaId: '',
    carroId: '',
    dataEntrega: '',
    dataRecebimento: '', // <--- 1. NOVO CAMPO ADICIONADO AO ESTADO
    valorEntrega: '',
    valorPedagio: '',
    valorAbastecimento: '',
    valorDiaria: '', 
    outrosGastos: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch(`${API_URL}/motoristas`, { headers })
      .then(res => res.json()).then(setMotoristas).catch(console.error);

    fetch(`${API_URL}/carros`, { headers })
      .then(res => res.json()).then(setCarros).catch(console.error);
  }, []);

  const handleChange = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const dadosParaEnviar = { 
        ...formulario, 
        // 2. SE ESTIVER VAZIO MANDA NULL, SE ESTIVER PREENCHIDO MANDA A DATA
        dataRecebimento: formulario.dataRecebimento ? formulario.dataRecebimento : null,
        valorDiaria: parseFloat(formulario.valorDiaria || 0) 
    };

    fetch(`${API_URL}/entregas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(dadosParaEnviar)
    })
    .then(res => {
      if (res.ok) {
        alert('Entrega cadastrada com sucesso!');
        navigate('/entregas'); 
      } else {
        alert('Erro ao cadastrar.');
      }
    });
  };

  return (
    <div className="container" style={{maxWidth: '800px'}}>
      <div className="page-header">
        <h1>Nova Entrega</h1>
        <button type="button" onClick={() => navigate('/entregas')} className="btn-cancelar" style={{width: 'auto', marginTop: 0}}>
          Voltar
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <h3 style={{marginTop: 0, color: '#2563eb'}}>Dados da Viagem</h3>
        
        <div className="form-group">
          <label>Numero da Rota / Cidade Principal</label>
          <input type="text" name="nomeRota" placeholder="Ex: 11111 - Pouso Alegre" value={formulario.nomeRota} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Data do Acerto</label>
          <input type="date" name="dataEntrega" value={formulario.dataEntrega} onChange={handleChange} required />
        </div>

        {/* 3. NOVO CAMPO VISUAL ADICIONADO AQUI */}
        <div className="form-group">
          <label style={{color: '#059669'}}>Data do Pagamento (Opcional)</label>
          <input type="date" name="dataRecebimento" value={formulario.dataRecebimento} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Motorista</label>
          <select name="motoristaId" value={formulario.motoristaId} onChange={handleChange} required>
            <option value="">Selecione...</option>
            {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Veículo Utilizado</label>
          <select name="carroId" value={formulario.carroId} onChange={handleChange} required>
            <option value="">Selecione...</option>
            {carros.map(c => <option key={c.id} value={c.id}>{c.modelo} - {c.placa}</option>)}
          </select>
        </div>

        <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

        <h3 style={{color: '#2563eb'}}>Financeiro</h3>

        <div className="form-group">
          <label style={{color: 'green', fontWeight: 'bold'}}>💰 Valor Bruto da Entrega (R$)</label>
          <input type="number" step="0.01" name="valorEntrega" value={formulario.valorEntrega} onChange={handleChange} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label style={{color: '#dc2626'}}>⛽ Abastecimento (R$)</label>
              <input type="number" step="0.01" name="valorAbastecimento" value={formulario.valorAbastecimento} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label style={{color: '#dc2626'}}>🚧 Pedágios (R$)</label>
              <input type="number" step="0.01" name="valorPedagio" value={formulario.valorPedagio} onChange={handleChange} />
            </div>
        </div>

        <div className="form-group">
           <label style={{color: '#dc2626'}}>👨‍✈️ Diária Motorista (R$)</label>
           <input type="number" step="0.01" name="valorDiaria" value={formulario.valorDiaria} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label style={{color: 'orange'}}>💸 Outros Gastos (R$)</label>
          <input type="number" step="0.01" name="outrosGastos" placeholder="Manutenção, etc..." value={formulario.outrosGastos} onChange={handleChange} />
        </div>

        <button type="submit" className="btn-salvar" style={{marginTop: 20}}>Salvar Lançamento</button>
      </form>
    </div>
  );
}

export default Entregas;