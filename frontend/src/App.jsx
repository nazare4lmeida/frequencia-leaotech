import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { API_URL } from "./Constants";
import Login from "./Login";
import Admin from "./Admin";
import Perfil from "./Perfil";
import { fetchComToken } from "./Api";
import GestaoRapida from "./GestaoRapida";
import HomeAdmin from "./HomeAdmin";

const getProximasAulas = (formacao) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Zera as horas para comparação justa de data

  const aulaInaugural = "26/02/2026";
  let cronogramaAtivo = [];

  if (formacao === "fullstack") {
    cronogramaAtivo = [
      aulaInaugural,
      "02/03/2026",
      "04/03/2026",
      "06/03/2026",
      "09/03/2026",
      "11/03/2026",
      "13/03/2026",
      "16/03/2026",
      "18/03/2026",
      "20/03/2026",
      "23/03/2026",
      "25/03/2026",
      "27/03/2026",
      "30/03/2026",
      "01/04/2026",
      "06/04/2026",
      "08/04/2026",
      "13/04/2026",
      "15/04/2026",
      "17/04/2026",
      "20/04/2026",
      "22/04/2026",
      "24/04/2026",
      "27/04/2026",
      "29/04/2026",
      "04/05/2026",
      "06/05/2026",
      "08/05/2026",
      "11/05/2026",
      "13/05/2026",
      "15/05/2026",
      "18/05/2026",
      "20/05/2026",
      "22/05/2026",
      "25/05/2026",
      "27/05/2026",
      "29/05/2026",
      "01/06/2026",
      "03/06/2026",
      "05/06/2026",
      "08/06/2026",
      "10/06/2026",
      "12/06/2026",
      "15/06/2026",
      "17/06/2026",
      "19/06/2026",
      "22/06/2026",
      "24/06/2026",
      "26/06/2026",
    ];
  } else if (formacao === "data_analytics") {
    cronogramaAtivo = [
      aulaInaugural,
      "03/03/2026",
      "05/03/2026",
      "07/03/2026",
      "10/03/2026",
      "12/03/2026",
      "14/03/2026",
      "17/03/2026",
      "19/03/2026",
      "21/03/2026",
      "24/03/2026",
      "26/03/2026",
      "28/03/2026",
      "31/03/2026",
      "02/04/2026",
      "04/04/2026",
      "07/04/2026",
      "09/04/2026",
      "11/04/2026",
      "14/04/2026",
      "16/04/2026",
      "18/04/2026",
      "21/04/2026",
      "23/04/2026",
      "25/04/2026",
      "28/04/2026",
      "30/04/2026",
      "05/05/2026",
      "07/05/2026",
      "09/05/2026",
      "12/05/2026",
      "14/05/2026",
      "16/05/2026",
      "19/05/2026",
      "21/05/2026",
      "23/05/2026",
      "26/05/2026",
      "28/05/2026",
      "30/05/2026",
      "02/06/2026",
      "04/06/2026",
      "06/06/2026",
      "09/06/2026",
      "11/06/2026",
      "13/06/2026",
      "16/06/2026",
      "18/06/2026",
      "20/06/2026",
      "23/06/2026",
      "25/06/2026",
      "27/06/2026",
    ];
  }

  // Filtra as datas que ainda vão acontecer e retorna as próximas 5
  return cronogramaAtivo
    .filter((dataStr) => {
      const [dia, mes, ano] = dataStr.split("/");
      const dataAula = new Date(ano, mes - 1, dia);
      return dataAula >= hoje;
    })
    .slice(0, 5);
};

