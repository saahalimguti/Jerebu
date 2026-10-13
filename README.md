# 🇲🇾 Jerebu Monitor — Sistem Pemantauan IPU Malaysia

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-38BDF8.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Data Source](https://img.shields.io/badge/Sumber-DOE%20APIMS%20(JAS)-22C55E.svg)](https://eqms.doe.gov.my/APIMS/main)
[![Benchmark](https://img.shields.io/badge/Pembanding-AQICN%20(WAQI)-EAB308.svg)](https://aqicn.org/map/malaysia/)
[![License](https://img.shields.io/badge/Lesen-MIT-blue.svg)](LICENSE)

Aplikasi web moden & **Progressive Web App (PWA)** bertaraf *state-of-the-art* bagi pemantauan Indeks Pencemaran Udara (**IPU / Air Pollutant Index**) semasa musim jerebu, dikhususkan untuk **Semenanjung Malaysia, Sabah, dan Sarawak**.

---

## ✨ Ciri-Ciri Utama

1. **100% Sumber Rasmi Jabatan Alam Sekitar (DOE / JAS)**
   * Data IPU utama, status bacaan, lingkaran radar, statistik serantau, dan 6 pecahan bahan cemar ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{SO}_2$, $\text{NO}_2$, $\text{O}_3$, $\text{CO}$) diperoleh terus daripada [DOE APIMS](https://eqms.doe.gov.my/APIMS/main).
2. **Peta 3D Satelit Interaktif & Label Lokasi Pintar**
   * Peta topografi resolusi tinggi (Esri Satellite) dengan penapis gelap (*dark aesthetics*).
   * **Progressive Disclosure**: Label nama tempat stesen muncul secara automatik dan lancar (*spring curve*) apabila dizum masuk (`zoom >= 7`) atau apabila kursor digerakkan ke atas pin (*hover*).
3. **Perbandingan Bersebelahan (DOE APIMS vs AQICN)**
   * Membandingkan bacaan purata bergerak 24-jam JAS dengan formula NowCast segera US-EPA dari AQICN bagi analisis ketelusan indeks.
4. **Progressive Web App (PWA) Boleh Dipasang (Installable)**
   * Dilengkapi `manifest.json`, ikon pelbagai resolusi (192px, 512px, Apple Touch), dan `sw.js` (Service Worker) untuk keupayaan *offline caching*.
5. **Reka Bentuk Berprestij & Bebas Jata Negara**
   * Menggunakan logo penjenamaan rasmi **Jerebu Monitor** dan ikon **Glossy Cloud Gauge** tanpa sebarang jata negara / jata kerajaan.
   * Dibina mengikut prinsip *Design Engineering Emil Kowalski* dan *Impeccable Design System*.

---

## 🚀 Cara Menjalankan Aplikasi Secara Lokal

### Keperluan Sistem
* Python 3.9+
* Patchright / Playwright (untuk pengikisan latar belakang)

### 1. Klon Repositori
```bash
git clone https://github.com/saahalimguti/Jerebu.git
cd Jerebu
```

### 2. Pasang Keperluan
```bash
pip install patchright
patchright install chromium
```

### 3. Mulakan Pelayan
```bash
python3 server.py
```

Buka pelayar web di:
```text
http://localhost:20140
```

---

## 📂 Struktur Direktori

```text
├── data/
│   └── ipu_latest.json        # Cache dataset 68 stesen terkini
├── static/
│   ├── assets/
│   │   ├── logo.png           # Logo Penjenamaan Rasmi Jerebu Monitor
│   │   ├── logo-trimmed.png   # Logo bersaiz optimum untuk navbar
│   │   └── app-icon.png       # Ikon Glossy Cloud Gauge
│   ├── icons/                 # Ikon PWA (192x192, 512x512, apple-touch)
│   ├── app.js                 # Logik interaktif peta, drawer, filter, PWA
│   ├── index.html             # Struktur semantik HTML5 & meta PWA
│   ├── manifest.json          # PWA Web App Manifest
│   ├── style.css              # Sistem token reka bentuk Impeccable
│   └── sw.js                  # Service Worker untuk caching luar talian
├── scraper.py                 # Pengikis data rasmi DOE APIMS & AQICN
└── server.py                  # Pelayan HTTP lokal & daemon penyelarasan berjadual
```

---

## 📄 Hak Cipta & Sumber Data

* **Data IPU Rasmi:** [Jabatan Alam Sekitar (DOE) Malaysia](https://eqms.doe.gov.my/)
* **Data Pembanding:** [World Air Quality Index Project (AQICN)](https://aqicn.org/)
