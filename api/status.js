// Vercel Serverless Function: GET /api/status
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).json({
    status: 'online',
    platform: 'vercel-serverless',
    app: 'Jerebu Monitor (IPU Malaysia)',
    server_time: new Date().toISOString()
  });
};
