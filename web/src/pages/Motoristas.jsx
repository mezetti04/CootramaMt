import { useState, useEffect } from 'react';

function Motoristas() {
  const [motoristas, setMotoristas] = useState([]); // Começa como lista vazia
  const [erro, setErro] = useState(''); // Estado para guardar erros
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [nome, setNome] = useState('');

  useEffect(() => {
    carregarMotoristas();
  }, []);

  const carregarMotoristas = async () => {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/motoristas`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });

        const data = await res.json();

        // BLINDAGEM: Verifica se é uma lista antes de salvar
        if (Array.isArray(data)) {
            setMotoristas(data);
            setErro('');
        } else {
            // Se não for lista (ex: erro de token), define vazio e mostra erro no console
            console.error("Erro ao carregar motoristas:", data);
            setMotoristas([]);
            if (data.erro) setErro(data.erro);
        }
    } catch (err) {
        console.error("Erro de conexão:", err);
        setErro("Falha na conexão com o servidor.");
    }
  };

  const abrirModalCriacao = () => { setEditingId(null); setNome(''); setShowModal(true); };
  const abrirModalEdicao = (m) => { setEditingId(m.id); setNome(m.nome); setShowModal(true); };
  const fecharModal = () => { setShowModal(false); setEditingId(null); setNome(''); };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const url = editingId ? `${API_URL}/motoristas/${editingId}` : `${API_URL}/motoristas`;
    const method = editingId ? 'PUT' : 'POST';
    const token = localStorage.getItem('token'); 

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nome })
        });

        if (res.ok) { 
            fecharModal(); 
            carregarMotoristas(); 
        } else { 
            alert('Erro ao salvar'); 
        }
    } catch (error) {
        alert('Erro de conexão');
    }
  };

  const handleExcluir = async (id) => {
    if (confirm('Tem certeza? Isso pode apagar entregas vinculadas.')) {
      const token = localStorage.getItem('token'); 
      try {
          const res = await fetch(`${API_URL}/motoristas/${id}`, { 
              method: 'DELETE', 
              headers: { 'Authorization': `Bearer ${token}` } 
          });
          
          if (res.ok) {
              carregarMotoristas(); 
          } else {
              alert('Não foi possível excluir (verifique se há entregas vinculadas).');
          }
      } catch (error) {
          alert('Erro de conexão.');
      }
    }
  };

  return (
    <div className="container" style={{maxWidth: '800px'}}>
      
      <div className="page-header">
        <h1> Gerenciar Motoristas</h1>
        <button className="btn-novo" onClick={abrirModalCriacao}>+ Novo Motorista</button>
      </div>

      {/* MENSAGEM DE ERRO VISUAL */}
      {erro && (
        <div style={{background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '5px', marginBottom: '20px'}}>
            ⚠️ {erro}
        </div>
      )}

      <div className="lista-entregas">
        <div className="lista-header" style={{gridTemplateColumns: '1fr 1fr 100px'}}>
          <span>Nome do Motorista</span>
          <span style={{textAlign: 'center'}}>Viagens (Mês Atual)</span>
          <span style={{textAlign: 'center'}}>Ações</span>
        </div>

        {motoristas.length === 0 && !erro && <p style={{padding: 20}}>Nenhum motorista encontrado.</p>}

        {motoristas.map(m => (
          <div key={m.id} className="lista-item">
            <div className="lista-resumo" style={{gridTemplateColumns: '1fr 1fr 100px'}}>
              
              <span>
                <span className="mobile-label">Nome:</span>
                <span style={{fontWeight: 'bold'}}>{m.nome}</span>
              </span>

              <span style={{textAlign: 'center'}}>
                <span className="mobile-label">Viagens:</span>
                <span style={{
                    backgroundColor: '#eff6ff', 
                    color: '#2563eb', 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                }}>
                    {m.totalViagensMes || 0} 🚚
                </span>
              </span>
              
              <div className="acoes-btn">
                <button className="btn-icon editar" onClick={() => abrirModalEdicao(m)}>✏️</button>
                <button className="btn-icon excluir" onClick={() => handleExcluir(m.id)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h2>
            <form onSubmit={handleSalvar}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input autoFocus value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
              <div style={{display: 'flex', gap: 10, marginTop: 20}}>
                <button type="submit" className="btn-salvar">Salvar</button>
                <button type="button" className="btn-cancelar" onClick={fecharModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Motoristas;