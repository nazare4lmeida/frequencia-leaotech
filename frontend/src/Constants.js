export const API_URL = 
  window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api";

export const FORMACOES = [
  { id: "fullstack", nome: "Dev Web Full Stack", tag: "WEB" },
  { id: "data_analytics", nome: "Data Analytics", tag: "DATA" },
];

export const getNomeFormacao = (id) => {
  return FORMACOES.find(f => f.id === id)?.nome || "Não informada";
};