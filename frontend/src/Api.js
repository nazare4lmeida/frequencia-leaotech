import { API_URL } from "./Constants";

/**
 * Função utilitária para fazer requisições autenticadas
 * @param {string} endpoint - O caminho da rota (ex: '/ponto')
 * @param {string} method - GET, POST, PUT, DELETE
 * @param {object} body - Dados para enviar (opcional)
 */
export const fetchComToken = async (endpoint, method = "GET", body = null) => {
  // 1. Busca a sessão atualizada para pegar o token
  const session = JSON.parse(localStorage.getItem("leaotech_session"));
  const token = session?.userData?.token;

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${endpoint}`, config);

  // 2. TRATAMENTO GLOBAL DE ERRO 401 (TOKEN EXPIRADO)
  if (res.status === 401) {
    localStorage.removeItem("leaotech_session");
    window.location.reload(); // Força o refresh para voltar ao login
    return;
  }

  return res;
};
