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

  // 1. URL DINÂMICA
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [abaAtiva, setAbaAtiva] = useState('geral');
  const [idSelecionado, setIdSelecionado] = useState('');
  const [modoTempo, setModoTempo] = useState('mes'); 
  const [dataReferencia, setDataReferencia] = useState(new Date()); 

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. FETCH COM URL VARIÁVEL
    fetch(`${API_URL}/entregas`, { headers }).then(res => res.json()).then(setEntregas);
    fetch(`${API_URL}/manutencoes`, { headers }).then(res => res.json()).then(setManutencoes); 
    fetch(`${API_URL}/motoristas`, { headers }).then(res => res.json()).then(setMotoristas);
    fetch(`${API_URL}/carros`, { headers }).then(res => res.json()).then(setCarros);
  }, []);

  // --- UTILITÁRIOS DE DATA ---
  const getDataString = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const isDataValida = (dataISO) => {
    if (!dataISO) return false;
    const data = new Date(dataISO);
    // Verifica se é válida e se NÃO é 1970
    if (isNaN(data.getTime()) || data.getUTCFullYear() === 1970) return false;
    return true;
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- NAVEGAÇÃO TEMPORAL ---
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

  // --- FILTRO E PROCESSAMENTO GERAL ---
  
  // Função que diz se uma data (texto YYYY-MM-DD) está no período selecionado
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
    // tipo: 'entrega' ou 'manutencao'
    if (abaAtiva === 'motorista' && idSelecionado) {
        if (tipo === 'manutencao') return false; // Manutenção não tem motorista
        if (item.motoristaId !== parseInt(idSelecionado)) return false;
    }
    if (abaAtiva === 'carro' && idSelecionado && item.carroId !== parseInt(idSelecionado)) return false;
    return true;
  };

  // 1. DADOS OPERACIONAIS (Baseado na Data da Entrega/Serviço)
  const processarOperacional = () => {
    const dados = {};

    entregas.forEach(e => {
      if (!isDataValida(e.dataEntrega) || !dentroDoPrazo(e.dataEntrega)) return;
      if (!aplicarFiltrosComuns(e, 'entrega')) return;

      const dia = e.dataEntrega.split('T')[0];
      if (!dados[dia]) dados[dia] = { faturamento: 0, gastos: 0 };
      
      const custoViagem = (e.valorPedagio / 2) + e.valorAbastecimento + e.valorDiaria + e.outrosGastos;
      dados[dia].faturamento += e.valorEntrega;
      dados[dia].gastos += custoViagem;
    });

    manutencoes.forEach(m => {
      if (!isDataValida(m.data) || !dentroDoPrazo(m.data)) return;
      if (!aplicarFiltrosComuns(m, 'manutencao')) return;

      const dia = m.data.split('T')[0];
      if (!dados[dia]) dados[dia] = { faturamento: 0, gastos: 0 };
      dados[dia].gastos += m.valor;
    });

    return Object.keys(dados).sort().map(dia => {
        const [a, m, d] = dia.split('-');
        return { name: `${d}/${m}`, ...dados[dia] };
    });
  };

  // 2. DADOS FINANCEIROS (Baseado na Data de PAGAMENTO/RECEBIMENTO)
  const processarFinanceiro = () => {
    const dados = {};

    entregas.forEach(e => {
      // AQUI É A CHAVE: Filtramos pela dataRecebimento, não dataEntrega
      // E ignoramos se for nulo ou 1970
      if (!isDataValida(e.dataRecebimento) || !dentroDoPrazo(e.dataRecebimento)) return;
      if (!aplicarFiltrosComuns(e, 'entrega')) return;

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

  // Totais
  const totalFaturamento = dadosOp.reduce((acc, curr) => acc + curr.faturamento, 0);
  const totalGastos = dadosOp.reduce((acc, curr) => acc + curr.gastos, 0);
  const lucroOperacional = totalFaturamento - totalGastos;
  
  // Total a Receber (Baseado no gráfico financeiro)
  const totalReceberPeriodo = dadosFin.reduce((acc, curr) => acc + curr.receber, 0);

  return (
    <div className="container" style={{maxWidth: '1000px', paddingBottom: 50}}>
      <h1>📈 Painel Financeiro</h1>

      {/* ABAS */}
      <div className="abas-container">
        <button className={abaAtiva === 'geral' ? 'aba ativa' : 'aba'} onClick={() => { setAbaAtiva('geral'); setIdSelecionado(''); }}>Visão Geral</button>
        <button className={abaAtiva === 'motorista' ? 'aba ativa' : 'aba'} onClick={() => { setAbaAtiva('motorista'); setIdSelecionado(''); }}>Por Motorista</button>
        <button className={abaAtiva === 'carro' ? 'aba ativa' : 'aba'} onClick={() => { setAbaAtiva('carro'); setIdSelecionado(''); }}>Por Carro</button>
      </div>

      {/* FILTROS */}
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

      {/* CARDS DE RESUMO (Agora com 4 colunas) */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30}}>
        
        {/* NOVO CARD: A RECEBER */}
        <div className="card-resumo" style={{background: '#f0f9ff', borderColor: '#bae6fd', padding: 15, marginBottom: 0}}>
            <h4 style={{margin: 0, color: '#0284c7'}}>📅 A Receber (Agendado)</h4>
            <span className="valor-destaque" style={{color: '#0ea5e9', fontSize: '1.8rem'}}>
                {formatCurrency(totalReceberPeriodo)}
            </span>
            <small style={{display: 'block', marginTop: 5, color: '#64748b'}}>Cai na conta neste período</small>
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

      {/* GRÁFICO 1: PRODUÇÃO x GASTOS (Operacional) */}
      <div className="grafico-container" style={{marginBottom: 30}}>
        <h3 style={{marginLeft: 20, marginTop: 10, color: '#475569'}}>📊 Produção x Gastos (Data da Viagem)</h3>
        {dadosOp.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosOp} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
          <div style={{height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>
            Sem dados operacionais no período.
          </div>
        )}
      </div>

      {/* GRÁFICO 2: PREVISÃO DE RECEBIMENTOS (Financeiro) - NOVO */}
      <div className="grafico-container">
        <h3 style={{marginLeft: 20, marginTop: 10, color: '#0284c7'}}>💰 Fluxo de Caixa (Data do Pagamento)</h3>
        {dadosFin.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosFin} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Line type="monotone" dataKey="receber" name="Entrada Prevista" stroke="#0ea5e9" strokeWidth={3} dot={{r: 5}} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>
            Nenhum recebimento agendado para este período.
          </div>
        )}
      </div>

    </div>
  );
}

export default Metricas;