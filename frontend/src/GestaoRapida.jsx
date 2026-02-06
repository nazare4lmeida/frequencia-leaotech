import React, { useState, useEffect } from "react";
import { fetchComToken } from "./Api";
import { API_URL, FORMACOES } from "./Constants";

export default function GestaoRapida({ user, setView }) {
  const [alunos, setAlunos] = useState([]);
  const [filtroTurma, setFiltroTurma] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [setStatusSalva] = useState({});

  useEffect(() => {
    const carregarTodos = async () => {
      setCarregando(true);
      try {
        const res = await fetchComToken(`/admin/busca?termo=&turma=todos&status=todos`);
        if (res.ok) {
          const data = await res.json();
          setAlunos(data.alunos || []);
        }
      } finally {
        setCarregando(false);
      }
    };
    carregarTodos();
  }, []);

  const salvarNome = async (email, novoNome) => {
    const alunoOriginal = alunos.find(a => a.email === email);
    if (alunoOriginal.nome === novoNome) return;

    setStatusSalva(prev => ({ ...prev, [email]: 'salvando' }));
    
    try {
      const res = await fetch(`${API_URL}/admin/limpeza-nome`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ email, nome: novoNome }),
      });

      if (res.ok) {
        setStatusSalva(prev => ({ ...prev, [email]: 'ok' }));
        setAlunos(prev => prev.map(a => a.email === email ? { ...a, nome: novoNome } : a));
      } else {
        setStatusSalva(prev => ({ ...prev, [email]: 'erro' }));
      }
    } catch {
      setStatusSalva(prev => ({ ...prev, [email]: 'erro' }));
    }
  };

  const alunosFiltrados = alunos.filter(a => 
    filtroTurma === "todos" ? true : a.formacao === filtroTurma
  );

  if (carregando) return <div className="app-wrapper">Carregando lista de alunos...</div>;

  return (
    <div className="app-wrapper">
      <div className="shadow-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3>Edição de Cadastros</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Preencha os nomes e use TAB para navegar.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              className="input-modern" 
              style={{ width: '200px', margin: 0 }}
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
            >
              <option value="todos">Todas as Formações</option>
              {FORMACOES.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <button onClick={() => setView("admin")} className="btn-secondary">Voltar</button>
          </div>
        </div>
        
        <table className="historico-table">
          <thead>
            <tr>
              <th>ALUNO (E-MAIL/CPF)</th>
              <th style={{ textAlign: 'center' }}>PRESENÇAS</th>
              <th style={{ textAlign: 'center' }}>FALTAS</th>
              <th style={{ textAlign: 'center' }}>NOME COMPLETO</th>
            </tr>
          </thead>
          <tbody>
            {alunosFiltrados.map((aluno) => (
              <tr key={aluno.email}>
                <td style={{ fontSize: '0.8rem' }}>
                    {aluno.email}
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{aluno.formacao}</div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {aluno.total_presencas || 0}
                </td>
                <td style={{ textAlign: 'center', color: '#621414' }}>
                  {aluno.total_faltas || 0}
                </td>
                <td>
                  <input
                    type="text"
                    className="input-modern"
                    style={{ margin: 0, padding: '5px 10px' }}
                    defaultValue={aluno.nome || ""}
                    onBlur={(e) => salvarNome(aluno.email, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}