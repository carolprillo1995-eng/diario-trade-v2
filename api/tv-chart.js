// Retorna chart state vazio para TradingView — sem indicadores salvos
module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { action } = req.query;

  if (action === "load") {
    // Retorna chart vazio sem estudos
    return res.json({
      status: "ok",
      data: JSON.stringify({
        version: 2,
        charts: [{
          panes: [{
            sources: [{ type: "MainSeries", id: "mainSeries", state: {} }],
            leftAxisState: {}, rightAxisState: {}, topAxisState: {}, bottomAxisState: {}
          }],
          timeScale: {}
        }]
      })
    });
  }

  if (action === "save") {
    return res.json({ status: "ok", id: "empty" });
  }

  if (action === "list") {
    return res.json({ status: "ok", data: [] });
  }

  if (action === "remove") {
    return res.json({ status: "ok" });
  }

  return res.json({ status: "ok" });
};
