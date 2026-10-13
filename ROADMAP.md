# 🗺️ ROADMAP: Jerebu Monitor (IPU Malaysia)

### 📌 Milestone 1: Teras Data & Automasi (Status: ✅ Selesai)
- [x] Enjin pengikis data rasmi DOE APIMS Malaysia (68 stesen).
- [x] Pengkalan data JSON masa nyata (`data/ipu_latest.json`).
- [x] GitHub Actions workflow cron scraping setiap jam (`hourly_scraper.yml`).
- [x] Pelayan mikro Python tempatan dengan daemon automasi (`server.py`).

### 📌 Milestone 2: Peta 3D Interaktif & Visualisasi Suasana (Status: ✅ Selesai)
- [x] Peta satelit resolusi tinggi ArcGIS World Imagery.
- [x] Penanda stesen (custom pins) interaktif dengan kod warna DOE APIMS.
- [x] Lapisan kabut kelabu atmosfera (*Atmospheric Haze Fog Shroud*) mengikut intensiti IPU PM2.5.
- [x] Kawalan zum dan penunjuk landmark stesen utama mengikut skala zum.

### 📌 Milestone 3: Perbandingan Indeks & Navigasi Mudah Alih (Status: ✅ Selesai)
- [x] Modal perbandingan bersebelahan DOE APIMS (IPU 24j) vs AQICN (NowCast).
- [x] Panel laci maklumat stesen (*Station Detail Drawer*) dengan pecahan 6 pencemar udara (PM2.5, PM10, SO2, NO2, O3, CO).
- [x] Bar carian responsif dengan menu lungsur (*instant dropdown filter*) stesen.

### 📌 Milestone 4: Skrin Penuh PWA & Pengalaman Apple Native (Status: ✅ Selesai)
- [x] Pemasangan PWA Skrin Utama (Manifest & App Icons).
- [x] Reka letak *Edge-to-Edge Full-Bleed* kalis takuk (*Dynamic Island/Notch*) dan *Home Indicator*.
- [x] Kad ringkasan bawah (*Bottom Sheet Dock*) boleh dileret (*swipe/drag*) dan ditutup (*tap outside*).
- [x] Service Worker v2.2.1 dengan pemuatan *Network-First* dan auto-kemas kini.

### 📌 Milestone 5: Ramalan Trajektori & Sistem Amaran (Status: 🔄 Fasa Seterusnya)
- [ ] Analisis arah angin dan simulasi trajektori jerebu rentas sempadan.
- [ ] Sistem amaran notifikasi tolak (*push notifications*) untuk zon Tidak Sihat (IPU > 100).
- [ ] Panduan kesihatan dinamik berasaskan profil pengguna (kanak-kanak, warga emas, asma).
