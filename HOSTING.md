# 🚀 Panduan Panduan Hosting DataForge API Studio di cPanel (Node.js & MySQL)

Dokumen ini berisi panduan langkah demi langkah untuk menginstal dan menjalankan **DataForge API Studio** (Full-Stack React SPA + Express.js API) pada server **cPanel Shared Hosting** atau **VPS** menggunakan fitur **Setup Node.js App**.

---

## 📋 Prasyarat Sistem Hosting
Sebelum memulai, pastikan cPanel Anda memiliki fitur-fitur berikut:
1. **Setup Node.js App** (Phusion Passenger disupport cPanel).
2. **Node.js**: Versi **18.x**, **20.x**, atau **22.x** (Direkomendasikan **20.x** atau **22.x**).
3. **Database MySQL / MariaDB** (Dapat dibuat via menu *MySQL Database Wizard* di cPanel).
4. **Akses Terminal cPanel** atau **SSH** (opsional tapi disarankan untuk menjalankan build).

---

## 🔐 1. Keamanan Informasi Sensitif (Telegram Bot & Credentials)
> **PENTING:** Semua API Key, Bot Token, Password Database, dan JWT Secret **TIDAK BOLEH** ditaruh hardcoded di dalam kode proyek agar tidak ketahuan/terpush ke GitHub. Semua informasi sensitif disimpan secara aman di file `.env`.

Sistem DataForge telah disesuaikan untuk membaca variabel lingkungan berikut:
- `TELEGRAM_BOT_TOKEN`: Token bot Telegram dari `@BotFather` (untuk notifikasi jika DB online bermasalah).
- `TELEGRAM_CHAT_ID`: ID Chat / Group Telegram penerima notifikasi.
- `DB_PASSWORD`: Password database MySQL hosting.
- `JWT_SECRET`: Secret key unik untuk enkripsi token login user.
- `GMAIL_APP_PASSWORD`: Password aplikasi Gmail untuk pengiriman email verifikasi.

---

## 🛠️ 2. Langkah-Langkah Deployment di cPanel

### Langkah 1: Buat Database MySQL di cPanel
1. Masuk ke cPanel, buka menu **MySQL® Database Wizard**.
2. Buat nama database baru, misalnya: `u123456_dataforge`.
3. Buat pengguna database baru dan password yang kuat, misalnya: `u123456_dbuser`.
4. Berikan hak akses **ALL PRIVILEGES** ke pengguna tersebut pada database.
5. Simpan nama database, username, dan password untuk diisikan ke file `.env`.

---

### Langkah 2: Upload File Proyek ke Hosting
1. Upload proyek Anda ke folder root cPanel (misalnya `/home/username/dataforge`) menggunakan **File Manager** atau **Git Version Control**.
2. Pastikan folder `node_modules` **tidak ikut diupload** (akan diinstall langsung di server).

---

### Langkah 3: Buat File `.env` di Server Hosting
Di folder utama proyek di cPanel, buat file bernama `.env` (pastikan opsi *Show Hidden Files* aktif di File Manager) dan isi dengan konfigurasi server Anda:

```env
# URL Aplikasi Hosting Anda
APP_URL="https://api.domainanda.com"

# Konfigurasi Database MySQL cPanel
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="u123456_dbuser"
DB_PASSWORD="PasswordKuatDatabaseAnda"
DB_NAME="u123456_dataforge"
DB_SSL="false"

# Keamanan & Autentikasi (JWT)
JWT_SECRET="ganti_dengan_string_acak_rahasia_dan_panjang_123456"
JWT_EXPIRES_IN="7d"

# Notifikasi Telegram Bot Alert (INFO SENSITIF)
TELEGRAM_BOT_TOKEN="8140482135:AAF6HKTngDP-TFujMkGf3XJ9IPtQN6aXPno"
TELEGRAM_CHAT_ID="7537699303"

# Konfigurasi Pengiriman Email (Gmail SMTP)
GMAIL_USER="email-anda@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
SMTP_FROM_NAME="DataForge API Studio"
```

---

### Langkah 4: Setup Node.js Application di cPanel
1. Buka menu **Setup Node.js App** di cPanel.
2. Klik tombol **Create Application**.
3. Isikan formulir sebagai berikut:
   - **Node.js version**: `20.x` atau `22.x`
   - **Application mode**: `Production`
   - **Application root**: `dataforge` (lokasi folder proyek Anda)
   - **Application URL**: Pilih domain atau subdomain Anda (misal: `api.domainanda.com`)
   - **Application startup file**: `server.js`
4. Klik **Create**.

---

### Langkah 5: Install Dependencies & Compile Build
1. Setelah aplikasi dibuat, klik tombol **Run NPM Install** di halaman Setup Node.js App.
2. Buka **Terminal** cPanel (atau sambungkan via SSH) lalu jalankan perintah berikut di folder proyek:

```bash
# 1. Masuk ke Virtual Environment Node.js yang dibuat cPanel
source /home/username/nodevenv/dataforge/20/bin/activate && cd /home/username/dataforge

# 2. Jalankan Build Gabungan (Vite Frontend + Express Server Bundle)
npm run build
```

> ⚡ **Teknik Code Splitting (Optimasi Bundle Size):**
> Perintah `npm run build` akan secara otomatis memecah file JavaScript frontend yang besar menjadi bagian-bagian kecil (chunk terpisah):
> - `react-vendor.js`: Pustaka React dasar.
> - `icons.js`: Pustaka ikon Lucide.
> - `ui-vendor.js`: Frame animasi & parser markdown.
> - **Chunk Modul Dinamis**: Setiap halaman (`ApiDocsView`, `OnlineDatabaseView`, `AuthModal`, dll) dimuat secara *on-demand* (`React.lazy`) hanya saat diakses pengguna. Ini memastikan pemuatan awal website sangat ringan dan responsif di shared hosting!

---

### Langkah 6: Restart Aplikasi
1. Kembali ke menu **Setup Node.js App** di cPanel.
2. Klik tombol **Restart Application**.
3. Buka browser dan akses domain Anda (`https://api.domainanda.com`).

---

## ⚡ Solusi Masalah Umum (Troubleshooting)

### 1. Error `ECONNREFUSED` saat koneksi MySQL
- Pastikan `DB_HOST` diisi `"localhost"` atau `"127.0.0.1"`.
- Pastikan `DB_USER` dan `DB_NAME` menyertakan prefix akun cPanel Anda (contoh: `u123456_dbname`).

### 2. File `.env` Tidak Terbaca di cPanel
- Pastikan file bernama persis `.env` (memiliki titik di depan).
- Jika mengedit dari File Manager, pastikan centang "Show Hidden Files (dotfiles)" pada pengaturan File Manager.

### 3. Tampilan Blank atau Error 404 pada Sub-route Frontend
- Server `server.js` yang ter-compile sudah memiliki fallback otomatis untuk melayani file `dist/index.html` pada setiap rute halaman React SPA.

---

Selamat! **DataForge API Studio** Anda kini telah berhasil berjalan lancar di cPanel hosting dengan performa cepat dan keamanan kredensial yang terjamin. 🚀
