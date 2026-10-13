// Vercel Serverless Function: GET /api/live
const fs = require('fs');
const path = require('path');
const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Find dataset from file system
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'ipu_latest.json'),
    path.join(__dirname, '..', 'data', 'ipu_latest.json'),
    path.join(__dirname, 'data', 'ipu_latest.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).send(raw);
      } catch (err) {
        console.error('File read error:', err);
      }
    }
  }

  return res.status(500).json({ error: 'Data not available' });
};
