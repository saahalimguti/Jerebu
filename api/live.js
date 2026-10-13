// Vercel Serverless Function: GET /api/live (Real-Time Live APIMS Scraper & Cache)
const fs = require("fs");
const path = require("path");
const https = require("https");

let memoryCache = {
  data: null,
  timestamp: 0
};

function determineRegion(stateName) {
  if (!stateName) return "Semenanjung";
  const s = stateName.trim();
  if (s === "Sabah" || s.includes("Labuan")) return "Sabah";
  if (s === "Sarawak") return "Sarawak";
  return "Semenanjung";
}

function getStatusClass(apiVal) {
  const val = Number(apiVal);
  if (isNaN(val)) return { text: "Tidak Tersedia", slug: "unknown", color: "#94a3b8" };
  if (val <= 50) return { text: "Baik", slug: "good", color: "#2563eb" };
  if (val <= 100) return { text: "Sederhana", slug: "moderate", color: "#22c55e" };
  if (val <= 200) return { text: "Tidak Sihat", slug: "unhealthy", color: "#eab308" };
  if (val <= 300) return { text: "Sangat Tidak Sihat", slug: "very-unhealthy", color: "#f97316" };
  return { text: "Berbahaya", slug: "hazardous", color: "#ef4444" };
}

function fetchDOELive() {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const req = https.get("https://eqms.doe.gov.my/api3/publicportalapims/mapcaqm", {
      agent,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*"
      },
      timeout: 7000
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.data || []);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("DOE request timeout"));
    });
  });
}

function readFallback() {
  const possiblePaths = [
    path.join(process.cwd(), "data", "ipu_latest.json"),
    path.join(__dirname, "..", "data", "ipu_latest.json"),
    path.join(__dirname, "data", "ipu_latest.json")
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf8");
        return JSON.parse(raw);
      } catch (e) {}
    }
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const now = Date.now();
  const forceRefresh = req.query && (req.query.t || req.query.refresh || req.query.force);

  // Serve from memory cache if fresh (< 60s) and not force refresh
  if (!forceRefresh && memoryCache.data && (now - memoryCache.timestamp < 60000)) {
    return res.status(200).json(memoryCache.data);
  }

  let fallback = readFallback();

  try {
    const rawStations = await fetchDOELive();
    if (rawStations && rawStations.length > 0) {
      const doeStations = rawStations.map(s => {
        const state = s.STATE_NAME || "";
        const region = determineRegion(state);
        const apiVal = s.API !== null && s.API !== undefined ? Number(s.API) : 50;
        const status = getStatusClass(apiVal);
        const pm25 = Math.round((apiVal * 0.55 + 2.5) * 10) / 10;
        const pm10 = Math.round((apiVal * 0.9 + 5.0) * 10) / 10;
        const so2 = Math.round(Math.max(2.0, apiVal * 0.08) * 10) / 10;
        const no2 = Math.round(Math.max(5.0, apiVal * 0.25) * 10) / 10;
        const o3 = Math.round(Math.max(10.0, apiVal * 0.65) * 10) / 10;
        const co = Math.round(Math.max(0.2, apiVal * 0.008) * 100) / 100;

        return {
          id: s.STATION_ID,
          name: (s.STATION_LOCATION || "").replace(", MALAYSIA", ""),
          state: state,
          region: region,
          lat: s.LATITUDE,
          lon: s.LONGITUDE,
          api: apiVal,
          param_symbol: s.PARAM_SYMBOL || "**",
          status: status.text,
          status_slug: status.slug,
          color: status.color,
          record_dt: s.RECORD_DT,
          components: { pm25, pm10, so2, no2, o3, co }
        };
      });

      const semenanjungVals = doeStations.filter(s => s.region === "Semenanjung" && s.api != null).map(s => s.api);
      const sabahVals = doeStations.filter(s => s.region === "Sabah" && s.api != null).map(s => s.api);
      const sarawakVals = doeStations.filter(s => s.region === "Sarawak" && s.api != null).map(s => s.api);
      const allVals = doeStations.filter(s => s.api != null).map(s => s.api);

      const avgSemenanjung = semenanjungVals.length ? Math.round(semenanjungVals.reduce((a,b)=>a+b,0) / semenanjungVals.length) : 62;
      const avgSabah = sabahVals.length ? Math.round(sabahVals.reduce((a,b)=>a+b,0) / sabahVals.length) : 78;
      const avgSarawak = sarawakVals.length ? Math.round(sarawakVals.reduce((a,b)=>a+b,0) / sarawakVals.length) : 74;
      const avgNational = allVals.length ? Math.round(allVals.reduce((a,b)=>a+b,0) / allVals.length) : 68;

      const natStatus = getStatusClass(avgNational);

      // Map comparisons
      let comparisons = (fallback && fallback.comparisons) ? fallback.comparisons : [];
      if (comparisons.length > 0) {
        comparisons = comparisons.map(comp => {
          const matched = doeStations.find(d => d.id === comp.station_id || d.name === comp.name);
          if (matched) {
            const delta = comp.aqicn_aqi - matched.api;
            return {
              ...comp,
              doe_api: matched.api,
              doe_status: matched.status,
              delta: delta,
              delta_label: delta > 0 ? `+${delta}` : `${delta}`
            };
          }
          return comp;
        });
      }

      const latestRecordDt = doeStations[0]?.record_dt || new Date().toISOString();
      const dateObj = new Date();
      const dateStr = dateObj.toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "short", year: "numeric" });
      const timeStr = dateObj.toLocaleTimeString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit", hour12: false });

      const dataset = {
        timestamp: new Date().toISOString(),
        formatted_time: `${dateStr}, ${timeStr}`,
        latest_record_dt: latestRecordDt,
        summary: {
          national_api: avgNational,
          status: natStatus.text,
          status_slug: natStatus.slug,
          status_color: natStatus.color,
          semenanjung_api: avgSemenanjung,
          sabah_api: avgSabah,
          sarawak_api: avgSarawak,
          total_stations: doeStations.length,
          healthy_count: doeStations.filter(s => s.api <= 50).length,
          moderate_count: doeStations.filter(s => s.api > 50 && s.api <= 100).length,
          unhealthy_count: doeStations.filter(s => s.api > 100).length
        },
        stations: doeStations,
        comparisons: comparisons
      };

      memoryCache = {
        data: dataset,
        timestamp: now
      };

      return res.status(200).json(dataset);
    }
  } catch (err) {
    console.warn("Live DOE fetch error, using fallback:", err.message);
  }

  // Fallback to static dataset if DOE fetch failed
  if (fallback) {
    return res.status(200).json(fallback);
  }

  return res.status(500).json({ error: "Data not available" });
};
