const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Verificação de segurança para as chaves do Supabase e JWT
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

const CLASSROOM_LAT = Number(process.env.CLASSROOM_LAT);
const CLASSROOM_LNG = Number(process.env.CLASSROOM_LNG);
const CHECKIN_RADIUS_METERS = Number(process.env.CHECKIN_RADIUS_METERS || 120);

if (!supabaseUrl || !supabaseKey || !JWT_SECRET) {
  console.error(
    "ERRO: Variáveis de ambiente (SUPABASE ou JWT_SECRET) não configuradas!",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// MIDDLEWARES DE SEGURANÇA
// ==========================================

const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(403)
      .json({ error: "Acesso negado. Faça login novamente." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioLogado = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Sua sessão expirou. Entre novamente." });
  }
};

const verificarAdmin = (req, res, next) => {
  if (req.usuarioLogado.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Acesso restrito a administradores." });
  }
  next();
};

// ==========================================
// HELPERS
// ==========================================

const getBrasiliaTime = () => {
  const agora = new Date();
  const brasilia = new Date(
    agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const data = brasilia.toISOString().split("T")[0];
  const hora = brasilia.toLocaleTimeString("pt-BR", { hour12: false });
  return { data, hora };
};

// ==========================================
// LOCALIZAÇÃO

const toRad = (value) => (value * Math.PI) / 180;

const calcularDistanciaMetros = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const TEST_LOCATION_LAT = Number(process.env.TEST_LOCATION_LAT);
const TEST_LOCATION_LNG = Number(process.env.TEST_LOCATION_LNG);

const validarLocalCheckin = (latitude, longitude) => {
  if (!Number.isFinite(CLASSROOM_LAT) || !Number.isFinite(CLASSROOM_LNG)) {
    throw new Error("Local da sala não configurado no servidor.");
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      ok: false,
      distancia: null,
      origem: "fora",
    };
  }

  const distanciaSala = calcularDistanciaMetros(
    latitude,
    longitude,
    CLASSROOM_LAT,
    CLASSROOM_LNG,
  );

  const dentroSala = distanciaSala <= CHECKIN_RADIUS_METERS;

  let distanciaTeste = null;
  let dentroTeste = false;

  if (
    Number.isFinite(TEST_LOCATION_LAT) &&
    Number.isFinite(TEST_LOCATION_LNG)
  ) {
    distanciaTeste = calcularDistanciaMetros(
      latitude,
      longitude,
      TEST_LOCATION_LAT,
      TEST_LOCATION_LNG,
    );

    dentroTeste = distanciaTeste <= CHECKIN_RADIUS_METERS;
  }

  return {
    ok: dentroSala || dentroTeste,
    distancia: dentroSala ? distanciaSala : distanciaTeste,
    origem: dentroSala ? "sala" : dentroTeste ? "teste" : "fora",
  };
};

// ==========================================
// LOGIN E PERFIL
// ==========================================

app.post("/api/login", async (req, res) => {
  const { email, dataNascimento, formacao } = req.body;

  if (!email || !dataNascimento) {
    return res.status(400).json({ error: "Dados obrigatórios ausentes." });
  }

  const emailFormatado = email.trim().toLowerCase();

  // ==========================================
  // LOGIN ADMIN
  // ==========================================
  if (
    emailFormatado === process.env.ADMIN_EMAIL &&
    dataNascimento === process.env.ADMIN_PASS
  ) {
    const token = jwt.sign(
      { email: emailFormatado, role: "admin" },
      JWT_SECRET,
      { expiresIn: "720h" },
    );
    return res.json({
      nome: "Administrador",
      role: "admin",
      email: emailFormatado,
      token,
    });
  }

  try {
    const { data: alunos, error } = await supabase
      .from("alunos")
      .select("*")
      .eq("email", emailFormatado);

    if (error) throw error;

    let aluno;

    if (!alunos || alunos.length === 0) {
      const { data: novoAluno, error: insertError } = await supabase
        .from("alunos")
        .insert([
          {
            email: emailFormatado,
            data_nascimento: dataNascimento,
            formacao: formacao,
          },
        ])
        .select();

      if (insertError) throw insertError;
      aluno = novoAluno[0];
    } else {
      aluno = alunos[0];

      if (aluno.data_nascimento) {
        const dataBancoSrt = new Date(aluno.data_nascimento)
          .toISOString()
          .split("T")[0];

        if (dataBancoSrt !== dataNascimento) {
          return res
            .status(401)
            .json({ error: "Data de nascimento incorreta." });
        }
      }

      if (aluno.formacao && formacao && aluno.formacao !== formacao) {
        return res.status(403).json({
          error: `Você já está registrado na formação ${aluno.formacao}. Não é permitido acesso duplicado em outra turma.`,
        });
      }

      if (formacao && !aluno.formacao) {
        await supabase
          .from("alunos")
          .update({ formacao })
          .eq("email", emailFormatado);
        aluno.formacao = formacao;
      }
    }

    // GERA TOKEN PARA ALUNO
    const token = jwt.sign(
      { id: aluno.id, email: aluno.email, role: "aluno" },
      JWT_SECRET,
      { expiresIn: "720h" },
    );

    res.json({ ...aluno, role: "aluno", token });
  } catch (err) {
    console.error("ERRO NO LOGIN:", err);
    res.status(500).json({ error: "Erro interno no servidor de login." });
  }
});

app.get("/api/aluno/perfil/:email", verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("alunos")
      .select("*")
      .eq("email", req.params.email.trim().toLowerCase())
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("ERRO AO BUSCAR PERFIL:", err);
    res.status(500).json({ error: "Erro ao carregar dados do perfil." });
  }
});

