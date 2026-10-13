---
description: session handoff, regenerate with /handoff when a quest finishes
budget_tokens: 1000
---
# STATUS — Jerebu Monitor (IPU Malaysia)

> Single source of truth for resuming work. Read this FIRST when starting a session.
> Last updated: 2026-10-13

---

## ✅ Done

### Fasa 4: Full-Bleed PWA Viewport & Autocomplete
- **100% Full-Bleed Mobile Layout:** Dikunci dengan `position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; height: -webkit-fill-available;`.
- **Edge-to-Edge Bottom Dock:** `#leftSidebar` melekat kemas ke birai bawah (`bottom: 0; border-radius: 22px 22px 0 0;`) mengikut `env(safe-area-inset-bottom)`.
- **Zero Bottom Gap Resolved:** Menghapuskan petak kosong bawah skrin pada iPhone/Android PWA standalone.
- **Leaflet Tile Invalidation:** Panggilan automatik `state.map.invalidateSize()` secara berperingkat (0ms, 200ms, 600ms, 1200ms) dan pada acara `resize` / `orientationchange`.
- **PWA Service Worker v2.2.1:** Dikuatkuasakan strategi *Network-First* untuk dokumen HTML dan kemas kini automatik melalui acara `controllerchange`.
- **Instant Search Autocomplete:** Carian stesen masa nyata dengan penapis lungsur (*live dropdown filter*), statistik padanan stesen, dan penumpuan stesen automatik.

### Fasa 1 - 3: Teras Data, Peta 3D & Perbandingan
- Scraper Patchright rasmi DOE APIMS (68 stesen) + perbandingan AQICN (NowCast).
- Peta Satelit ArcGIS World Imagery + Lapisan Kabut Jerebu Atmosfera (*Atmospheric Haze Fog Shroud*).
- Panel laci stesen (*Station Detail Drawer*) & Modal Perbandingan Bersebelahan.

---

## 🚀 Next phase (Fasa 5)

**Goal:** Membangunkan modul analisis trajektori jerebu rentas sempadan monsun dan sistem amaran kesihatan berasaskan zon risiko.

### Acceptance criteria
1. Visualisasi unjuran arah angin jerebu monsun barat daya di peta satelit.
2. Pemberitahuan amaran zon Tidak Sihat (IPU > 100) dan Sangat Tidak Sihat (IPU > 200).
3. Nasihat kesihatan berstruktur KKM mengikut status kualiti udara setempat.

### Files to create / edit
| Type | File | Content |
|---|---|---|
| edit | `app.js` & `static/app.js` | Logik trajektori angin dan enjin amaran zon |
| edit | `style.css` & `static/style.css` | Gaya visual vektor arah angin dan kad amaran |
| edit | `index.html` & `static/index.html` | Butang kawalan lapisan trajektori angin |

### Closed decisions
- Folder rasmi WAJIB `/Users/halimroslan/Desktop/Kod Sumber (Antigravity)/IPU Malaysia Web App`.
- Mobile summary card kekal berlabuh di birai bawah sebagai sheet native.

---

## 📁 Active architecture

- **Stack:** Vanilla HTML5, Vanilla CSS (Design Tokens, Glassmorphism), ES6+ Vanilla JS, Leaflet 1.9.4, Python 3.9 HTTP Daemon.
- **Port:** Localhost `20140`.
- **Patterns:** Dwi-folder sync (`/` dan `/static/`), Network-First Service Worker, Full-Bleed WebApp positioning.

---

## 🔧 Useful commands

```bash
# Jalankan pelayan pembangunan tempatan
python3 server.py

# Semak status dan daemon scraper
curl http://localhost:20140/api/status

# Ujian headless mobile Playwright
python3 -c "from patchright.sync_api import sync_playwright; ..."
```
