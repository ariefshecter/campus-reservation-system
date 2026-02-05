# Campus Reservation System (UniSpace)

Campus Reservation System adalah platform berbasis web yang dirancang untuk memodernisasi proses peminjaman fasilitas kampus (seperti auditorium, laboratorium, ruang rapat, dan lapangan olahraga).

Sistem ini menggantikan proses manual dengan solusi digital yang terintegrasi, mencakup pemesanan jadwal, verifikasi kehadiran menggunakan QR Code, serta pelaporan otomatis bagi administrator.

## Teknologi yang Digunakan

Proyek ini dibangun menggunakan arsitektur Monorepo dengan teknologi berikut:

### Backend

- **Bahasa:** Go (Golang) v1.25+
- **Framework:** Fiber v2 (High performance web framework)
- **Database:** PostgreSQL 16
- **Autentikasi:** JWT (JSON Web Token) & OTP via WhatsApp
- **Dokumentasi API:** Swagger (Swaggo)
- **Driver Database:** lib/pq

### Frontend

- **Framework:** Next.js 16 (App Router)
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn/UI (Radix UI)
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Fitur Khusus:** HTML5-QRCode (Scanner), JSPDF (Cetak Tiket)

## Fitur Utama

### 1. Modul Pengguna (Mahasiswa/Dosen)

- **Autentikasi & Registrasi:** Login menggunakan Email/Password atau OTP WhatsApp.
- **Pencarian Fasilitas:** Melihat daftar fasilitas yang tersedia beserta detail kapasitas dan foto.
- **Cek Jadwal:** Melihat ketersediaan ruangan secara real-time untuk menghindari bentrok jadwal.
- **Booking Online:** Melakukan reservasi fasilitas dengan memilih tanggal dan sesi waktu.
- **Tiket Digital:** Mengunduh bukti peminjaman dalam bentuk tiket QR Code (PDF).
- **Riwayat Peminjaman:** Memantau status pengajuan (Pending, Approved, Rejected, Completed).
- **Ulasan:** Memberikan rating dan ulasan setelah pemakaian fasilitas selesai.

### 2. Modul Administrator

- **Dashboard Statistik:** Ringkasan penggunaan fasilitas, total booking, dan pengguna aktif.
- **Manajemen Fasilitas:** Tambah, edit, hapus, dan nonaktifkan fasilitas (maintenance mode).
- **Manajemen Pengguna:** Mengelola data pengguna dan mengubah role (User/Admin).
- **Persetujuan Booking:** Menyetujui atau menolak pengajuan peminjaman fasilitas.
- **Scanner Check-In/Out:** Memindai QR Code pengguna untuk verifikasi kehadiran (Check-in) dan kepulangan (Check-out).
- **Laporan Kehadiran:** Log aktivitas penggunaan fasilitas yang dapat diekspor.

### 3. Fitur Sistem Otomatis

- **Auto Checkout:** Background worker yang berjalan otomatis untuk menyelesaikan status booking jika pengguna lupa melakukan check-out.
- **Notifikasi OTP:** Integrasi dengan WhatsApp Gateway untuk verifikasi keamanan.

## Prasyarat Instalasi

Sebelum menjalankan proyek ini, pastikan perangkat Anda telah terinstal:

- Go (Minimal versi 1.21)
- Node.js (Minimal versi 20) & NPM
- Docker & Docker Compose (Untuk database PostgreSQL)
- Git

## Panduan Instalasi & Menjalankan Aplikasi

Ikuti langkah-langkah berikut untuk menjalankan sistem di lingkungan lokal (local machine).

### 1. Clone Repository
```bash
git clone https://github.com/username/campus-reservation-system.git
cd campus-reservation-system
```

### 2. Konfigurasi Database (Menggunakan Docker)

Pastikan Docker Desktop sudah berjalan, lalu jalankan perintah berikut di root folder proyek:
```bash
docker-compose up -d
```

Perintah ini akan membuat container PostgreSQL dengan konfigurasi user dan database yang sesuai dengan file `docker-compose.yml`.

### 3. Menjalankan Backend (Go)

Masuk ke direktori backend:
```bash
cd apps/backend
```

Buat file `.env` (atau salin dari contoh jika ada) dan sesuaikan konfigurasinya:
```env
# Konfigurasi Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=campus_user
DB_PASSWORD=campus_pass
DB_NAME=campus_reservation

# Konfigurasi Server
PORT=3000
JWT_SECRET=rahasia_super_aman_anda

# Konfigurasi WhatsApp Gateway (Opsional)
WA_GATEWAY_URL=http://wa-gateway-url/api
```

Download dependency:
```bash
go mod tidy
```

Jalankan server:
```bash
go run cmd/server/main.go
```

Backend akan berjalan di `http://localhost:3000`. Dokumentasi Swagger dapat diakses di `http://localhost:3000/swagger/index.html`.

### 4. Menjalankan Frontend (Next.js)

Buka terminal baru dan masuk ke direktori frontend:
```bash
cd apps/web
```

Install dependency:
```bash
npm install
```

Buat file `.env.local` untuk konfigurasi environment frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Jalankan mode pengembangan:
```bash
npm run dev
```

Aplikasi web dapat diakses di `http://localhost:3001`.