app.put("/api/aluno/perfil", verificarToken, async (req, res) => {
  const { email, nome, avatar } = req.body;
  try {
    const { error } = await supabase
      .from("alunos")
      .update({ nome, avatar })
      .eq("email", email.trim().toLowerCase());

    if (error) throw error;
    res.json({ msg: "Dados atualizados com sucesso!" });
  } catch (err) {
    console.error("ERRO PERFIL:", err);
    res.status(500).json({ error: "Erro interno ao salvar perfil." });
  }
});

// ==========================================
// REGISTRAR PONTO - PROTEGIDA
// ==========================================
app.post("/api/ponto", verificarToken, async (req, res) => {
  console.log("BODY /api/ponto:", req.body);

  try {
    const { aluno_id, nota, revisao, latitude, longitude } = req.body;

    if (!aluno_id || typeof aluno_id !== "string") {
      return res.status(400).json({
        error: "aluno_id não enviado ou inválido.",
      });
    }

    const { data: hoje, hora: agora } = getBrasiliaTime();
    const timestampCompleto = `${hoje}T${agora}`;
    const emailBusca = aluno_id.trim().toLowerCase();

    const { data: pontoExistente, error: fetchError } = await supabase
      .from("presencas")
      .select("*")
      .eq("aluno_email", emailBusca)
      .eq("data", hoje)
      .maybeSingle();

    if (fetchError) {
      console.error("ERRO fetch presencas:", fetchError);
      return res.status(500).json({
        error: fetchError.message || "Erro ao buscar presença do dia.",
        details: fetchError,
      });
    }

    if (!pontoExistente) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          error:
            "Localização não recebida. Ative a localização e tente novamente.",
        });
      }

      const latitudeNum = Number(latitude);
      const longitudeNum = Number(longitude);

      if (!Number.isFinite(latitudeNum) || !Number.isFinite(longitudeNum)) {
        return res.status(400).json({
          error: "Localização inválida.",
        });
      }

      const validacaoLocal = validarLocalCheckin(latitudeNum, longitudeNum);

      console.log("VALIDACAO LOCAL:", {
        latitude,
        longitude,
        latitudeNum,
        longitudeNum,
        CLASSROOM_LAT,
        CLASSROOM_LNG,
        CHECKIN_RADIUS_METERS,
        validacaoLocal,
      });

      if (!validacaoLocal.ok) {
        return res.status(403).json({
          error: "Check-in permitido somente no endereço da aula.",
          distancia: validacaoLocal.distancia,
        });
      }

      const payloadInsert = {
        aluno_email: emailBusca,
        data: hoje,
        check_in: timestampCompleto,
        checkin_latitude: latitudeNum,
        checkin_longitude: longitudeNum,
        checkin_distancia_metros: validacaoLocal.distancia,
        checkin_local_valido: true,
      };

      console.log("INSERT PRESENCAS:", payloadInsert);

      const { data: novoPonto, error: insError } = await supabase
        .from("presencas")
        .insert([payloadInsert])
        .select();

      if (insError) {
        console.error("ERRO insert presencas:", insError);
        return res.status(500).json({
          error: insError.message || "Erro ao inserir check-in.",
          details: insError,
        });
      }

      return res.json({
        msg: "Check-in realizado com sucesso!",
        ponto: novoPonto[0],
      });
    }

    if (pontoExistente.check_out) {
      return res.json({ msg: "Você já concluiu sua presença de hoje." });
    }

    const { data: pontoAtualizado, error: updError } = await supabase
      .from("presencas")
      .update({
        check_out: timestampCompleto,
        feedback_nota: nota || null,
        feedback_texto: revisao || "",
      })
      .eq("id", pontoExistente.id)
      .select();

    if (updError) {
      console.error("ERRO update presencas:", updError);
      return res.status(500).json({
        error: updError.message || "Erro ao registrar check-out.",
        details: updError,
      });
    }

    return res.json({
      msg: "Check-out realizado com sucesso!",
      ponto: pontoAtualizado[0],
    });
  } catch (err) {
    console.error("ERRO NO PONTO:", err);
    return res.status(500).json({
      error: err.message || "Erro ao processar presença.",
      details: err,
    });
  }
});