export default function App() {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem("leaotech_session");
    if (!s) return null;
    try {
      const { userData, timestamp } = JSON.parse(s);
      if (Date.now() - timestamp < 12 * 60 * 60 * 1000) return userData;
    } catch (err) {
      console.error(err);
    }
    return null;
  });

  const [dadosSalvos, setDadosSalvos] = useState(() => {
    const salvo = localStorage.getItem("leaotech_remember");
    return salvo ? JSON.parse(salvo) : null;
  });

  const [view, setView] = useState("home");
  const [form, setForm] = useState(dadosSalvos || { email: "", dataNasc: "" });
  const [historico, setHistorico] = useState([]);
  const [popup, setPopup] = useState({ show: false, msg: "", tipo: "" });
  const [feedback, setFeedback] = useState({
    nota: 0,
    revisao: "",
    modal: false,
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const salvo = localStorage.getItem("leaotech_theme");
    return salvo ? JSON.parse(salvo) : true;
  });

  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const [stats] = useState({
    totalAlunos: 0,
    sessoesAtivas: 0,
    totalPresencas: 0,
  });

  const [alarmeAtivo] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const t = setTimeout(() => {
      setView((v) => (v === "home" ? "admin" : v));
    }, 0);
    return () => clearTimeout(t);
  }, [user?.role]);

  const popupStyles = {
    position: "fixed",
    top: "20px",
    right: "20px",
    backgroundColor: "#008080",
    color: "#ffffff",
    padding: "15px 25px",
    borderRadius: "8px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
    borderLeft: "5px solid #000000",
    zIndex: 9999,
    fontWeight: "bold",
    animation: "slideIn 0.5s ease-out",
  };

  const exibirPopup = (msg, tipo) => {
    setPopup({ show: true, msg, tipo });
    setTimeout(() => setPopup({ show: false, msg: "", tipo: "" }), 5000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const agora = new Date();
      const horaFormatada = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(horaFormatada);
      if (alarmeAtivo && agora.getDay() === 1 && horaFormatada === "18:30") {
        exibirPopup(
          " Hora da aula! Não esqueça de fazer seu Check-in.",
          "aviso",
        );
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [alarmeAtivo]);

 // --- Trecho Completo: Validação de Horário + Login ---

  const validarHorarioPonto = () => {
    // --- CONFIGURAÇÃO DE TESTE ---
    const MODO_TESTE = true; // Altere para false quando terminar de gravar o vídeo
    // ----------------------------

    const agora = new Date();
    const diaSemana = agora.getDay();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const horaAtualDecimal = hora + minuto / 60;

    const eFullStack = user?.formacao === "fullstack";
    const eDataAnalytics = user?.formacao === "data_analytics";

    let isDiaDeAula = false;
    let janelaCheckIn = { inicio: 18, fim: 20.5 }; // 18:00 às 20:30
    let janelaCheckOut = { inicio: 21.5, fim: 23.9 }; // A partir das 21:30

    // Se o modo teste estiver ativo, liberamos tudo para a data de hoje
    if (MODO_TESTE) {
      return {
        isDiaDeAula: true,
        podeCheckIn: true,
        podeCheckOut: true,
        regras: "MODO TESTE ATIVO",
        diasCorretos: "Todos os dias (Vídeo)",
      };
    }

    // Lógica original (mantida para quando MODO_TESTE for false)
    if (eFullStack && [1, 3, 5].includes(diaSemana)) {
      isDiaDeAula = true;
    } else if (eDataAnalytics) {
      if ([2, 4].includes(diaSemana)) {
        isDiaDeAula = true;
      } else if (diaSemana === 6) {
        isDiaDeAula = true;
        janelaCheckIn = { inicio: 8, fim: 10 };
        janelaCheckOut = { inicio: 11.5, fim: 13 };
      }
    }

    return {
      isDiaDeAula,
      podeCheckIn: horaAtualDecimal >= janelaCheckIn.inicio && horaAtualDecimal <= janelaCheckIn.fim,
      podeCheckOut: horaAtualDecimal >= janelaCheckOut.inicio && horaAtualDecimal <= janelaCheckOut.fim,
      regras: diaSemana === 6 ? "08:00 e 11:30" : "18:00 e 21:30",
      diasCorretos: eFullStack ? "Seg, Qua e Sex" : "Ter, Qui e Sáb",
    };
  };

  const handleLogin = async () => {
    try {
      const partes = form.dataNasc.split("/");
      if (partes.length !== 3 || form.dataNasc.length < 10) {
        exibirPopup("Digite a data completa: DD/MM/AAAA", "erro");
        return;
      }
      const dataParaEnvio = `${partes[2]}-${partes[1]}-${partes[0]}`;

      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          dataNascimento: dataParaEnvio,
          formacao: form.formacao,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        exibirPopup(data.error || "Erro no login.", "erro");
        return;
      }

      localStorage.removeItem("leaotech_session");
      setUser(data);

      localStorage.setItem(
        "leaotech_remember",
        JSON.stringify({
          email: data.email,
          dataNasc: form.dataNasc,
          nome: data.nome || "",
          formacao: data.formacao,
        }),
      );

      localStorage.setItem(
        "leaotech_session",
        JSON.stringify({ userData: data, timestamp: Date.now() }),
      );
    } catch (err) {
      console.error("Erro no fetch de login:", err);
      exibirPopup("Erro de conexão.", "erro");
    }
  };
  const carregarHistorico = useCallback(async () => {
    const emailParaBusca =
      user?.email ||
      JSON.parse(localStorage.getItem("leaotech_session"))?.userData?.email;

    const token =
      user?.token ||
      JSON.parse(localStorage.getItem("leaotech_session"))?.userData?.token;

    if (!emailParaBusca || user?.role === "admin" || !token) return;

    try {
      const res = await fetch(
        `${API_URL}/historico/aluno/${emailParaBusca.trim().toLowerCase()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setHistorico(data);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.email) {
      const timer = setTimeout(() => carregarHistorico(), 0);
      return () => clearTimeout(timer);
    }
  }, [user?.email, carregarHistorico]);

  const baterPonto = async (extra = {}) => {
    if (!user || !user.email || !user.token)
      return exibirPopup("Sessão expirada. Faça login novamente.", "erro");

    try {
      const res = await fetchComToken("/ponto", "POST", {
        aluno_id: user.email.trim().toLowerCase(),
        ...extra,
      });

      const data = await res.json();

      if (!res.ok) {
        // Se der erro 500, o 'data.error' vai nos dizer o motivo exato nos logs
        return exibirPopup(data.error || "Erro ao registrar ponto.", "erro");
      }

      exibirPopup(data.msg, "sucesso");
      // FORÇA O RECONHECIMENTO DA PRESENÇA:
      // Isso busca os dados novos do Supabase e atualiza o estado 'historico'
      await carregarHistorico();

      if (!extra.nota) {
        setTimeout(() => {
          exibirPopup(
            "📌 Lembrete: O Check-out deve ser feito a partir das 21:30.",
            "aviso",
          );
        }, 1000);
      }
      setFeedback({ nota: 0, revisao: "", modal: false });
    } catch (err) {
      console.error("Erro bater ponto:", err);
      exibirPopup("Erro de comunicação com o servidor.", "erro");
    }
  };

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
    localStorage.setItem("leaotech_theme", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  if (!user) {
    return (
      <Login
        form={form}
        setForm={setForm}
        handleLogin={handleLogin}
        dadosSalvos={dadosSalvos}
        setDadosSalvos={setDadosSalvos}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  const totalPresencas = historico.length;
  const totalFaltas = 0;
  const nomeExibicao = user.nome || user.email.split("@")[0];
  return (
    <div className="app-wrapper">
      {popup.show && (
        <div style={popupStyles} className="custom-popup-modern">
          {popup.msg}
        </div>
      )}

      <header className="glass-header">
        <div
          className="brand-logo"
          onClick={() => setView("home")}
          style={{ cursor: "pointer" }}
        >
          <img
            src="/logo-lt.png" /* Certifique-se que a extensão é .png ou .jpg */
            alt="Logo Leão Tech"
            className="brand-logo-img"
          />
          <div className="brand-text">
            Registro de Frequência
            <span>Leão Tech</span>
          </div>
          <div className="user-badge">
            {user.role === "admin" ? "Admin" : "Aluno"}
          </div>
        </div>
        <div className="header-right">
          <span className="clock">🕒 {currentTime}</span>
          <div className="nav-actions">
            {user.role === "admin" ? (
              // Links exclusivos do Admin
              <>
                <button
                  className="btn-secondary"
                  onClick={() => setView("home")}
                >
                  Home
                </button>
                <button
                  className="btn-secondary"
                  style={{
                    border: view === "admin" ? "2px solid #008080" : "none",
                  }}
                  onClick={() => setView("admin")}
                >
                  Dashboard
                </button>
                <button
                  className="btn-secondary"
                  style={{
                    border: view === "limpeza" ? "2px solid #008080" : "none",
                  }}
                  onClick={() => setView("limpeza")}
                >
                  Edição
                </button>
              </>
            ) : (
              // Links exclusivos do Aluno
              <>
                <button
                  className="btn-action-circle"
                  title="Meu Perfil"
                  onClick={() => setView("perfil")}
                >
                  👤
                </button>
              </>
            )}

            <button
              className="btn-action-circle"
              title="Alternar Tema"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? "○" : "●"}
            </button>

            <button
              className="btn-secondary"
              onClick={() => {
                localStorage.removeItem("leaotech_session");
                setUser(null);
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* 1. SE FOR ADMIN E ESTIVER NA HOME OU NA VIEW ADMIN */}
      {view === "home" && user.role === "admin" ? (
        <HomeAdmin
          stats={stats} // Agora 'stats' está definido e virá do banco de dados
          proximasAulas={getProximasAulas("fullstack")}
          user={user}
        />
      ) : view === "admin" && user.role === "admin" ? (
        <Admin user={user} setView={setView} />
      ) : view === "perfil" && user.role !== "admin" ? (
        <Perfil
          user={user}
          setUser={setUser}
          onVoltar={() => setView("home")}
        />
      ) : view === "limpeza" && user.role === "admin" ? (
        <GestaoRapida user={user} setView={setView} />
      ) : (
/* 4. LAYOUT EXCLUSIVO DO ALUNO (SÓ APARECE SE NÃO FOR ADMIN) */
        <main className="aluno-main-wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
          
          {/* CARD PRINCIPAL DE PONTO - LARGURA TOTAL DO WRAPPER */}
          <div className="aula-card shadow-card" style={{ width: "100%", boxSizing: "border-box", marginBottom: "25px" }}>
            <div className="card-header-info">
              <p style={{ color: "var(--text-dim)" }}>
                {new Date().toLocaleDateString("pt-BR")}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ color: "var(--text-dim)", margin: 0 }}>
                  Olá, {nomeExibicao}!
                </h2>
                <span className="user-badge" style={{ fontSize: "0.8rem", padding: "2px 10px" }}>
                  {user.formacao === "fullstack" ? "Fullstack Developer" : "Data Analytics"}
                </span>
              </div>
            </div>

            <div className="info-banner" style={{ margin: "15px 0" }}>
              ℹ Informação: Check-in e Check-out disponíveis nos dias de aula presencial da sua formação.
            </div>

            <div style={{ margin: "20px 0", textAlign: "center" }}>
              {(() => {
                const { isDiaDeAula, podeCheckIn, podeCheckOut, diasCorretos } = validarHorarioPonto();
                const hojeISO = new Date().toLocaleDateString("en-CA");
                const registroHoje = historico.find((h) => h.data?.substring(0, 10) === hojeISO);
                const jaFezIn = !!registroHoje?.check_in;
                const jaFezOut = !!registroHoje?.check_out;

                return (
                  <>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '25px' }}>
                      <button
                        className={`btn-ponto in ${jaFezIn ? "concluido" : ""}`}
                        disabled={jaFezIn}
                        onClick={() => {
                          if (!isDiaDeAula || !podeCheckIn) {
                            exibirPopup(`Horário de Check-in: 18:00 às 20:30 (${diasCorretos})`, "erro");
                            return;
                          }
                          baterPonto();
                        }}
                        style={jaFezIn ? { backgroundColor: "#2d3748", cursor: "default", opacity: 0.8, flex: 1 } : { flex: 1 }}
                      >
                        {jaFezIn ? "✔ CHECK-IN FEITO" : "CHECK-IN"}
                      </button>

                      <button
                        className={`btn-ponto out ${jaFezOut ? "concluido" : ""}`}
                        disabled={jaFezOut || !jaFezIn}
                        onClick={() => {
                          if (!jaFezIn) {
                            exibirPopup("Faça o check-in primeiro!", "erro");
                            return;
                          }
                          if (!isDiaDeAula || !podeCheckOut) {
                            exibirPopup("Check-out liberado a partir das 21:30", "erro");
                            return;
                          }
                          setFeedback({ ...feedback, modal: true });
                        }}
                        style={(jaFezOut || !jaFezIn) ? { backgroundColor: "#2d3748", cursor: "default", opacity: 0.6, flex: 1 } : { flex: 1 }}
                      >
                        {jaFezOut ? "✔ CHECK-OUT FEITO" : "CHECK-OUT"}
                      </button>
                    </div>

                    <div style={{
                      background: "rgba(0, 128, 128, 0.05)",
                      padding: "20px",
                      borderRadius: "12px",
                      border: "1px solid rgba(0, 128, 128, 0.1)",
                      width: "100%",
                      boxSizing: "border-box"
                    }}>
                      <h5 style={{ margin: "0 0 15px 0", color: "#008080", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                        🕒 Janelas Oficiais de Registro
                      </h5>
                      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: "block", color: "var(--text-dim)", fontSize: "0.65rem", marginBottom: "5px" }}>ENTRADA</span>
                          <strong style={{ fontSize: "1.1rem" }}>18:00 — 20:30</strong>
                        </div>
                        <div style={{ width: "1px", height: "30px", background: "rgba(0,128,128,0.2)" }}></div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: "block", color: "var(--text-dim)", fontSize: "0.65rem", marginBottom: "5px" }}>SAÍDA</span>
                          <strong style={{ fontSize: "1.1rem" }}>Após 21:30</strong>
                        </div>
                      </div>
                      <p style={{ margin: "15px 0 0 0", fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                        * Sábados (Data Analytics): 08:00 — 10:00 | Saída: Após 11:30
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="stats-grid" style={{ marginTop: "30px" }}>
              <div className="stat-card">
                <span className="stat-label">Total de Presenças</span>
                <div className="stat-value">{totalPresencas}</div>
              </div>
              
              <div className="stat-card" style={{ textAlign: "left" }}>
                <span className="stat-label">📅 Próximas Aulas</span>
                <ul style={{ paddingLeft: "15px", margin: "10px 0" }}>
                  {getProximasAulas(user.formacao).map((data, i) => (
                    <li key={i} style={{ marginBottom: "5px", color: data === "26/02/2026" ? "var(--blue-light)" : "inherit" }}>
                      <span style={{ fontWeight: "bold" }}>{data}</span>
                      <span style={{ fontSize: "0.75rem", opacity: 0.8, marginLeft: "8px" }}>
                        {data === "26/02/2026" ? "🚀 Aula Inaugural" : "18:00h"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="stat-card">
                <span className="stat-label">Total de Faltas</span>
                <div className="stat-value faltas">{totalFaltas}</div>
              </div>

              <div className="stat-card">
                <span className="stat-label">Status da Sessão</span>
                <div className="stat-value text-success" style={{ fontSize: "1.2rem" }}>Ativa</div>
              </div>
            </div>
          </div>

          {/* HISTÓRICO COMPLETO - AGORA ALINHADO PERFEITAMENTE */}
          <div id="historico-section" className="historico-container shadow-card" style={{ width: "100%", boxSizing: "border-box", padding: "20px" }}>
            <h3>Meu Histórico Completo</h3>
            <div className="table-responsive">
              <table className="historico-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: "center", color: "var(--text-dim)" }}>Nenhum registro encontrado.</td></tr>
                  ) : (
                    historico.map((h, i) => (
                      <tr key={i}>
                        <td>{new Date(h.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                        <td>{h.check_in ? (h.check_in.includes("T") ? h.check_in.split("T")[1].substring(0, 5) : h.check_in.substring(0, 5)) : "--:--"}</td>
                        <td>{h.check_out ? (h.check_out.includes("T") ? h.check_out.split("T")[1].substring(0, 5) : h.check_out.substring(0, 5)) : "--:--"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* MODAL DE FEEDBACK (FORA DO WRAPPER DE LARGURA) */}
      {feedback.modal && (
        <div className="modal-overlay">
          <div className="modal-content shadow-xl">
            <h3>Finalizar Check-out</h3>
            <p className="text-muted" style={{ marginBottom: "15px" }}>Como foi sua experiência na aula de hoje?</p>
            <div className="rating-group" style={{ display: "flex", gap: "10px", margin: "15px 0", justifyContent: "center", alignItems: "center", color: "var(--text-dim)" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={`btn-rating ${feedback.nota === n ? "active" : ""}`} onClick={() => setFeedback({ ...feedback, nota: n })}>{n}</button>
              ))}
            </div>
            <textarea className="input-notes" placeholder="Algum comentário ou dúvida?" value={feedback.revisao} onChange={(e) => setFeedback({ ...feedback, revisao: e.target.value })} />
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button className="btn-ponto in" onClick={() => baterPonto({ nota: feedback.nota, revisao: feedback.revisao })}>Confirmar Saída</button>
              <button className="btn-secondary" onClick={() => setFeedback({ ...feedback, modal: false })}>Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}