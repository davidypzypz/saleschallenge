// Configuración del mapa del reto. Edita solo este archivo para conectar tu Google Sheet.
window.CHALLENGE_CONFIG = {
  // Pega aquí el link de "Publicar en la Web" de la pestaña Resumen, en formato CSV.
  // Instrucciones completas en el README del repositorio.
  csvUrl: "",

  title: "La Sombra de Mordor",
  subtitle: "Reto de ventas — 1 de octubre al 2 de noviembre",

  // Cada cuánto se vuelve a consultar el Sheet (milisegundos).
  refreshMs: 5 * 60 * 1000,

  // Fechas del reto, solo para mostrar el estado (antes / durante / después).
  startDate: "2026-10-01",
  endDate: "2026-11-02",
};
