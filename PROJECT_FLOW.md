# 🧭 PROJECT FLOW & LIVING ARCHITECTURE: Jerebu Monitor (IPU Malaysia)

> **Status Semasa:** ✅ Fasa 4 Selesai (Stabil & Sedia Digunakan)  
> **Tarikh Kemas Kini Terakhir:** 2026-10-13  
> **Direktori Utama Rasmi:** `/Users/halimroslan/Desktop/Kod Sumber (Antigravity)/IPU Malaysia Web App`  
> **Fail Rujukan Utama:** `index.html`, `style.css`, `app.js`, `sw.js`, `server.py`, `scraper.py`, `manifest.json`

---

## 1. 🎯 Ringkasan Eksekutif & Skop Projek
- **Objektif:** Sistem Pemantauan Indeks Pencemaran Udara (IPU) Malaysia masa nyata khusus untuk Semenanjung Malaysia, Sabah, dan Sarawak semasa musim jerebu serantau.
- **Punca Data:** Menggabungkan data rasmi Jabatan Alam Sekitar Malaysia (DOE APIMS - 68 stesen) dan perbandingan kualiti udara antarabangsa (AQICN US-EPA NowCast).
- **Format Output:** Progressive Web App (PWA) 3D Relief Terrain dengan jubin satelit ArcGIS, simulasi kabut kelabu zarah jerebu atmosfera (Atmospheric Haze Fog), dan reka letak kalis ralat *Edge-to-Edge Full-Bleed* untuk telefon pintar dan desktop.

---

## 2. 📊 Status Fasa & Kemajuan Terkini
| Fasa | Nama Modul / Tugasan | Status | Catatan / Deliverables |
| :---: | :--- | :---: | :--- |
| **Fasa 1** | Scraping Enjin & Integrasi Data DOE APIMS | ✅ Selesai | Scraper Patchright, 68 stesen di Semenanjung, Sabah & Sarawak, automasi daemon tempatan & GitHub Actions cron setiap jam. |
| **Fasa 2** | Peta Interaktif 3D Satelit & Simulasi Kabut Jerebu | ✅ Selesai | ArcGIS World Imagery, penanda stesen berkod warna DOE, lapisan kabut jerebu (*haze fog shroud*) mengikut keamatan IPU PM2.5. |
| **Fasa 3** | Kad Perbandingan Bersebelahan & Carian Autocomplete | ✅ Selesai | Modal perbandingan DOE vs AQICN, laci stesen (*station drawer*), carian stesen segera dengan *live dropdown filter*. |
| **Fasa 4** | Skrin Penuh PWA Mudah Alih & Penyegerakan Service Worker | ✅ Selesai | Reka letak *100% Full-bleed* (`100dvh`, `-webkit-fill-available`), kad ringkasan melekat kemas ke birai bawah (*zero bottom gap*), pembaharuan SW v2.2.1 secara *network-first*. |
| **Fasa 5** | Analisis Trajektori Jerebu Rentas Sempadan & Amaran Kesihatan | 🔄 Sedia Dimulakan | Ramalan pergerakan jerebu monsun, notifikasi amaran kesihatan mengikut zon dan cadangan aktiviti harian. |

---

