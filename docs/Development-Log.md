# Log Pengembangan: Domino Web Game (Sesi 14-16 Juli 2026)

Dokumen ini berfungsi sebagai rekam jejak (*log*) atas seluruh perombakan arsitektur, pembaruan UI, dan logika *backend* yang telah didiskusikan dan diimplementasikan. Tujuannya adalah untuk menjadi acuan (*single source of truth*) dalam pengembangan fase berikutnya.

---

## 1. Perombakan Visual & Antarmuka (Frontend UI)

### A. Migrasi ke Aset Gambar Asli (Bukan Prosedural)
- **Konteks:** Sebelumnya, kartu domino digambar menggunakan fungsi `Graphics` bawaan Phaser (kotak dengan titik-titik bulat).
- **Perubahan:** Seluruh kartu (dari `0-0` hingga `6-6`) telah sepenuhnya digantikan oleh aset gambar PNG *high-res* (total 28 gambar di folder `public/domino/`).
- **Logika Tambahan:** Menambahkan sistem rotasi pintar di `DominoTileSprite.ts`. Aset gambar vertikal akan otomatis diputar (-90 derajat atau 90 derajat) ketika diturunkan ke meja (*board*), dan diputar 180 derajat jika angka terkecil harus berada di atas.
- **Konsistensi Gaya:** Elemen UI lain seperti **Panel Babak & Peringkat** (Kiri Atas) dan **Lencana Sisa Kartu** (Samping Avatar) turut diubah desainnya agar menyerupai bentuk kartu domino putih polos (`domino_00.png`) untuk menjaga konsistensi tema.

### B. Optimalisasi Resolusi Layar (Smart Zoom)
- **Konteks:** Pemain menggunakan berbagai resolusi (HP, Tablet, PC). Elemen UI sering kali bergeser atau saling menumpuk, dan meja tampak terlalu kecil di layar besar.
- **Perubahan:** Mengimplementasikan **Smart Camera Zoom** di semua *scene* (`MenuScene`, `GameplayScene`, `IntermissionScene`). Kamera kini otomatis memperbesar diri sesuai dengan rasio monitor tanpa merusak interaktivitas kartu. Elemen UI "dipaku" menggunakan sistem *Logical Width/Height* dari tepi layar absolut.

### C. Pencegahan Bug Interaktivitas
- **Konteks:** Pemain masih bisa men-drag kartu "Bukan giliran Anda" atau menimpa skor di tengah meja secara tidak sengaja.
- **Perubahan:** Menurunkan *z-index* teks poin (menjadi `-5`) sehingga selalu tertimpa oleh kartu di atas meja. Menambahkan validasi ketat `disableInteractive()` pada kartu saat statusnya `disabled` untuk mencegah aksi tidak disengaja. Mengganti tombol "KEMBALI" dengan *gear icon* yang membuka *modal popup* berlatar gelap.

---

## 2. Pembangunan Infrastruktur Mode Online (Backend)
Berdasarkan *Tasks.md* Fase 6 dan Fase 7, fondasi untuk turnamen *multiplayer online* telah dibangun.

### A. Konfigurasi Infrastruktur Server Lokal
- Menambahkan **Docker Compose** (`docker-compose.yml`) yang berisi instans:
  1. **PostgreSQL 15:** Sebagai pusat data (penyimpanan profil pemain dan riwayat turnamen).
  2. **Redis 7:** Sebagai mesin perantara super-cepat untuk sistem antrean (Matchmaking).

### B. Skema Database (Prisma ORM)
- Menulis struktur data di `schema.prisma`:
  - `User`: Akun pemain.
  - `Tournament`: Data sesi turnamen secara keseluruhan.
  - `Match`: Data meja individu yang berisi tepat 4 pemain.
  - `MatchPlayer`: Pivot untuk menyimpan *cumulative score* (akumulasi poin penalti) setiap pemain di meja tersebut.

### C. Sistem Pencocokan Pemain (Matchmaking)
- Membuat **Express API** (`/api/tournament/join`) yang dipanggil saat pengguna menekan "Main Online".
- Membuat layanan **Matchmaker (Redis)** yang mendata ID pengguna yang sedang antre. Ketika antrean mencapai 4 orang, *Matchmaker* otomatis membentuk `Match` di database, menyiapkan *room* Colyseus, dan memberitahukan kunci meja tersebut (`roomId`) kembali kepada klien.

### D. Colyseus & Siklus Pertandingan Bertahap
- **Konteks:** `DominoRoom.ts` sebelumnya hanya menangani satu ronde game lalu bubar.
- **Perubahan:** Diubah agar mampu menangani sistem **6 Babak**.
  - Server otomatis melakukan *reset* meja saat sebuah babak selesai (dengan interval jeda 5 detik).
  - Skor penalti pemain diakumulasikan.
  - Setelah babak ke-6 selesai, server mengkalkulasi peringkat dan menyematkan label `isWinner: true` kepada **2 pemain terbaik** (skor penalti terkecil) lalu menyimpannya ke PostgreSQL.

---

## 3. Langkah Selanjutnya (What's Next?)
Dokumentasi ini membuktikan bahwa **Fase 6 (Infrastruktur Online)** dan **Fase 7 (Struktur Turnamen)** sudah memiliki akar yang kuat. 

Tugas kita ke depan adalah menyambungkannya secara sempurna dengan UI, atau kembali berfokus memoles animasi dan antarmuka seperti:
1. Menyempurnakan efek visual kartu saat dibuang ke meja (animasi *snap/drop*).
2. Mempercantik antarmuka lobi/menu utama dan transisi antrean (*Matchmaking Loading Screen*).
3. Mengembangkan halaman Papan Peringkat (Leaderboard) yang menarik data riil dari PostgreSQL.
