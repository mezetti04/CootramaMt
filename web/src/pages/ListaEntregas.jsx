import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 

function ListaEntregas() {
  const [entregas, setEntregas] = useState([]);
  const [expandido, setExpandido] = useState(null);
  
  // 1. URL DINÂMICA
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Controle de Edição e Pagamento
  const [editandoId, setEditandoId] = useState(null);
  const [formEdit, setFormEdit] = useState({});
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);
  const [entregaPagamento, setEntregaPagamento] = useState(null);
  const [dataPagamentoInput, setDataPagamentoInput] = useState('');

  // Listas auxiliares
  const [motoristas, setMotoristas] = useState([]);
  const [carros, setCarros] = useState([]);

  useEffect(() => {
    carregarEntregas();
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // 2. FETCH COM URL VARIÁVEL
    fetch(`${API_URL}/motoristas`, { headers }).then(res => res.json()).then(setMotoristas);
    fetch(`${API_URL}/carros`, { headers }).then(res => res.json()).then(setCarros);
  }, []);

  const carregarEntregas = () => {
    const token = localStorage.getItem('token');
    // 3. FETCH COM URL VARIÁVEL
    fetch(`${API_URL}/entregas`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const listaOrdenada = data.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));
        setEntregas(listaOrdenada);
      });
  };

  const formatMoney = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  
  const formatDate = (dataISO) => {
    if (!dataISO) return '---';
    const data = new Date(dataISO);
    if (isNaN(data.getTime()) || data.getUTCFullYear() === 1970) return '---';
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  
  const formatForInput = (dataISO) => {
    if(!dataISO) return '';
    const data = new Date(dataISO);
    if(data.getUTCFullYear() === 1970) return '';
    return dataISO.split('T')[0];
  }

  const toggleLinha = (id) => {
    if (editandoId === id) return;
    setExpandido(expandido === id ? null : id);
  };

  const handleExcluir = async (id, e) => {
    e.stopPropagation();
    if (confirm('Tem certeza?')) {
      const token = localStorage.getItem('token');
      // 4. FETCH DELETE COM URL VARIÁVEL
      await fetch(`${API_URL}/entregas/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      carregarEntregas();
    }
  };

  // PAGAMENTO
  const abrirModalPagamento = (entrega, e) => {
    e.stopPropagation();
    setEntregaPagamento(entrega);
    setDataPagamentoInput(formatForInput(entrega.dataRecebimento));
    setModalPagamentoOpen(true);
  };

  const salvarPagamento = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const dadosAtualizados = { ...entregaPagamento, dataRecebimento: dataPagamentoInput ? new Date(dataPagamentoInput) : null };
    
    // 5. FETCH PAGAMENTO COM URL VARIÁVEL
    await fetch(`${API_URL}/entregas/${entregaPagamento.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(dadosAtualizados)
    });
    setModalPagamentoOpen(false);
    carregarEntregas();
  };

  // EDIÇÃO
  const iniciarEdicao = (entrega, e) => {
    e.stopPropagation();
    setEditandoId(entrega.id);
    setExpandido(entrega.id);
    setFormEdit({
        ...entrega,
        dataRecebimento: formatForInput(entrega.dataRecebimento),
        dataEntrega: formatForInput(entrega.dataEntrega),
        motoristaId: entrega.motoristaId,
        carroId: entrega.carroId
    });
  };

  const cancelarEdicao = () => { setEditandoId(null); setFormEdit({}); };

  const handleSaveFull = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // 6. FETCH EDIÇÃO COM URL VARIÁVEL
    await fetch(`${API_URL}/entregas/${editandoId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(formEdit)
    });
    setEditandoId(null);
    carregarEntregas();
  };

  const handleEditChange = (e) => { setFormEdit({ ...formEdit, [e.target.name]: e.target.value }); };

  const getStatusPagamento = (dataISO) => {
    if (!dataISO) return { texto: 'Pendente', cor: '#eab308' };
    const data = new Date(dataISO);
    if (data.getUTCFullYear() === 1970) return { texto: 'Pendente', cor: '#eab308' };
    return { texto: formatDate(dataISO), cor: 'inherit' };
  };

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <h1>📦 Gerenciar Entregas</h1>
        <Link to="/entregas/nova" className="btn-novo">+ Nova Entrega</Link>
      </div>
      
      <div className="lista-entregas">
        <div className="lista-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 120px', gap: '10px', alignItems: 'center' }}>
          <span>Data Entrega</span>
          <span>Rota</span>
          <span>Motorista</span>
          <span style={{textAlign: 'right', paddingRight: '15px'}}>Lucro Líquido</span>
          <span style={{textAlign: 'center'}}>Ações</span>
        </div>

        {entregas.map((entrega) => {
          // --- CÁLCULO ATUALIZADO (Incluindo Diária) ---
          const gastosTotais = (entrega.valorPedagio / 2) + entrega.valorAbastecimento + entrega.valorDiaria + entrega.outrosGastos;
          const lucroLiquido = entrega.valorEntrega - gastosTotais;
          const isEditing = editandoId === entrega.id;
          const { texto: textoPagamento, cor: corPagamento } = getStatusPagamento(entrega.dataRecebimento);

          return (
            <div key={entrega.id} className="lista-item" onClick={() => toggleLinha(entrega.id)}>
              <div className="lista-resumo" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 120px', gap: '10px', alignItems: 'center' }}>
                <span><span className="mobile-label">Entregue:</span>{formatDate(entrega.dataEntrega)}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span className="mobile-label">Rota:</span><span style={{fontWeight: 'bold'}}>{entrega.nomeRota}</span></span>
                <span><span className="mobile-label">Motorista:</span>{entrega.motorista?.nome || '---'}</span>
                <span style={{ textAlign: 'right', color: lucroLiquido >= 0 ? 'green' : 'red', fontWeight: 'bold', paddingRight: '15px' }}>
                  <span className="mobile-label">Lucro:</span>{formatMoney(lucroLiquido)}
                </span>
                <div className="acoes-btn" style={{display: 'flex', justifyContent: 'center', gap: '5px'}}>
                    {!isEditing && (
                        <>
                            <button className="btn-icon" title="Pagamento" style={{backgroundColor: '#ecfdf5', color: '#059669', padding: '6px'}} onClick={(e) => abrirModalPagamento(entrega, e)}>💲</button>
                            <button className="btn-icon editar" title="Editar" style={{padding: '6px'}} onClick={(e) => iniciarEdicao(entrega, e)}>✏️</button>
                            <button className="btn-icon excluir" title="Excluir" style={{padding: '6px'}} onClick={(e) => handleExcluir(entrega.id, e)}>🗑️</button>
                        </>
                    )}
                </div>
              </div>

              {expandido === entrega.id && (
                <div className="lista-detalhes" onClick={e => e.stopPropagation()}>
                    {isEditing ? (
                        <form onSubmit={handleSaveFull} className="form-edicao">
                            <div className="grid-edicao">
                                <div><label>Rota:</label><input name="nomeRota" value={formEdit.nomeRota} onChange={handleEditChange} /></div>
                                <div><label>Data Entrega:</label><input type="date" name="dataEntrega" value={formEdit.dataEntrega} onChange={handleEditChange} /></div>
                                <div><label>Data Pagamento:</label><input type="date" name="dataRecebimento" value={formEdit.dataRecebimento} onChange={handleEditChange} /></div>
                                <div><label>Motorista:</label><select name="motoristaId" value={formEdit.motoristaId} onChange={handleEditChange}>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
                                <div><label>Carro:</label><select name="carroId" value={formEdit.carroId} onChange={handleEditChange}>{carros.map(c => <option key={c.id} value={c.id}>{c.modelo}</option>)}</select></div>
                                <div><label>Valor Bruto:</label><input type="number" name="valorEntrega" value={formEdit.valorEntrega} onChange={handleEditChange} /></div>
                                <div><label>Pedágio:</label><input type="number" name="valorPedagio" value={formEdit.valorPedagio} onChange={handleEditChange} /></div>
                                <div><label>Abastecimento:</label><input type="number" name="valorAbastecimento" value={formEdit.valorAbastecimento} onChange={handleEditChange} /></div>
                                {/* --- NOVO CAMPO NA EDIÇÃO --- */}
                                <div><label>Diária Mot.:</label><input type="number" name="valorDiaria" value={formEdit.valorDiaria} onChange={handleEditChange} /></div>
                            </div>
                            <div style={{marginTop: 15, display: 'flex', gap: 10}}>
                                <button type="submit" className="btn-salvar">Salvar Alterações</button>
                                <button type="button" onClick={cancelarEdicao} className="btn-cancelar">Cancelar</button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="detalhe-grid">
                                <div><strong>Carro:</strong> {entrega.carro?.modelo} ({entrega.carro?.placa})</div>
                                <div style={{color: corPagamento}}><strong>Data do Pagamento:</strong> {textoPagamento}</div>
                            </div>
                            <hr/>
                            <ul style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                <li>⛽ Combustível: {formatMoney(entrega.valorAbastecimento)}</li>
                                <li>🚧 Pedágios (50%): {formatMoney(entrega.valorPedagio/2)}</li>
                                <li>👨‍✈️ Diária: {formatMoney(entrega.valorDiaria)}</li>
                                <li>💸 Outros: {formatMoney(entrega.outrosGastos)}</li>
                            </ul>
                        </>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalPagamentoOpen && (
        <div className="modal-overlay">
            <div className="modal-content" style={{maxWidth: '400px'}}>
                <h2 style={{color: '#059669'}}>💲 Registrar Pagamento</h2>
                <p>Rota: {entregaPagamento?.nomeRota}</p>
                <form onSubmit={salvarPagamento}>
                    <div className="form-group">
                        <label>Data que o pagamento caiu:</label>
                        <input type="date" value={dataPagamentoInput} onChange={(e) => setDataPagamentoInput(e.target.value)} autoFocus />
                    </div>
                    <div style={{display: 'flex', gap: 10, marginTop: 20}}>
                        <button type="submit" className="btn-salvar" style={{background: '#059669'}}>Confirmar Data</button>
                        <button type="button" className="btn-cancelar" onClick={() => setModalPagamentoOpen(false)}>Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

export default ListaEntregas;