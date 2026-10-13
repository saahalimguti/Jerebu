# CEREBRUM — Developer Preferences & Invariants

### Golden Invariants
1. **Main Project Directory:** Sentiasa di `/Users/halimroslan/Desktop/Kod Sumber (Antigravity)/IPU Malaysia Web App`. Dilarang folder Ubah Suai / Backup.
2. **Mobile Viewport Full-Bleed:** Wajib `position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100dvh; height: -webkit-fill-available;`.
3. **Bottom Sheet Dock:** `#leftSidebar` di mobile sentiasa `bottom: 0` melekat kemas ke birai bawah dengan `env(safe-area-inset-bottom)`.
4. **Leaflet Invalidation:** `state.map.invalidateSize()` wajib dipanggil selepas render dan pada resize.
5. **Dwi-Folder Sync:** Sebarang perubahan fail web (`index.html`, `style.css`, `app.js`, `sw.js`) MESTI disalin seiras ke folder `static/`.

### Do-Not-Repeat
- Jangan gunakan floating margin bawah pada mobile sheet yang meninggalkan petak kosong di bawah skrin.
- Jangan gunakan cache-first tanpa mekanisme refresh untuk dokumen utama HTML.
