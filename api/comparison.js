// Vercel Serverless Function: GET /api/comparison
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const possiblePaths = [
    path.join(process.cwd(), 'data', 'ipu_latest.json'),
    path.join(__dirname, '..', 'data', 'ipu_latest.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const data = JSON.parse(raw);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).json(data.comparisons || []);
      } catch (err) {
        console.error('Error reading comparisons:', err);
      }
    }
  }

  return res.status(200).json([]);
};
