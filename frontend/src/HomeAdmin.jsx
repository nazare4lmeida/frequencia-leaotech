import React, { useState, useEffect, useCallback } from "react";
import { API_URL } from "./Constants";

export default function HomeAdmin({ user }) {
  const [stats, setStats] = useState({
    totalAlunos: 0,
    sessoesAtivas: 0,
    concluidosHoje: 0,
    pendentesSaida: 0,
  });
  
  const [alunosNoPredio, setAlunosNoPredio] = useState([]);
  const [loading, setLoading] = useState(true);

  const TEMAS_AULAS = {
    "26/02/2026": "🚀 Aula Inaugural: Boas-vindas e Configurações",
    "02/03/2026": "HTML & CSS: Estrutura Básica e Semântica",
    "03/03/2026": "Data Analytics: Modelagem Relacional",
  };

  const proximaData = "26/02/2026";
  const pautaHoje = TEMAS_AULAS[proximaData] || "Tópico técnico conforme cronograma.";

  const carregarDashboard = useCallback(async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      const hoje = new Date().toISOString().split("T")[0];

      const resStats = await fetch(`${API_URL}/admin/stats/todos?dataFiltro=${hoje}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const resLista = await fetch(`${API_URL}/admin/busca?termo=&turma=todos&status=presentes_no_dia&dataFiltro=${hoje}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (resStats.ok && resLista.ok) {
        const dataStats = await resStats.json();
        const dataLista = await resLista.json();

        setStats({
          totalAlunos: dataStats.totalAlunos || 0,
          sessoesAtivas: dataStats.sessoesAtivas || 0,
          concluidosHoje: dataStats.concluidosHoje || 0,
          pendentesSaida: dataStats.pendentesSaida || 0,
        });

        const noPredio = (dataLista.alunos || []).filter(aluno => !aluno.check_out);
        setAlunosNoPredio(noPredio);
      }
    } catch (err) {
      console.error("Erro ao carregar dashboard admin:", err);
    } finally {
      setLoading(false);
    }
  }, [user, API_URL]);

  useEffect(() => {
    carregarDashboard();
    const interval = setInterval(carregarDashboard, 60000);
    return () => clearInterval(interval);
  }, [carregarDashboard]);

  // Lógica de contagem por turma
  const contagemFullstack = alunosNoPredio.filter(a => a.formacao === "fullstack").length;
  const contagemData = alunosNoPredio.filter(a => a.formacao === "data_analytics").length;

  return (
    <div className="app-wrapper" style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      
      {/* CABEÇALHO COM MÉTRICAS GERAIS */}
      <div className="shadow-card" style={{ 
        padding: "40px", marginBottom: "30px", 
        background: "linear-gradient(135deg, var(--card-bg) 0%, rgba(0, 128, 128, 0.1) 100%)",
        borderLeft: "8px solid #008080", borderRadius: "15px"
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <span style={{ color: "#008080", fontWeight: "bold", textTransform: "uppercase", fontSize: '0.85rem' }}>
                Central de Comando • Leão Tech
                </span>
                <h1 style={{ margin: "10px 0", fontSize: "2.5rem" }}>Olá, {user?.nome?.split(' ')[0] || 'Nazaré'}! 👋</h1>
            </div>
            <button 
                onClick={carregarDashboard}
                disabled={loading}
                style={{ background: '#008080', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
                {loading ? "..." : "🔄 Atualizar"}
            </button>
        </div>
        
        <div style={{ marginTop: "35px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
           <div style={{ background: "rgba(0,128,128,0.1)", padding: "20px", borderRadius: "12px", textAlign: 'center', border: '1px solid rgba(0,128,128,0.2)' }}>
              <h4 style={{ marginTop: 0, fontSize: '0.75rem', color: "var(--text-dim)" }}>CHECK-INS HOJE</h4>
              <h2 style={{ fontSize: "2.5rem", margin: 0, color: "#008080" }}>{stats.sessoesAtivas}</h2>
              <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>Alunos presentes</p>
           </div>

           <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "20px", borderRadius: "12px", textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <h4 style={{ marginTop: 0, fontSize: '0.75rem', color: "var(--text-dim)" }}>NO PRÉDIO AGORA</h4>
              <h2 style={{ fontSize: "2.5rem", margin: 0, color: "#f59e0b" }}>{stats.pendentesSaida}</h2>
              <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>Aguardando Check-out</p>
           </div>

           <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "12px", textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginTop: 0, fontSize: '0.75rem', color: "var(--text-dim)" }}>TOTAL DA ESCOLA</h4>
              <h2 style={{ fontSize: "2.5rem", margin: 0 }}>{stats.totalAlunos}</h2>
              <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>Alunos na base</p>
           </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "25px" }}>
        
        {/* MONITOR DE PRESENÇA COM CONTADORES POR TURMA */}
        <div className="shadow-card" style={{ padding: "25px", minHeight: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, color: '#008080' }}>🟢 Monitor de Presença</h4>
            
            {/* Etiquetas de contagem por turma */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '0.7rem', background: 'rgba(0, 128, 128, 0.15)', padding: '4px 8px', borderRadius: '4px', border: '1px solid #008080' }}>
                Fullstack: <strong>{contagemFullstack}</strong>
              </span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.15)', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f59e0b' }}>
                Data: <strong>{contagemData}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alunosNoPredio.length > 0 ? (
                alunosNoPredio.map((aluno, i) => (
                    <div key={i} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '12px', 
                        background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '8px', 
                        borderLeft: `4px solid ${aluno.formacao === 'fullstack' ? '#008080' : '#f59e0b'}` 
                    }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{aluno.nome}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                            {aluno.formacao?.replace('_', ' ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: '#008080', fontSize: '0.85rem', fontWeight: 'bold' }}>{aluno.check_in}</span>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>Entrada</div>
                        </div>
                    </div>
                ))
            ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: 'var(--text-dim)' }}>Nenhum aluno no prédio.</p>
                </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div className="shadow-card" style={{ padding: "25px", borderTop: '4px solid #f59e0b' }}>
                <h4>⚡ Engajamento Hoje</h4>
                <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.85rem' }}>
                      <span>Presença Real</span>
                      <span>{((stats.sessoesAtivas / (stats.totalAlunos || 1)) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ background: 'var(--border-subtle)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${(stats.sessoesAtivas / (stats.totalAlunos || 1)) * 100}%`, 
                        background: '#008080', height: '100%', transition: 'width 1s' 
                      }} />
                    </div>
                </div>
            </div>

            <div className="shadow-card" style={{ padding: "25px" }}>
                <h4 style={{ marginBottom: '15px', color: '#008080' }}>📅 Próxima Aula</h4>
                <div style={{ padding: '15px', background: 'rgba(0,128,128,0.05)', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>{proximaData}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Pauta:</strong> {pautaHoje}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}