// ==========================================
// ADMIN (TODAS PROTEGIDAS POR TOKEN + ADMIN)
// ==========================================

app.get(
  "/api/admin/busca",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { termo, turma, status, dataFiltro } = req.query;
    const { data: hoje } = getBrasiliaTime();
    const dataAlvo = dataFiltro || hoje;

    try {
      let query = supabase.from("alunos").select("*");
      if (turma && turma !== "todos") query = query.eq("formacao", turma);
      if (termo)
        query = query.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`);
      if (status === "incompleto") query = query.or("nome.is.null");

      const { data: alunos, error } = await query;
      if (error) throw error;

      let resultadoFinal = alunos;
      if (
        status === "pendente_saida" ||
        status === "checkout_antecipado" ||
        status === "presentes_no_dia"
      ) {
        const { data: presencas } = await supabase
          .from("presencas")
          .select("aluno_email, check_out")
          .eq("data", dataAlvo);

        let emailsFiltrados = [];

        if (status === "pendente_saida") {
          emailsFiltrados = presencas
            .filter((p) => !p.check_out)
            .map((p) => p.aluno_email);
        } else if (status === "checkout_antecipado") {
          emailsFiltrados = presencas
            .filter((p) => {
              if (!p.check_out) return false;

              // Extrair apenas HH:mm
              let horaExtraida = p.check_out.includes("T")
                ? p.check_out.split("T")[1].substring(0, 5)
                : p.check_out.substring(0, 5);

              // Descobrir o dia da semana dessa presença específica
              const dataPresenca = new Date(p.data);
              const eSabado = dataPresenca.getUTCDay() === 6;

              // Se for sábado, cedo é antes das 12:00.
              // Se for dia de semana, cedo é antes das 22:00.
              const horaLimiteSaida = eSabado ? "12:00" : "22:00";

              return horaExtraida < horaLimiteSaida;
            })
            .map((p) => p.aluno_email);
        } else if (status === "presentes_no_dia") {
          emailsFiltrados = presencas.map((p) => p.aluno_email);
        }

        resultadoFinal = alunos.filter((a) =>
          emailsFiltrados.includes(a.email),
        );
      }
      const { data: todasPresencas, error: erroP } = await supabase
        .from("presencas")
        .select("aluno_email, data");

      if (erroP) console.error("Erro ao buscar presenças:", erroP);
      const contarAulasPassadas = () => {
        const dataInicio = new Date("2026-03-02"); // Data de início do Leão Tech
        let contagem = 0;
        let d = new Date(dataInicio);

        while (d <= hoje) {
          const dia = d.getDay();
          // Se for Fullstack (1,3,5) ou Data Analytics (2,4,6)
          // Uma lógica simples: conta se não for domingo (0)
          if (dia !== 0) contagem++;
          d.setDate(d.getDate() + 1);
        }
        // Como são ~3 aulas por semana por curso:
        return Math.floor(contagem / 2); // Ajuste grosseiro até você separar por turma
      };

      const aulasOcorridas = contarAulasPassadas();

      const resultadoFinalComCalculos = resultadoFinal.map((aluno) => {
        const emailAlu = aluno.email?.trim().toLowerCase();
        const presencasConfirmadas = todasPresencas
          ? todasPresencas.filter(
              (p) => p.aluno_email?.trim().toLowerCase() === emailAlu,
            ).length
          : 0;
        const faltasReais = Math.max(0, aulasOcorridas - presencasConfirmadas);

        return {
          ...aluno,
          total_presencas: presencasConfirmadas,
          total_faltas: faltasReais,
        };
      });
      res.json({
        total: resultadoFinalComCalculos.length,
        alunos: resultadoFinalComCalculos,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro na busca administrativa." });
    }
  },
);

app.put(
  "/api/admin/aluno/:email",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { nome, email, data_nascimento } = req.body;
    const emailOriginal = decodeURIComponent(req.params.email);
    try {
      const { error } = await supabase
        .from("alunos")
        .update({ nome, email, data_nascimento })
        .eq("email", emailOriginal);
      if (error) throw error;
      res.json({ msg: "Dados atualizados com sucesso" });
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar aluno." });
    }
  },
);

app.delete(
  "/api/admin/aluno/:email",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const emailOriginal = decodeURIComponent(req.params.email);
    try {
      await supabase
        .from("presencas")
        .delete()
        .eq("aluno_email", emailOriginal);
      const { error } = await supabase
        .from("alunos")
        .delete()
        .eq("email", emailOriginal);
      if (error) throw error;
      res.json({ msg: "Cadastro excluído com sucesso!" });
    } catch (err) {
      res.status(500).json({ error: "Erro ao excluir cadastro." });
    }
  },
);

app.post(
  "/api/admin/ponto-manual",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { email, data, check_in, check_out, nota, revisao } = req.body;

    const montarTimestamp = (valorHora) => {
      if (!valorHora) return null;
      if (valorHora.includes("T")) return valorHora;
      return `${data}T${valorHora}:00`;
    };

    try {
      const { data: novoPonto, error } = await supabase
        .from("presencas")
        .insert([
          {
            aluno_email: email.trim().toLowerCase(),
            data: data,
            check_in: montarTimestamp(check_in),
            check_out: montarTimestamp(check_out),
            feedback_nota: nota || null,
            feedback_texto: revisao || "",
          },
        ])
        .select();

      if (error) {
        console.error("ERRO SUPABASE:", error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ msg: "Ponto manual registrado!", ponto: novoPonto[0] });
    } catch (err) {
      console.error("ERRO SERVIDOR:", err);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  },
);

app.post(
  "/api/admin/reset-session",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    res.json({ msg: "Reset solicitado." });
  },
);

app.patch(
  "/api/admin/limpeza-nome",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { email, nome } = req.body;

    if (!email || nome === undefined) {
      return res.status(400).json({ error: "E-mail e nome são obrigatórios." });
    }

    try {
      const { error } = await supabase
        .from("alunos")
        .update({ nome: nome.trim() })
        .eq("email", email.trim().toLowerCase());

      if (error) throw error;

      res.json({ msg: "Nome atualizado com sucesso!" });
    } catch (err) {
      console.error("ERRO LIMPEZA:", err);
      res.status(500).json({ error: "Erro ao atualizar nome no banco." });
    }
  },
);

app.get("/api/historico/aluno/:email", verificarToken, async (req, res) => {
  try {
    const emailFormatado = req.params.email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("presencas")
      .select("*")
      .eq("aluno_email", emailFormatado)
      .order("data", { ascending: false });

    if (error) throw error;

    const historicoFormatado = data.map((item) => ({
      ...item,
      data: item.data.includes("T") ? item.data.split("T")[0] : item.data,
    }));

    res.json(historicoFormatado);
  } catch (err) {
    console.error("ERRO HISTORICO:", err);
    res.status(500).json({ error: "Erro ao carregar histórico." });
  }
});

app.get(
  "/api/admin/stats/:turma",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { turma } = req.params;
    const { dataFiltro } = req.query;
    const { data: hoje } = getBrasiliaTime();
    const dataAlvo = dataFiltro || hoje;

    try {
      // 1. Lista de emails da turma (para saber quem pertence a onde)
      let queryAlunos = supabase.from("alunos").select("email");
      if (turma !== "todos") queryAlunos = queryAlunos.eq("formacao", turma);

      const { data: listaAlunos, error: errA } = await queryAlunos;
      if (errA) throw errA;

      const emailsTurma = (listaAlunos || []).map((a) => a.email);

      // 2. Total Histórico (Geral da turma ou do sistema)
      let queryTotal = supabase
        .from("presencas")
        .select("*", { count: "exact", head: true });
      if (turma !== "todos") {
        queryTotal = queryTotal.in("aluno_email", emailsTurma);
      }
      const { count: totalPresencas } = await queryTotal;

      // 3. Dados dos Círculos (Baseados na dataAlvo)
      let queryHoje = supabase
        .from("presencas")
        .select("check_in, check_out")
        .eq("data", dataAlvo);
      if (turma !== "todos") {
        queryHoje = queryHoje.in("aluno_email", emailsTurma);
      }

      const { data: presencasDia, error: errH } = await queryHoje;
      if (errH) throw errH;

      const dados = presencasDia || [];

      // AQUI ESTAVA O ERRO: Use listaAlunos.length em vez de totalAlunos
      res.json({
        totalPresencas: totalPresencas || 0,
        totalAlunos: (listaAlunos || []).length, // Corrigido aqui
        sessoesAtivas: dados.length,
        concluidosHoje: dados.filter((p) => p.check_out).length,
        pendentesSaida: dados.filter((p) => !p.check_out).length,
      });
    } catch (err) {
      console.error("ERRO NO STATS:", err);
      res.status(500).json({ error: "Erro ao carregar estatísticas." });
    }
  },
);
app.get(
  "/api/admin/relatorio/:turma",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { turma } = req.params;
    const { inicio, fim } = req.query;
    try {
      let query = supabase
        .from("alunos")
        .select(
          "nome, email, formacao, presencas(data, check_in, check_out, feedback_nota, feedback_texto)",
        );

      if (turma !== "todos") query = query.eq("formacao", turma);

      const { data, error } = await query;
      if (error) throw error;

      const relatorioFormatado = [];

      data.forEach((aluno) => {
        const nomeAluno = aluno.nome || "Não cadastrado";
        const formacaoAluno = aluno.formacao || "Não informada";

        if (aluno.presencas && aluno.presencas.length > 0) {
          aluno.presencas.forEach((p) => {
            if (inicio && p.data < inicio) return;
            if (fim && p.data > fim) return;
            const formatarHoraBruta = (valor) => {
              if (!valor) return "-";
              return valor.includes("T")
                ? valor.split("T")[1].substring(0, 5)
                : valor.substring(0, 5);
            };

            relatorioFormatado.push({
              Nome: nomeAluno,
              Email: aluno.email,
              Formacao: formacaoAluno,
              Data: p.data,
              Entrada: formatarHoraBruta(p.check_in),
              Saida: formatarHoraBruta(p.check_out),
              Nota: p.feedback_nota || "N/A",
              Feedback: p.feedback_texto || "",
            });
          });
        }
      });

      res.json(relatorioFormatado);
    } catch (err) {
      res.status(500).json({ error: "Erro ao gerar relatório." });
    }
  },
);

app.get("/api/health", (_, res) => res.json({ status: "online" }));

if (process.env.NODE_ENV !== "production") {
  app.listen(3001, () =>
    console.log("🚀 Backend rodando em http://localhost:3001"),
  );
}

module.exports = app;