## 3. 🏛️ Seni Bina Teknikal & Peraturan Emas (Golden Invariants)
- **Stack:** Vanilla HTML5, Modern CSS (Vanilla CSS, Glassmorphism, CSS Custom Properties), Vanilla JavaScript (ES6+), Leaflet.js (ArcGIS Imagery), Python 3 (HTTP Server & Scraper).
- **Golden Invariants Wajib:**
  1. **Direktori Projek Rasmi:** MESTI sentiasa di `/Users/halimroslan/Desktop/Kod Sumber (Antigravity)/IPU Malaysia Web App`. Dilarang mencipta folder `Ubah Suai` atau bekerja dalam folder `BACKUP`.
  2. **Full-Bleed Viewport (Mobile PWA):** `html, body` mestilah `position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; height: -webkit-fill-available;`. Sifar jurang unrendered di bawah skrin.
  3. **Edge-to-Edge Bottom Dock:** Kad `#leftSidebar` di telefon mudah alih melekat kemas ke birai bawah (`bottom: 0; width: 100%; border-radius: 22px 22px 0 0;`) dengan padding `env(safe-area-inset-bottom)`.
  4. **Peta Leaflet Invalidation:** `state.map.invalidateSize()` wajib dipanggil sejurus selepas inisialisasi (`requestAnimationFrame`, 200ms, 600ms, 1200ms) serta pada acara `resize` dan `orientationchange`.
  5. **Integriti Service Worker:** Menggunakan strategi *Network-First* untuk dokumen HTML dan *stale-while-revalidate* dengan cache-busting query strings (`?v=2.2.1`) untuk memastikan pengguna peranti sentiasa mendapat kod terkini.
  6. **Penyegerakan Dwi-Folder:** Sebarang fail `index.html`, `style.css`, `app.js`, `sw.js` mestilah sentiasa disegerakkan secara seiras dengan folder `static/`.

---

## 4. 📁 Peta Fail & Aset Kritikal
- `index.html` & `static/index.html`: Struktur UI dashboard utama, header berjenama Jerebu Monitor, kontena peta, modal perbandingan, dan drawer stesen.
- `style.css` & `static/style.css`: Sistem reka bentuk moden, palet warna IPU rasmi Malaysia, reka letak responsif desktop & mobile, animasi jerebu atmosfera.
- `app.js` & `static/app.js`: Logik aplikasi, pengurusan peta Leaflet, pemuatan data `/api/live`, enjin carian autocomplete, gerak isyarat leret (*swipe gestures*).
- `sw.js` & `static/sw.js`: Service worker PWA dengan sokongan luar talian, penyingkiran cache lapuk, dan penyegerakan latar belakang.
- `server.py`: Pelayan tempatan Python (port 20140), daemon penyegerakan data setiap jam, kawalan cache HTTP anti-stale.
- `scraper.py`: Enjin pengikis data rasmi DOE APIMS dan pemprosesan koordinat geografi stesen.
- `data/ipu_latest.json`: Data status semasa 68 stesen di Semenanjung, Sabah, dan Sarawak.

---

## 5. 📝 Log Keputusan Teknikal (Decisions & Mini-ADRs)
- **2026-10-13 (ADR-04): Penyelesaian Isu Petak Kosong PWA Bawah Skrin:**
  - *Masalah:* Pengguna melaporkan petak kosong/gelap di bawah kad ringkasan semasa aplikasi dibuka sebagai Web App (PWA) di telefon pintar.
  - *Keputusan:* Mengubah reka letak kad dari floating island card kepada *docked edge-to-edge bottom sheet* (`bottom: 0; border-radius: 22px 22px 0 0;`), mengunci `html, body` dengan `position: fixed; top: 0; bottom: 0; left: 0; right: 0; height: 100dvh; height: -webkit-fill-available;`, mengemaskini SW ke strategi *network-first* dengan versi cache v2.2.1, dan menyegerakkan folder `static/`.
- **2026-10-13 (ADR-03): Enjin Carian Stesen Dropdown Segera:**
  - *Masalah:* Pengguna sukar mencari stesen tertentu di telefon pintar tanpa perlu mengezum peta manual.
  - *Keputusan:* Membina kotak carian dinamik dengan *instant dropdown list* yang menapis mengikut nama kawasan dan negeri, memaparkan nilai IPU dan status terus pada senarai, serta mengezum peta dan membuka maklumat stesen dengan 1 klik.

---

## 6. ⏭️ Tindakan Seterusnya (Next Action Items)
- [ ] **Fasa 5.1:** Pembangunan modul simulasi ramalan arah angin jerebu monsun barat daya berasaskan data meteorologi.
- [ ] **Fasa 5.2:** Penambahan sistem notifikasi amaran zon tidak sihat/berbahaya mengikut geolokasi pengguna.
- [ ] **Fasa 5.3:** Penambahbaikan panduan kesihatan interaktif berasaskan garis panduan Kementerian Kesihatan Malaysia (KKM).
