import { useState, useEffect } from 'react';

function Carros() {
  const [carros, setCarros] = useState([]);
  
  // 1. URL DINÂMICA PARA O DEPLOY
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  // --- MODAL DE CARRO (CRIAR/EDITAR) ---
  const [showModalCarro, setShowModalCarro] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formCarro, setFormCarro] = useState({ modelo: '', placa: '' });

  // --- MODAIS DE MANUTENÇÃO (SEPARADOS) ---
  const [showModalAdd, setShowModalAdd] = useState(false);      // Só para ADICIONAR
  const [showModalHistory, setShowModalHistory] = useState(false); // Só para VER LISTA
  
  const [carroSelecionado, setCarroSelecionado] = useState(null);
  const [listaManutencoes, setListaManutencoes] = useState([]);
  
  const [formManutencao, setFormManutencao] = useState({
    titulo: '',
    data: '',
    valor: '',
    observacao: ''
  });

  useEffect(() => {
    carregarCarros();
  }, []);

  // --- FUNÇÕES GERAIS ---
  const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const date = (d) => new Date(d).toLocaleDateString('pt-BR');
  const getToken = () => localStorage.getItem('token');

  const carregarCarros = () => {
    fetch(`${API_URL}/carros`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(setCarros)
      .catch(err => console.error(err));
  };

  // --- LÓGICA DO CARRO ---
  const salvarCarro = async (e) => {
    e.preventDefault();
    const url = editingId ? `${API_URL}/carros/${editingId}` : `${API_URL}/carros`;
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(formCarro)
    });

    if (res.ok) {
      setShowModalCarro(false);
      carregarCarros();
    } else {
      alert('Erro ao salvar.');
    }
  };

  const excluirCarro = async (id, e) => {
    e.stopPropagation(); // Impede de abrir o histórico ao clicar em excluir
    if (confirm('Tem certeza?')) {
      const res = await fetch(`${API_URL}/carros/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) carregarCarros();
      else alert('Erro: Carro possui vínculos.');
    }
  };

  const abrirEdicaoCarro = (carro, e) => {
    e.stopPropagation(); // Impede de abrir o histórico
    setEditingId(carro.id);
    setFormCarro(carro);
    setShowModalCarro(true);
  };

  // --- LÓGICA DE MANUTENÇÃO ---

  // 1. Abrir Popup de ADICIONAR (Botão Ferramenta)
  const abrirAdicionarManutencao = (carro, e) => {
    e.stopPropagation(); // Impede de abrir o histórico
    setCarroSelecionado(carro);
    setFormManutencao({ titulo: '', data: '', valor: '', observacao: '' });
    setShowModalAdd(true);
  };

  // 2. Abrir Popup de HISTÓRICO (Clicar na Linha)
  const abrirHistorico = (carro) => {
    setCarroSelecionado(carro);
    setShowModalHistory(true);
    carregarManutencoes(carro.id);
  };

  const carregarManutencoes = (carroId) => {
    fetch(`${API_URL}/carros/${carroId}/manutencoes`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(setListaManutencoes);
  };

  const salvarNovaManutencao = async (e) => {
    e.preventDefault();
    
    const res = await fetch(`${API_URL}/manutencoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({
        ...formManutencao,
        carroId: carroSelecionado.id
      })
    });

    if (res.ok) {
        alert('Manutenção registrada!');
        setShowModalAdd(false); // Fecha o modal de adicionar
        // Se estiver com histórico aberto do mesmo carro, atualiza ele também
        if(carroSelecionado) carregarManutencoes(carroSelecionado.id);
    } else {
        alert('Erro ao salvar manutenção');
    }
  };

  const excluirManutencao = async (id) => {
    if (confirm('Apagar registro?')) {
      await fetch(`${API_URL}/manutencoes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      carregarManutencoes(carroSelecionado.id); // Recarrega a lista
    }
  };

  return (
    <div className="container" style={{maxWidth: '800px'}}>
      
      {/* CABEÇALHO */}
      <div className="page-header">
        <h1>🚛 Gerenciar Veículos</h1>
        <button className="btn-novo" onClick={() => {
            setEditingId(null);
            setFormCarro({ modelo: '', placa: '' });
            setShowModalCarro(true);
        }}>
          + Novo Veículo
        </button>
      </div>

      {/* LISTAGEM DE CARROS */}
      <div className="lista-entregas">
        <div className="lista-header" style={{gridTemplateColumns: '1fr 1fr 140px'}}>
          <span>Modelo</span>
          <span>Placa</span>
          <span style={{textAlign: 'center'}}>Ações</span>
        </div>

        {carros.map(c => (
          // CLICAR NA LINHA ABRE O HISTÓRICO
          <div key={c.id} className="lista-item" onClick={() => abrirHistorico(c)}>
            <div className="lista-resumo" style={{gridTemplateColumns: '1fr 1fr 140px'}}>
              
              <span>
                <span className="mobile-label">Modelo:</span>
                <span style={{fontWeight: 'bold'}}>{c.modelo}</span>
              </span>

              <span>
                <span className="mobile-label">Placa:</span>
                <span className="badge-placa">{c.placa}</span>
              </span>
              
              <div className="acoes-btn">
                {/* BOTÃO APENAS PARA ADICIONAR NOVA */}
                <button 
                    className="btn-icon" 
                    title="Adicionar Manutenção" 
                    style={{backgroundColor: '#fff7ed', color: '#ea580c'}}
                    onClick={(e) => abrirAdicionarManutencao(c, e)}
                >
                    🛠️
                </button>

                <button className="btn-icon editar" onClick={(e) => abrirEdicaoCarro(c, e)}>✏️</button>
                <button className="btn-icon excluir" onClick={(e) => excluirCarro(c.id, e)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL 1: CRIAR/EDITAR CARRO --- */}
      {showModalCarro && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? 'Editar Veículo' : 'Novo Veículo'}</h2>
            <form onSubmit={salvarCarro}>
              <div className="form-group">
                <label>Modelo</label>
                <input value={formCarro.modelo} onChange={e => setFormCarro({...formCarro, modelo: e.target.value})} required autoFocus />
              </div>
              <div className="form-group">
                <label>Placa</label>
                <input value={formCarro.placa} onChange={e => setFormCarro({...formCarro, placa: e.target.value})} required style={{textTransform: 'uppercase'}}/>
              </div>
              <div style={{display: 'flex', gap: 10, marginTop: 20}}>
                <button type="submit" className="btn-salvar">Salvar</button>
                <button type="button" className="btn-cancelar" onClick={() => setShowModalCarro(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADICIONAR MANUTENÇÃO (SÓ FORMULÁRIO) --- */}
      {showModalAdd && carroSelecionado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Nova Manutenção</h2>
            <p style={{color: '#64748b', marginTop: -10}}>Veículo: {carroSelecionado.modelo}</p>
            
            <form onSubmit={salvarNovaManutencao}>
                <div className="form-group">
                    <label>Peça / Serviço</label>
                    <input placeholder="Ex: Alternador" value={formManutencao.titulo} onChange={e => setFormManutencao({...formManutencao, titulo: e.target.value})} required autoFocus />
                </div>
                <div className="form-group">
                    <label>Data</label>
                    <input type="date" value={formManutencao.data} onChange={e => setFormManutencao({...formManutencao, data: e.target.value})} required />
                </div>
                <div className="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" value={formManutencao.valor} onChange={e => setFormManutencao({...formManutencao, valor: e.target.value})} required />
                </div>
                <div className="form-group">
                    <label>Observação</label>
                    <input placeholder="Detalhes..." value={formManutencao.observacao} onChange={e => setFormManutencao({...formManutencao, observacao: e.target.value})} />
                </div>
                
                <div style={{display: 'flex', gap: 10, marginTop: 20}}>
                    <button type="submit" className="btn-salvar">Registrar Gasto</button>
                    <button type="button" className="btn-cancelar" onClick={() => setShowModalAdd(false)}>Cancelar</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: HISTÓRICO DE MANUTENÇÕES (SÓ LISTA) --- */}
      {showModalHistory && carroSelecionado && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '600px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <div>
                    <h2 style={{margin: 0}}>Histórico de Gastos</h2>
                    <span style={{color: '#64748b'}}>{carroSelecionado.modelo} ({carroSelecionado.placa})</span>
                </div>
                <button onClick={() => setShowModalHistory(false)} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}>✖</button>
            </div>

            <div style={{maxHeight: '400px', overflowY: 'auto', paddingRight: '5px'}}>
                {listaManutencoes.length === 0 && (
                    <div style={{textAlign: 'center', padding: 20, color: '#94a3b8', background: '#f8fafc', borderRadius: 8}}>
                        Nenhum registro de manutenção encontrado.
                    </div>
                )}
                
                {listaManutencoes.map(manu => (
                    <div key={manu.id} style={{borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                            <div style={{fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem'}}>{manu.titulo}</div>
                            <div style={{fontSize: '0.9rem', color: '#64748b', marginTop: 4}}>
                                📅 {date(manu.data)}
                            </div>
                            {manu.observacao && <div style={{fontSize: '0.9rem', color: '#475569', fontStyle: 'italic'}}>Obs: {manu.observacao}</div>}
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <div style={{fontWeight: 'bold', color: '#ef4444', fontSize: '1.1rem'}}>- {money(manu.valor)}</div>
                            <button 
                                onClick={() => excluirManutencao(manu.id)} 
                                style={{background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', marginTop: 5}}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {listaManutencoes.length > 0 && (
                <div style={{marginTop: 20, paddingTop: 15, borderTop: '2px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontSize: '1.1rem'}}>Total Gasto:</span>
                    <span style={{color: '#ef4444', fontWeight: '800', fontSize: '1.4rem'}}>
                        {money(listaManutencoes.reduce((acc, cur) => acc + cur.valor, 0))}
                    </span>
                </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default Carros;