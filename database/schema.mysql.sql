-- ====================================================================
-- DataForge API Studio — MySQL Database Schema & Seed Data
-- Kompatibel dengan: MySQL 5.7+, MySQL 8.0+, MySQL 8.4+, MariaDB 10.3+
-- Dapat langsung dijalankan di phpMyAdmin, MySQL CLI, DBeaver, Workbench,
-- atau penyedia Cloud MySQL (Aiven, PlanetScale, TiDB, GCP Cloud SQL, AWS RDS)
-- ====================================================================

-- 1. Buat Database (Opsional jika sudah ada)
CREATE DATABASE IF NOT EXISTS `dataforge_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `dataforge_db`;

-- 2. Nonaktifkan pengecekan foreign key sementara saat setup tabel
SET FOREIGN_KEY_CHECKS = 0;

-- ====================================================================
-- Tabel: df_projects (Menyimpan Metadata Project Database & Master Token)
-- ====================================================================
DROP TABLE IF EXISTS `df_projects`;
CREATE TABLE `df_projects` (
  `id` VARCHAR(64) NOT NULL COMMENT 'Unique identifier project (misal: proj-sekolah)',
  `owner_id` VARCHAR(64) NULL COMMENT 'ID user pemilik project',
  `owner_email` VARCHAR(255) NULL COMMENT 'Email user pemilik project',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nama project database',
  `description` TEXT NULL COMMENT 'Deskripsi project',
  `token` VARCHAR(128) NOT NULL COMMENT 'Master API Access Token',
  `color` VARCHAR(50) NOT NULL DEFAULT 'indigo' COMMENT 'Tema warna visual di UI',
  `icon` VARCHAR(50) NOT NULL DEFAULT 'Database' COMMENT 'Nama icon Lucide React',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pembuatan',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu pembaharuan terakhir',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_project_token` (`token`),
  KEY `idx_project_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daftar database project';

-- ====================================================================
-- Tabel: df_tables (Menyimpan Definisi Tabel, Kolom Schema & Token Tabel)
-- ====================================================================
DROP TABLE IF EXISTS `df_tables`;
CREATE TABLE `df_tables` (
  `id` VARCHAR(64) NOT NULL COMMENT 'Unique identifier tabel (misal: tbl-siswa)',
  `project_id` VARCHAR(64) NOT NULL COMMENT 'Relasi ke df_projects.id',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nama display tabel',
  `slug` VARCHAR(128) NOT NULL COMMENT 'Slug endpoint REST API (/api/v1/:slug)',
  `description` TEXT NULL COMMENT 'Deskripsi fungsional tabel',
  `primary_key` VARCHAR(64) NOT NULL DEFAULT 'id' COMMENT 'Kolom primary key (biasanya id)',
  `token` VARCHAR(128) NULL COMMENT 'Token khusus tabel (jika di-refresh secara terisolasi)',
  `fields` LONGTEXT NOT NULL COMMENT 'Definisi kolom tabel dalam format JSON array',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pembuatan tabel',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu pembaruan tabel',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_project_slug` (`project_id`, `slug`),
  KEY `idx_table_token` (`token`),
  CONSTRAINT `fk_tables_project` FOREIGN KEY (`project_id`) 
    REFERENCES `df_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daftar tabel dan skema kolom';

-- ====================================================================
-- Tabel: df_records (Menyimpan Record Data yang Diakses via REST API)
-- ====================================================================
DROP TABLE IF EXISTS `df_records`;
CREATE TABLE `df_records` (
  `id` VARCHAR(128) NOT NULL COMMENT 'ID record (bisa numerik atau uuid)',
  `table_id` VARCHAR(64) NOT NULL COMMENT 'Relasi ke df_tables.id',
  `project_id` VARCHAR(64) NOT NULL COMMENT 'Relasi ke df_projects.id untuk percepatan filter',
  `data` LONGTEXT NOT NULL COMMENT 'Payload data kolom dalam format JSON object',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu insert data',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu update data',
  PRIMARY KEY (`table_id`, `id`),
  KEY `idx_records_project` (`project_id`),
  KEY `idx_records_table` (`table_id`),
  CONSTRAINT `fk_records_table` FOREIGN KEY (`table_id`) 
    REFERENCES `df_tables` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_records_project` FOREIGN KEY (`project_id`) 
    REFERENCES `df_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Data records yang disimpan dan diekspos via REST API';

-- ====================================================================
-- Tabel: df_settings (Menyimpan Konfigurasi Sistem & Storage Engine)
-- ====================================================================
DROP TABLE IF EXISTS `df_settings`;
CREATE TABLE `df_settings` (
  `key` VARCHAR(64) NOT NULL COMMENT 'Kunci konfigurasi',
  `value` LONGTEXT NOT NULL COMMENT 'Nilai konfigurasi (string atau JSON)',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Konfigurasi global platform';

-- ====================================================================
-- Tabel: df_smtp_accounts (Menyimpan Akun SMTP Multi-Pool Gmail & Failover)
-- ====================================================================
DROP TABLE IF EXISTS `df_smtp_accounts`;
CREATE TABLE `df_smtp_accounts` (
  `id` VARCHAR(64) NOT NULL COMMENT 'Unique identifier akun SMTP',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nama label akun (misal: Gmail Utama)',
  `gmail_user` VARCHAR(255) NOT NULL COMMENT 'Alamat email Gmail pengirim',
  `gmail_app_password` VARCHAR(255) NOT NULL COMMENT 'Sandi Aplikasi 16-karakter Gmail',
  `from_name` VARCHAR(255) NOT NULL DEFAULT 'DataForge API Studio' COMMENT 'Nama pengirim display',
  `host` VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com' COMMENT 'Host server SMTP',
  `port` INT NOT NULL DEFAULT 465 COMMENT 'Port SMTP (465 SSL atau 587 TLS)',
  `secure` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = SSL/TLS (Port 465), 0 = STARTTLS (Port 587)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif untuk pool failover',
  `order_num` INT NOT NULL DEFAULT 1 COMMENT 'Urutan prioritas rotasi failover',
  `last_tested_at` DATETIME NULL COMMENT 'Waktu pengujian terakhir',
  `last_status` VARCHAR(32) NOT NULL DEFAULT 'untested' COMMENT 'Status pengujian: success, failed, untested',
  `last_error_message` TEXT NULL COMMENT 'Pesan galat jika gagal uji',
  `success_count` INT NOT NULL DEFAULT 0 COMMENT 'Jumlah email berhasil terkirim',
  `fail_count` INT NOT NULL DEFAULT 0 COMMENT 'Jumlah pengiriman gagal',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_smtp_active_order` (`is_active`, `order_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daftar akun SMTP Gmail yang aman dan persisten';

-- ====================================================================
-- Tabel: df_users (Manajemen Pengguna, RBAC Superadmin/Admin/User & Verifikasi Email)
-- ====================================================================
DROP TABLE IF EXISTS `df_users`;
CREATE TABLE `df_users` (
  `id` VARCHAR(64) NOT NULL COMMENT 'Unique identifier user (usr-...)',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nama lengkap pengguna',
  `email` VARCHAR(255) NOT NULL COMMENT 'Alamat email pengguna',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt hash password',
  `role` ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user' COMMENT 'Level hak akses: superadmin, admin, user',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Status verifikasi email (1 = terverifikasi, 0 = belum)',
  `verification_code` VARCHAR(32) NULL COMMENT 'Kode verifikasi 6-digit',
  `verification_token` VARCHAR(128) NULL COMMENT 'Token URL verifikasi instan',
  `verification_expires_at` DATETIME NULL COMMENT 'Batas waktu kedaluwarsa kode verifikasi',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Status aktif akun',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pendaftaran',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu update profil/status',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_email` (`email`),
  KEY `idx_user_role` (`role`),
  KEY `idx_user_verified` (`is_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Data akun pengguna dan hak akses RBAC';

-- Aktifkan kembali pengecekan foreign key
SET FOREIGN_KEY_CHECKS = 1;


-- ====================================================================
-- SEED DATA AWAL (Pengguna Standar & Contoh Data)
-- ====================================================================

-- 1. Insert Akun Pengguna Bawaan (Password semua: 123456)
-- Bcrypt Hash untuk '123456': $2a$10$7Zrqc1v9g8q61j3yv5QyauH.xKzD0p6t4KkR/57P2J6c2v9P.hVey
INSERT INTO `df_users` (`id`, `name`, `email`, `password_hash`, `role`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES
('usr-superadmin', 'Super Administrator', 'superadmin@dataforge.io', '$2a$10$7Zrqc1v9g8q61j3yv5QyauH.xKzD0p6t4KkR/57P2J6c2v9P.hVey', 'superadmin', 1, 1, NOW(), NOW()),
('usr-admin', 'Administrator Data', 'admin@dataforge.io', '$2a$10$7Zrqc1v9g8q61j3yv5QyauH.xKzD0p6t4KkR/57P2J6c2v9P.hVey', 'admin', 1, 1, NOW(), NOW()),
('usr-user', 'Pengguna Biasa', 'user@dataforge.io', '$2a$10$7Zrqc1v9g8q61j3yv5QyauH.xKzD0p6t4KkR/57P2J6c2v9P.hVey', 'user', 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `updated_at` = NOW();

-- 1. Insert Project Awal
INSERT INTO `df_projects` (`id`, `name`, `description`, `token`, `color`, `icon`, `created_at`, `updated_at`) VALUES
('proj-sekolah', 'Database Sistem Sekolah', 'Pusat data siswa, guru, dan administrasi akademik sekolah dengan akses REST API', 'sb_live_sekolah_9823471029384721', 'indigo', 'GraduationCap', NOW(), NOW()),
('proj-toko', 'Database Toko Online & Produk', 'Katalog produk e-commerce, stok gudang, dan riwayat transaksi pesanan', 'sb_live_toko_4918237491029384', 'emerald', 'Store', NOW(), NOW());

-- 2. Insert Tabel Awal
INSERT INTO `df_tables` (`id`, `project_id`, `name`, `slug`, `description`, `primary_key`, `token`, `fields`, `created_at`, `updated_at`) VALUES
('tbl-siswa', 'proj-sekolah', 'Data Siswa', 'siswa', 'Daftar biodata siswa aktif dan status akademik', 'id', 'sb_tbl_siswa_2l3cpz2h394czc5m', '[{"key":"id","label":"ID (PK)","type":"number","required":true,"isPrimaryKey":true},{"key":"nis","label":"NIS","type":"text","required":true},{"key":"nama","label":"Nama Siswa","type":"text","required":true},{"key":"kelas","label":"Kelas","type":"select","required":true,"options":["X RPL 1","XI RPL 1","XII RPL 1","XII TKJ 2"]},{"key":"jurusan","label":"Jurusan","type":"text","required":false},{"key":"email","label":"Email","type":"email","required":false},{"key":"status","label":"Status","type":"select","required":true,"options":["Aktif","Lulus","Cuti"]}]', NOW(), NOW()),
('tbl-guru', 'proj-sekolah', 'Data Guru', 'guru', 'Tenaga pengajar dan pengampu mata pelajaran', 'id', NULL, '[{"key":"id","label":"ID (PK)","type":"number","required":true,"isPrimaryKey":true},{"key":"nip","label":"NIP","type":"text","required":true},{"key":"nama","label":"Nama Guru","type":"text","required":true},{"key":"mata_pelajaran","label":"Mata Pelajaran","type":"text","required":true},{"key":"email","label":"Email","type":"email","required":false},{"key":"status","label":"Status","type":"select","required":true,"options":["Aktif","Cuti"]}]', NOW(), NOW()),
('tbl-produk', 'proj-toko', 'Katalog Produk', 'produk', 'Stok dan harga jual produk aktif', 'id', NULL, '[{"key":"id","label":"ID (PK)","type":"number","required":true,"isPrimaryKey":true},{"key":"kode_sku","label":"Kode SKU","type":"text","required":true},{"key":"nama_produk","label":"Nama Produk","type":"text","required":true},{"key":"kategori","label":"Kategori","type":"select","required":true,"options":["Elektronik","Aksesoris","Pakaian","Alat Tulis"]},{"key":"harga","label":"Harga (Rp)","type":"number","required":true},{"key":"stok","label":"Stok Tersedia","type":"number","required":true},{"key":"tersedia","label":"Status Stok","type":"boolean","required":true,"defaultValue":true}]', NOW(), NOW());

-- 3. Insert Records Data Awal (Siswa)
INSERT INTO `df_records` (`id`, `table_id`, `project_id`, `data`, `created_at`, `updated_at`) VALUES
('1', 'tbl-siswa', 'proj-sekolah', '{"id":1,"nis":"202401","nama":"Ahmad Faisal","kelas":"XII RPL 1","jurusan":"Rekayasa Perangkat Lunak","email":"ahmad@sekolah.sch.id","status":"Aktif"}', NOW(), NOW()),
('2', 'tbl-siswa', 'proj-sekolah', '{"id":2,"nis":"202402","nama":"Siti Rahmawati","kelas":"XII RPL 1","jurusan":"Rekayasa Perangkat Lunak","email":"siti@sekolah.sch.id","status":"Aktif"}', NOW(), NOW()),
('3', 'tbl-siswa', 'proj-sekolah', '{"id":3,"nis":"202403","nama":"Budi Kurniawan","kelas":"XII TKJ 2","jurusan":"Teknik Komputer Jaringan","email":"budi@sekolah.sch.id","status":"Aktif"}', NOW(), NOW()),
('4', 'tbl-siswa', 'proj-sekolah', '{"id":4,"nis":"202404","nama":"Dewi Lestari","kelas":"XI RPL 1","jurusan":"Rekayasa Perangkat Lunak","email":"dewi@sekolah.sch.id","status":"Cuti"}', NOW(), NOW());

-- 4. Insert Records Data Awal (Guru)
INSERT INTO `df_records` (`id`, `table_id`, `project_id`, `data`, `created_at`, `updated_at`) VALUES
('1', 'tbl-guru', 'proj-sekolah', '{"id":1,"nip":"198501012010","nama":"Ir. Bambang Sugiarto, M.Kom","mata_pelajaran":"Pemrograman Web & REST API","email":"bambang@sekolah.sch.id","status":"Aktif"}', NOW(), NOW()),
('2', 'tbl-guru', 'proj-sekolah', '{"id":2,"nip":"199003152015","nama":"Nurul Hidayah, S.Pd","mata_pelajaran":"Basis Data & SQL","email":"nurul@sekolah.sch.id","status":"Aktif"}', NOW(), NOW());

-- 5. Insert Records Data Awal (Produk)
INSERT INTO `df_records` (`id`, `table_id`, `project_id`, `data`, `created_at`, `updated_at`) VALUES
('1', 'tbl-produk', 'proj-toko', '{"id":1,"kode_sku":"ELK-001","nama_produk":"Mechanical Keyboard RGB","kategori":"Elektronik","harga":650000,"stok":25,"tersedia":true}', NOW(), NOW()),
('2', 'tbl-produk', 'proj-toko', '{"id":2,"kode_sku":"ELK-002","nama_produk":"Wireless Gaming Mouse 16000 DPI","kategori":"Elektronik","harga":350000,"stok":40,"tersedia":true}', NOW(), NOW()),
('3', 'tbl-produk', 'proj-toko', '{"id":3,"kode_sku":"AKS-003","nama_produk":"USB-C Multifunction Hub 7-in-1","kategori":"Aksesoris","harga":275000,"stok":12,"tersedia":true}', NOW(), NOW());

-- Selesai! Schema dan data awal siap digunakan.
