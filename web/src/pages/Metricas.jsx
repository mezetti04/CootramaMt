import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from 'recharts';

function Metricas() {
  const [entregas, setEntregas] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [carros, setCarros] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [abaAtiva, setAbaAtiva] = useState('geral');
  const [idSelecionado, setIdSelecionado] = useState('');
  const [modoTempo, setModoTempo] = useState('mes'); 
  const [dataReferencia, setDataReferencia] = useState(new Date()); 

  // --- NOVOS ESTADOS PARA CONTROLAR A VISIBILIDADE DAS TABELAS ---
  const [mostrarTabelaOp, setMostrarTabelaOp] = useState(false);
  const [mostrarTabelaFin, setMostrarTabelaFin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch(`${API_URL}/entregas`, { headers }).then(res => res.json()).then(setEntregas);
    fetch(`${API_URL}/manutencoes`, { headers }).then(res => res.json()).then(setManutencoes); 
    fetch(`${API_URL}/motoristas`, { headers }).then(res => res.json()).then(setMotoristas);
    fetch(`${API_URL}/carros`, { headers }).then(res => res.json()).then(setCarros);
  }, []);

  const getDataString = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const isDataValida = (dataISO) => {
    if (!dataISO) return false;
    const data = new Date(dataISO);
    if (isNaN(data.getTime()) || data.getUTCFullYear() === 1970) return false;
    return true;
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDataLista = (dataISO) => {
    if (!isDataValida(dataISO)) return '---';
    return new Date(dataISO).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const navegarTempo = (direcao) => {
    if (modoTempo === 'tudo') return;
    const novaData = new Date(dataReferencia);
    if (modoTempo === 'mes') {
      novaData.setMonth(novaData.getMonth() + (direcao === 'proximo' ? 1 : -1));
    } else {
      novaData.setDate(novaData.getDate() + (direcao === 'proximo' ? 7 : -7));
    }
    setDataReferencia(novaData);
  };

  const getIntervaloDatas = () => {
    const dataRef = new Date(dataReferencia);
    if (modoTempo === 'mes') {
      return { 
        inicio: new Date(dataRef.getFullYear(), dataRef.getMonth(), 1), 
        fim: new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, 0) 
      };
    } else if (modoTempo === 'semana') {
      const diaDaSemana = dataRef.getDay(); 
      const diff = dataRef.getDate() - diaDaSemana; 
      const inicio = new Date(dataRef); inicio.setDate(diff);
      const fim = new Date(inicio); fim.setDate(inicio.getDate() + 6);
      return { inicio, fim };
    }
    return { inicio: null, fim: null };
  };

  const getLabelPeriodo = () => {
    if (modoTempo === 'tudo') return 'Todo o Período';
    const { inicio, fim } = getIntervaloDatas();
    const ops = { day: '2-digit', month: '2-digit' };
    if (modoTempo === 'mes') {
      const mes = inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return mes.charAt(0).toUpperCase() + mes.slice(1);
    }
    return `${inicio.toLocaleDateString('pt-BR', ops)} até ${fim.toLocaleDateString('pt-BR', ops)}`;
  };

  const dentroDoPrazo = (dataISO) => {
    if (modoTempo === 'tudo') return true;
    if (!isDataValida(dataISO)) return false;

    const { inicio, fim } = getIntervaloDatas();
    const dataStr = dataISO.split('T')[0];
    const inicioStr = getDataString(inicio);
    const fimStr = getDataString(fim);

    return dataStr >= inicioStr && dataStr <= fimStr;
  };

  const aplicarFiltrosComuns = (item, tipo) => {
    if (abaAtiva === 'motorista' && idSelecionado) {
        if (tipo === 'manutencao') return false; 
        if (item.motoristaId !== parseInt(idSelecionado)) return false;
    }
    if (abaAtiva === 'carro' && idSelecionado && item.carroId !== parseInt(idSelecionado)) return false;
    return true;
  };

  const processarOperacional = () => {
    const dados = {};
    entregas.forEach(e => {
      if (!isDataValida(e.dataEntrega) || !dentroDoPrazo(e.dataEntrega) || !aplicarFiltrosComuns(e, 'entrega')) return;
      const dia = e.dataEntrega.split('T')[0];
      if (!dados[dia]) dados[dia] = { faturamento: 0, gastos: 0 };
      const custoViagem = (e.valorPedagio / 2) + e.valorAbastecimento + e.valorDiaria + e.outrosGastos;
      dados[dia].faturamento += e.valorEntrega;
      dados[dia].gastos += custoViagem;
    });
    manutencoes.forEach(m => {
      if (!isDataValida(m.data) || !dentroDoPrazo(m.data) || !aplicarFiltrosComuns(m, 'manutencao')) return;
      const dia = m.data.split('T')[0];
      if (!dados[dia]) dados[dia] = { faturamento: 0, gastos: 0 };
      dados[dia].gastos += m.valor;
    });
    return Object.keys(dados).sort().map(dia => {
        const [a, m, d] = dia.split('-');
        return { name: `${d}/${m}`, ...dados[dia] };
    });
  };

  const processarFinanceiro = () => {
    const dados = {};
    entregas.forEach(e => {
      if (!isDataValida(e.dataRecebimento) || !dentroDoPrazo(e.dataRecebimento) || !aplicarFiltrosComuns(e, 'entrega')) return;
      const dia = e.dataRecebimento.split('T')[0];
      if (!dados[dia]) dados[dia] = { receber: 0 };
      dados[dia].receber += e.valorEntrega;
    });
    return Object.keys(dados).sort().map(dia => {
        const [a, m, d] = dia.split('-');
        return { name: `${d}/${m}`, ...dados[dia] };
    });
  };

  const dadosOp = processarOperacional();
  const dadosFin = processarFinanceiro();

  const totalFaturamento = dadosOp.reduce((acc, curr) => acc + curr.faturamento, 0);
  const totalGastos = dadosOp.reduce((acc, curr) => acc + curr.gastos, 0);
  const lucroOperacional = totalFaturamento - totalGastos;
  const totalReceberPeriodo = dadosFin.reduce((acc, curr) => acc + curr.receber, 0);
  
  const listaAcertos = entregas
    .filter(e => isDataValida(e.dataEntrega) && dentroDoPrazo(e.dataEntrega) && aplicarFiltrosComuns(e, 'entrega'))
    .sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega)); 

  const listaRecebimentos = entregas
    .filter(e => isDataValida(e.dataRecebimento) && dentroDoPrazo(e.dataRecebimento) && aplicarFiltrosComuns(e, 'entrega'))
    .sort((a, b) => new Date(a.dataRecebimento) - new Date(b.dataRecebimento)); 

  return (
    <div className="container" style={{maxWidth: '1000px', paddingBottom: 50}}>
      <h1>Painel Financeiro</h1>

      <div className="abas-container">
        <button className={abaAtiva === 'geral' ? 'aba ativa' : 'aba'} onClick={() => { setAbaAtiva('geral'); setIdSelecionado(''); }}>Visão Geral</button>
        <button className={abaAtiva === 'motorista' ? 'aba ativa' : 'aba'} onClick={() => { setAbaAtiva('motorista'); setIdSelecionado(''); }}>Por Motorista</button>
        <button className={abaAtiva === 'carro' ? 'aba ativa' : 'aba'} onClick={() => { setAbaAtiva('carro'); setIdSelecionado(''); }}>Por Carro</button>
      </div>

      <div className="filtros-bar">
        <div className="seletores">
            {abaAtiva === 'motorista' && (
            <select value={idSelecionado} onChange={(e) => setIdSelecionado(e.target.value)}>
                <option value="">Selecione o Motorista...</option>
                {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            )}
            {abaAtiva === 'carro' && (
            <select value={idSelecionado} onChange={(e) => setIdSelecionado(e.target.value)}>
                <option value="">Selecione o Carro...</option>
                {carros.map(c => <option key={c.id} value={c.id}>{c.modelo} - {c.placa}</option>)}
            </select>
            )}
        </div>
        <div className="navegador-temporal">
            <div className="toggle-modo">
                <button className={modoTempo === 'mes' ? 'ativo' : ''} onClick={() => setModoTempo('mes')}>Mês</button>
                <button className={modoTempo === 'semana' ? 'ativo' : ''} onClick={() => setModoTempo('semana')}>Semana</button>
                <button className={modoTempo === 'tudo' ? 'ativo' : ''} onClick={() => setModoTempo('tudo')}>Tudo</button>
            </div>
            <div className="controles-navegacao" style={{ opacity: modoTempo === 'tudo' ? 0.3 : 1, pointerEvents: modoTempo === 'tudo' ? 'none' : 'auto' }}>
                <button className="btn-nav-tempo" onClick={() => navegarTempo('anterior')}>◀</button>
                <span className="label-tempo">{getLabelPeriodo()}</span>
                <button className="btn-nav-tempo" onClick={() => navegarTempo('proximo')}>▶</button>
            </div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30}}>
        <div className="card-resumo" style={{background: '#f0f9ff', borderColor: '#bae6fd', padding: 15, marginBottom: 0}}>
            <h4 style={{margin: 0, color: '#0284c7'}}>📅 A Receber (Agendado)</h4>
            <span className="valor-destaque" style={{color: '#0ea5e9', fontSize: '1.8rem'}}>{formatCurrency(totalReceberPeriodo)}</span>
        </div>
        <div className="card-resumo" style={{background: '#ecfdf5', borderColor: '#d1fae5', padding: 15, marginBottom: 0}}>
            <h4 style={{margin: 0, color: '#047857'}}>Produção (Faturamento)</h4>
            <span className="valor-destaque" style={{color: '#059669', fontSize: '1.8rem'}}>{formatCurrency(totalFaturamento)}</span>
        </div>
        <div className="card-resumo" style={{background: '#fef2f2', borderColor: '#fee2e2', padding: 15, marginBottom: 0}}>
            <h4 style={{margin: 0, color: '#b91c1c'}}>Gastos Totais</h4>
            <span className="valor-destaque" style={{color: '#dc2626', fontSize: '1.8rem'}}>{formatCurrency(totalGastos)}</span>
        </div>
        <div className="card-resumo" style={{background: lucroOperacional >= 0 ? '#eff6ff' : '#fff1f2', borderColor: lucroOperacional >= 0 ? '#dbeafe' : '#fecdd3', padding: 15, marginBottom: 0}}>
            <h4 style={{margin: 0, color: '#1e40af'}}>Lucro Operacional</h4>
            <span className="valor-destaque" style={{color: lucroOperacional >= 0 ? '#2563eb' : '#e11d48', fontSize: '1.8rem'}}>{formatCurrency(lucroOperacional)}</span>
        </div>
      </div>

      {/* GRÁFICO OPERACIONAL (Agora clicável) */}
      <div 
        className="grafico-container" 
        style={{marginBottom: 30, cursor: 'pointer', transition: '0.2s', border: mostrarTabelaOp ? '2px solid #10b981' : ''}} 
        onClick={() => setMostrarTabelaOp(!mostrarTabelaOp)}
        title="Clique para ver ou esconder as entregas deste período"
      >
        <h3 style={{marginLeft: 20, marginTop: 10, color: '#475569'}}>
          📊 Produção x Gastos <span style={{fontSize: '0.8rem', fontWeight: 'normal', color: '#94a3b8'}}>(Clique para {mostrarTabelaOp ? 'ocultar' : 'ver'} entregas)</span>
        </h3>
        {dadosOp.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosOp} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} style={{ pointerEvents: 'none' }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="faturamento" name="Produzido" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gasto" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>Sem dados no período.</div>
        )}
      </div>

      {/* GRÁFICO FINANCEIRO (Agora clicável) */}
      <div 
        className="grafico-container" 
        style={{marginBottom: 30, cursor: 'pointer', transition: '0.2s', border: mostrarTabelaFin ? '2px solid #0ea5e9' : ''}}
        onClick={() => setMostrarTabelaFin(!mostrarTabelaFin)}
        title="Clique para ver ou esconder os recebimentos agendados"
      >
        <h3 style={{marginLeft: 20, marginTop: 10, color: '#0284c7'}}>
          💰 Fluxo de Caixa <span style={{fontSize: '0.8rem', fontWeight: 'normal', color: '#94a3b8'}}>(Clique para {mostrarTabelaFin ? 'ocultar' : 'ver'} agendamentos)</span>
        </h3>
        {dadosFin.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosFin} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} style={{ pointerEvents: 'none' }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Line type="monotone" dataKey="receber" name="Entrada Prevista" stroke="#0ea5e9" strokeWidth={3} dot={{r: 5}} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>Nenhum recebimento agendado para este período.</div>
        )}
      </div>

      {/* ÁREA DAS TABELAS CONDICIONAIS */}
      {(mostrarTabelaFin || mostrarTabelaOp) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
            
            {/* Tabela de Recebimentos Agendados (Só aparece se mostrarTabelaFin for true) */}
            {mostrarTabelaFin && (
                <div className="card-resumo" style={{ textAlign: 'left', background: '#fff', border: '1px solid #e2e8f0', padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: '#f0f9ff', padding: '15px', borderBottom: '1px solid #bae6fd' }}>
                        <h3 style={{ margin: 0, color: '#0369a1', fontSize: '1.1rem' }}>📋 Detalhes a Receber</h3>
                        <small style={{ color: '#0284c7' }}>Entregas aguardando pagamento neste período</small>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '10px' }}>
                        {listaRecebimentos.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', margin: '20px 0' }}>Nenhuma entrega a receber listada.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <tbody>
                                    {listaRecebimentos.map(e => (
                                        <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 5px', color: '#475569' }}>
                                                <strong>{formatDataLista(e.dataRecebimento)}</strong><br/>
                                                <span style={{ fontSize: '0.8rem' }}>{e.nomeRota}</span>
                                            </td>
                                            <td style={{ padding: '8px 5px', textAlign: 'right', color: '#0ea5e9', fontWeight: 'bold' }}>
                                                {formatCurrency(e.valorEntrega)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Tabela de Acertos (Só aparece se mostrarTabelaOp for true) */}
            {mostrarTabelaOp && (
                <div className="card-resumo" style={{ textAlign: 'left', background: '#fff', border: '1px solid #e2e8f0', padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: '#ecfdf5', padding: '15px', borderBottom: '1px solid #d1fae5' }}>
                        <h3 style={{ margin: 0, color: '#047857', fontSize: '1.1rem' }}>🚚 Entregas do Período</h3>
                        <small style={{ color: '#059669' }}>Acertos finalizados nestas datas</small>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '10px' }}>
                        {listaAcertos.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', margin: '20px 0' }}>Nenhum acerto listado.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <tbody>
                                    {listaAcertos.map(e => {
                                        const gastos = (e.valorPedagio / 2) + e.valorAbastecimento + e.valorDiaria + e.outrosGastos;
                                        return (
                                            <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 5px', color: '#475569' }}>
                                                    <strong>{formatDataLista(e.dataEntrega)}</strong><br/>
                                                    <span style={{ fontSize: '0.8rem' }}>{e.nomeRota}</span>
                                                </td>
                                                <td style={{ padding: '8px 5px', textAlign: 'right' }}>
                                                    <span style={{ color: '#059669', fontWeight: 'bold' }}>+ {formatCurrency(e.valorEntrega)}</span><br/>
                                                    <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>- {formatCurrency(gastos)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

export default Metricas;