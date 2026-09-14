# PRD — Tazkia Mengajar
## Monitoring, Absensi, Jadwal, Kurikulum & Laporan Kegiatan

**Versi:** 1.0  
**Status:** Ready for Development  
**Platform:** Web Application  
**Target Deployment:** Vercel  
**Target Pengguna:** Internal Tazkia Mengajar

---

# 1. Ringkasan Produk

Tazkia Mengajar Monitoring System adalah aplikasi web internal untuk membantu tim Tazkia Mengajar mencatat, memantau, merekap, dan melaporkan seluruh kegiatan mengajar secara terstruktur.

Aplikasi berfokus pada:

1. Pengelolaan tempat kegiatan.
2. Pengelolaan tim/pengajar.
3. Pengelolaan murid.
4. Pengelolaan jadwal kegiatan.
5. Absensi tim/pengajar.
6. Absensi murid.
7. Pengelolaan kurikulum.
8. Dokumentasi kegiatan.
9. Laporan kegiatan.
10. Rekap dan export data.
11. Generate otomatis laporan dalam format teks yang siap disalin ke WhatsApp/chat.

Sistem hanya memiliki **satu role, yaitu Admin**.

Admin dapat mengelola seluruh data dan seluruh kegiatan.

---

# 2. Tujuan Produk

## 2.1 Tujuan Utama

Menghilangkan pencatatan kegiatan Tazkia Mengajar yang masih tersebar dan manual serta membuat proses pelaporan menjadi lebih cepat dan konsisten.

## 2.2 Masalah yang Ingin Diselesaikan

Saat ini informasi kegiatan dapat terdiri dari:

- tanggal kegiatan,
- lokasi,
- tim yang bertugas,
- kehadiran tim,
- jumlah murid,
- daftar murid,
- materi,
- dokumentasi,
- waktu kegiatan,
- narasi,
- dan informasi lainnya.

Data tersebut harus dapat dimasukkan satu kali ke aplikasi dan kemudian digunakan kembali untuk:

- monitoring,
- rekap,
- statistik,
- export,
- dan pembuatan laporan.

## 2.3 Prinsip Utama

**Input sekali → data terstruktur → dapat digunakan berkali-kali.**

Contoh:

Admin mengisi kegiatan tanggal 12 September 2026.

Data tersebut otomatis dapat digunakan untuk:

- histori kegiatan,
- statistik kegiatan,
- rekap kehadiran,
- laporan,
- narasi,
- dan dokumentasi.

---

# 3. User & Role

## 3.1 Admin

Hanya terdapat satu role:

**ADMIN**

Semua pengguna aplikasi adalah Admin.

Admin dapat:

- login,
- melihat dashboard,
- menambah admin,
- mengelola tempat,
- mengelola tim,
- mengelola murid,
- mengelola jadwal,
- mengelola kurikulum,
- membuat kegiatan,
- mencatat absensi,
- mengunggah dokumentasi,
- membuat laporan,
- melihat histori,
- export data.

Tidak diperlukan role:

- Pengajar
- Pembimbing
- Murid
- Super Admin

Namun struktur permission sebaiknya dibuat cukup rapi sehingga role tambahan dapat ditambahkan di masa depan tanpa perlu rewrite besar.

---

# 4. Konsep Struktur Data yang Fleksibel

Aplikasi harus dirancang agar tidak hard-code hanya untuk satu tempat.

Saat ini hanya ada satu tempat kegiatan, tetapi Admin harus dapat menambahkan tempat baru.

Contoh:

```text
Tempat
├── Desa Binaan A
├── Sekolah B
├── TPQ C
└── Tempat Baru
```

Setiap tempat dapat memiliki konfigurasi sendiri.

---

# 5. Tempat Kegiatan

Admin dapat melakukan CRUD tempat.

Field minimal:

- Nama tempat
- Nama mitra
- Alamat lengkap
- Deskripsi
- Kategori tempat
- Status aktif/nonaktif

Contoh:

```text
Nama:
Desa Binaan Margajaya

Mitra:
Publik

Alamat:
Jalan Pemuda Dramaga Caringin Gg. Mesjid,
Kel. Margajaya, RT.02/RW.05,
Dramaga, Kec. Bogor Barat,
Kota Bogor, Jawa Barat.
```

Kategori tempat harus dapat ditambah/custom.

---

# 6. Tim / Pengajar / Pembimbing

Dalam sistem ini istilah:

**Pengajar = Pembimbing = Anggota Tim**

Tidak perlu dibuat sebagai tiga entitas berbeda.

Admin dapat CRUD anggota tim.

Field minimal:

- Nama lengkap
- Nama panggilan
- Status
- Nomor kontak (opsional)
- Foto (opsional)
- Catatan
- Status aktif/nonaktif

Contoh:

```text
Shifi Amalia Zein
Rackisha Dhia Ezelly Lathief
Shanaya Balghis Riyona
Amanda Wijayanti
Azmi Ittaqi Hammami
Muhamad Naufal Fauzan
Thoriqurrahman Akrami
Rahmawati
Muhammad Nabil Thoriq
Nayla Elrazqya Putri
```

Satu anggota tim dapat mengikuti banyak kegiatan.

---

# 7. Struktur Murid yang Custom

Sistem tidak boleh mengasumsikan struktur murid hanya berupa "kelas".

Admin harus dapat membuat kategori/kelompok murid sesuai kebutuhan.

Contoh:

```text
Tempat:
Desa Binaan A

Kelompok:
- Kelas Anak
- Remaja
- Tahsin
- Kelompok A
- Kelompok B
```

Admin dapat membuat kategori/kelompok custom.

Murid minimal memiliki:

- Nama
- Tempat/kelompok
- Jenis kelamin (opsional)
- Tanggal lahir (opsional)
- Status aktif/nonaktif
- Catatan

Data murid dapat digunakan kembali pada kegiatan berikutnya.

---

# 8. Jadwal

Admin dapat membuat jadwal kegiatan.

Jadwal harus mendukung:

### 8.1 Jadwal Mingguan

Contoh:

```text
Tempat: Desa Binaan A
Hari: Sabtu
Waktu: 13.00 - 14.30
Frekuensi: 1x per minggu
```

### 8.2 Multi Jadwal per Minggu

Contoh:

```text
Senin  : 16.00 - 17.30
Rabu   : 16.00 - 17.30
Sabtu  : 13.00 - 14.30
```

### 8.3 Custom

Admin dapat menentukan:

- tanggal mulai,
- tanggal berakhir,
- hari,
- waktu,
- frekuensi,
- tempat,
- tim yang bertugas,
- kelompok murid,
- catatan.

Sistem harus dapat membedakan:

**Template jadwal**

dan

**Kegiatan aktual.**

Jadwal tidak otomatis dianggap sebagai kegiatan terlaksana.

Kegiatan aktual dibuat ketika kegiatan benar-benar berlangsung.

---

# 9. Kegiatan

Kegiatan adalah pusat data sistem.

Setiap kegiatan minimal memiliki:

- ID
- tanggal
- tempat
- waktu mulai
- waktu selesai
- mitra
- penerima manfaat
- jenis bantuan/kegiatan
- tim
- jumlah penerima manfaat
- daftar murid
- absensi tim
- absensi murid
- kurikulum/materi
- dokumentasi
- narasi
- catatan
- status

Status kegiatan:

```text
DRAFT
COMPLETED
CANCELLED
```

---

# 10. Input Kegiatan

Admin membuat kegiatan melalui wizard/form bertahap.

Contoh:

### Step 1 — Informasi Kegiatan

```text
Tanggal
Tempat
Mitra
Waktu mulai
Waktu selesai
Penerima manfaat
Jenis bantuan/kegiatan
```

### Step 2 — Tim

Admin memilih anggota tim yang bertugas.

Setiap anggota dapat diberikan status:

```text
Hadir
Izin
Sakit
Alpa
```

Catatan opsional.

Contoh:

```text
Muhamad Naufal Fauzan — Izin
Thoriqurrahman Akrami — Sakit
```

### Step 3 — Murid

Admin dapat memasukkan:

- jumlah murid,
- daftar murid yang hadir,
- daftar murid yang tidak hadir,
- status kehadiran,
- catatan per murid.

Daftar murid bersifat opsional.

Contoh:

```text
Jumlah penerima manfaat: 10

Jika daftar murid diketahui:
Ahmad — Hadir
Budi — Hadir
Citra — Izin
Deni — Sakit
```

Jika daftar murid tidak dimasukkan, sistem tetap dapat menyimpan:

```text
Jumlah penerima manfaat: 10
```

---

# 11. Absensi Tim

Absensi dicatat per kegiatan.

Status:

- Hadir
- Izin
- Sakit
- Alpa

Catatan opsional.

Sistem harus dapat menghasilkan rekap:

```text
Total anggota:
Hadir:
Izin:
Sakit:
Alpa:
```

---

# 12. Absensi Murid

Status:

- Hadir
- Izin
- Sakit
- Alpa

Catatan per murid bersifat opsional.

Jika daftar murid tidak tersedia, Admin hanya mengisi:

```text
Jumlah penerima manfaat
```

Jika daftar murid tersedia, sistem menghitung jumlah berdasarkan data aktual.

Sistem harus mencegah ketidaksesuaian data yang jelas.

Contoh:

Jika terdapat 10 murid terdaftar tetapi jumlah hadir + izin + sakit + alpa = 9, tampilkan warning.

---

# 13. Kurikulum

Kurikulum dibuat fleksibel.

Struktur yang disarankan:

```text
Kurikulum
└── Program
    └── Periode/Semester
        └── Materi
            ├── Pertemuan
            ├── Tujuan
            ├── Deskripsi
            └── Catatan
```

Admin dapat membuat:

- program,
- periode,
- materi,
- target pembelajaran,
- catatan.

Materi dapat dikaitkan dengan kegiatan aktual.

Contoh:

```text
Program:
Tazkia Mengajar

Semester:
Semester 1

Pertemuan:
Pertemuan 5

Materi:
Adab kepada Orang Tua

Target:
Murid memahami adab dasar kepada orang tua.
```

---

# 14. Dokumentasi

Dokumentasi adalah bagian **WAJIB** dari laporan kegiatan.

Admin harus dapat upload dokumentasi.

Sistem harus mendukung berbagai format file input yang umum.

Namun perlu dibedakan:

## 14.1 Foto

Foto dapat diproses dan dikonversi ke:

**WebP**

untuk mengurangi ukuran file.

Metadata disimpan:

- nama asli,
- nama file hasil,
- MIME type,
- ukuran,
- URL/path,
- tanggal upload.

## 14.2 File Non-Gambar

Jangan memaksakan semua format menjadi WebP.

Dokumen seperti:

- PDF
- DOCX
- XLSX
- PPTX
- ZIP
- dan format non-image lainnya

tidak dapat secara logis dikonversi menjadi WebP tanpa mengubah sifat dokumennya.

Maka implementasi yang benar:

```text
Image
→ convert to WebP
→ store

Non-image
→ preserve original format
→ store
```

PRD awal menggunakan istilah "semua format", tetapi sistem harus tetap aman terhadap format yang tidak dapat dikonversi.

Dokumentasi harus dapat:

- upload multiple files,
- preview gambar,
- download file,
- delete file,
- melihat nama file,
- melihat ukuran file.

---

# 15. Storage Dokumentasi

Jangan menyimpan binary file secara langsung di tabel PostgreSQL.

Gunakan:

```text
PostgreSQL
→ menyimpan metadata

Object Storage
→ menyimpan file
```

Database menyimpan:

```text
id
activity_id
original_filename
stored_filename
mime_type
size
storage_key
url
created_at
```

Storage provider harus dipilih yang kompatibel dengan deployment Vercel.

Implementasi harus menghindari ketergantungan pada local filesystem server karena filesystem serverless Vercel bersifat ephemeral.

---

# 16. Laporan Otomatis

Ini adalah salah satu fitur utama aplikasi.

Setelah data kegiatan lengkap, sistem otomatis menghasilkan laporan teks.

Admin dapat:

**Generate Report**

Kemudian sistem menghasilkan teks sesuai template.

Admin dapat:

**Copy Report**

untuk langsung ditempel ke WhatsApp atau media komunikasi lainnya.

---

# 17. Template Laporan

Template default:

```text
*Assalamualaikum warahmatullahi wabarakatuh*
*Izin Melaporkan Kegiatan Tazkia Mengajar*

*📝 Nama Kegiatan*
*Tazkia Mengajar*
*(Mencerdaskan Generasi Penerus Bangsa)*

*🤝 Mitra:*
{MITRA}

*📆 Hari, Tanggal :*
{HARI}, {TANGGAL}

*📍 Lokasi Kegiatan :*
{ALAMAT}

*⏰ Waktu Kegiatan:*
Pukul {JAM_MULAI} s/d {JAM_SELESAI} WIB

*🏹Penerima Manfaat:*
{PENERIMA_MANFAAT}

*👨‍👩‍👦 Jumlah penerima manfaat:*

- {JUMLAH} anak

*🎁 Jenis Bantuan:*

- {JENIS_BANTUAN}

⛑️ *Tim yang bertugas*

{DAFTAR_TIM}

📷 Dokumentasi :
(terlampir)

📄 *Narasi :*
{NARASI}

*Tazkia Mengajar x BaitulMal Tazkia*

*Wassalamualaikum warahmatullahi wabarakatuh*
```

Sistem harus mengganti placeholder secara otomatis.

---

# 18. Status Tim dalam Laporan

Jika anggota hadir:

```text
- Nama
```

Jika izin:

```text
- Nama (izin)
```

Jika sakit:

```text
- Nama (sakit)
```

Jika alpa:

```text
- Nama (alpa)
```

Urutan anggota mengikuti urutan yang dipilih Admin atau urutan default yang tersimpan.

---

# 19. Narasi Otomatis

Sistem harus mampu membuat narasi berdasarkan data kegiatan.

Contoh template:

```text
Alhamdulillah pada hari ini {HARI} tanggal {TANGGAL} telah dilaksanakan kegiatan *Tazkia Mengajar* kolaborasi antara Tazkia bersama Baitulmal Tazkia dengan tujuan untuk {TUJUAN} yang berlokasi di {LOKASI_SINGKAT}, {WILAYAH}.

Semoga program *Tazkia Mengajar* yang diadakan oleh Baitulmal Tazkia bersama Tazkia untuk anak-anak di wilayah {WILAYAH} bermanfaat dan bisa terus berjalan.

Demikian laporan Tazkia Mengajar dari tempat kegiatan berlangsung.

Jazakallah Wassalamualaikum..
```

Admin harus dapat mengedit narasi sebelum menyalin laporan.

Narasi yang sudah diedit Admin tidak boleh tertimpa secara otomatis tanpa konfirmasi.

---

# 20. Validasi Laporan

Sebelum laporan dapat digenerate sebagai laporan final, sistem harus mengecek data wajib.

Minimal:

- tanggal
- tempat
- waktu
- penerima manfaat
- jumlah penerima manfaat
- jenis bantuan/kegiatan
- minimal satu anggota tim
- dokumentasi minimal satu file
- narasi

Jika ada data wajib yang kosong:

```text
Laporan belum lengkap.

Yang harus dilengkapi:
✓ Tanggal
✓ Lokasi
✓ Tim
✗ Dokumentasi
✓ Jumlah penerima manfaat
```

Tombol Generate Final Report harus disabled sampai data wajib lengkap.

Draft tetap boleh disimpan.

---

# 21. Dashboard

Dashboard adalah halaman utama setelah login.

Tampilkan:

## Statistik

- Total kegiatan
- Kegiatan bulan ini
- Total penerima manfaat
- Total anggota tim
- Total tempat
- Persentase kehadiran tim

## Kegiatan Terbaru

Tampilkan daftar kegiatan terbaru.

Informasi:

```text
Tanggal
Tempat
Jumlah penerima manfaat
Jumlah tim
Status laporan
```

## Jadwal Mendatang

Tampilkan kegiatan/jadwal terdekat.

## Quick Actions

```text
+ Tambah Kegiatan
+ Tambah Jadwal
+ Tambah Murid
+ Tambah Anggota
```

---

# 22. Kalender

Sediakan tampilan kalender untuk:

- jadwal,
- kegiatan yang telah dilakukan,
- kegiatan mendatang.

Gunakan visual berbeda untuk membedakan:

```text
Scheduled
Completed
Cancelled
```

---

# 23. Histori Kegiatan

Admin dapat melihat seluruh kegiatan.

Fitur:

- search
- filter tanggal
- filter tempat
- filter status
- filter anggota tim
- filter kelompok murid

Setiap kegiatan memiliki halaman detail.

---

# 24. Halaman Detail Kegiatan

Detail kegiatan menampilkan:

### Informasi

- tanggal
- waktu
- tempat
- mitra
- penerima manfaat
- jenis bantuan

### Tim

Daftar anggota dan status kehadiran.

### Murid

Daftar murid dan status kehadiran jika tersedia.

### Kurikulum

Materi yang digunakan.

### Dokumentasi

Gallery/file list.

### Laporan

Preview laporan otomatis.

Button:

```text
Generate
Copy
Edit
Regenerate
```

---

# 25. Copy Report

Saat Admin menekan:

**Copy Report**

seluruh teks laporan harus disalin ke clipboard.

Gunakan:

```text
navigator.clipboard.writeText()
```

Berikan feedback:

```text
✓ Laporan berhasil disalin
```

Format line break harus tetap terjaga.

---

# 26. Export

Sistem harus mendukung:

### Excel

Untuk:

- rekap absensi tim,
- rekap absensi murid,
- rekap kegiatan.

### PDF

Untuk laporan/rekap jika memungkinkan dalam MVP.

### CSV

Opsional sebagai fallback.

Export harus mendukung filter tanggal.

---

# 27. Search & Filter

Search harus tersedia pada data penting.

Minimal:

### Kegiatan

- tanggal
- lokasi
- nama kegiatan

### Tim

- nama

### Murid

- nama
- kelompok

### Jadwal

- tempat
- hari

---

# 28. Authentication

Gunakan:

**Username + Password**

Tidak menggunakan Google OAuth pada MVP.

Password harus:

- di-hash,
- tidak pernah disimpan plaintext.

Session harus aman.

Implementasi authentication harus mengikuti praktik keamanan modern untuk Next.js.

---

# 29. Database

Gunakan:

**PostgreSQL**

ORM:

**Prisma**

Minimal entitas:

```text
User
Location
TeamMember
StudentGroup
Student
Schedule
ScheduleTeamMember
ScheduleStudentGroup
Curriculum
CurriculumPeriod
CurriculumMaterial
Activity
ActivityTeamMember
ActivityStudent
Documentation
Report
```

Relasi harus dirancang normal dan tidak menggunakan JSON sebagai pengganti relational schema kecuali memang dibutuhkan.

---

# 30. Suggested Database Relationship

```text
User

Location
 ├── Schedule
 ├── StudentGroup
 └── Activity

TeamMember
 ├── ScheduleTeamMember
 └── ActivityTeamMember

StudentGroup
 ├── Student
 └── ActivityStudent

Schedule
 ├── ScheduleTeamMember
 └── ScheduleStudentGroup

Curriculum
 └── CurriculumPeriod
      └── CurriculumMaterial

Activity
 ├── ActivityTeamMember
 ├── ActivityStudent
 ├── Documentation
 ├── Report
 └── CurriculumMaterial
```

---

# 31. Tech Stack

Gunakan stack modern yang cocok untuk deployment Vercel.

Recommended:

```text
Next.js
TypeScript
App Router
Tailwind CSS
shadcn/ui
PostgreSQL
Prisma
Authentication yang kompatibel dengan Next.js
Zod
React Hook Form
```

Untuk file storage gunakan object storage yang cocok untuk Vercel.

Jangan menggunakan local filesystem sebagai permanent storage.

---

# 32. UI/UX

Desain harus:

- clean
- modern
- profesional
- sederhana
- responsive
- desktop-first tetapi tetap nyaman di mobile
- tidak terlalu banyak animasi
- mudah digunakan Admin

Prioritas:

**Usability > dekorasi.**

Admin harus dapat membuat satu laporan kegiatan secepat mungkin.

---

# 33. Navigation

Sidebar:

```text
Dashboard

Kegiatan
  - Semua Kegiatan
  - Tambah Kegiatan

Jadwal
  - Kalender
  - Semua Jadwal

Tim

Murid
  - Semua Murid
  - Kelompok

Kurikulum

Tempat

Laporan
  - Semua Laporan
  - Rekap

Pengaturan
```

---

# 34. Activity Creation UX

Pembuatan kegiatan harus menggunakan UX yang mudah.

Jangan membuat satu form yang terlalu panjang.

Gunakan wizard:

```text
1. Informasi
      ↓
2. Tim
      ↓
3. Murid
      ↓
4. Kurikulum
      ↓
5. Dokumentasi
      ↓
6. Review
      ↓
7. Generate Report
```

Admin dapat menyimpan draft kapan saja.

---

# 35. Autosave / Draft

Jika memungkinkan, implementasikan draft secara aman.

Admin tidak boleh kehilangan seluruh input karena:

- refresh,
- navigasi,
- error upload.

Namun jangan membuat autosave terlalu kompleks jika mengganggu MVP.

Minimal:

**Save Draft**

harus tersedia.

---

# 36. Dokumentasi Upload UX

Mendukung multiple upload.

Contoh:

```text
┌──────────────────────────────┐
│ Drag & Drop files here       │
│ atau klik untuk upload       │
└──────────────────────────────┘

✓ IMG_001.webp
✓ IMG_002.webp
✓ video.mp4
✓ laporan.pdf
```

Untuk gambar:

- compress
- convert WebP
- simpan hasil optimasi

Jangan mengubah video menjadi WebP.

Jika ukuran file terlalu besar, tampilkan error yang jelas.

---

# 37. Security

Minimal:

- password hashing
- session security
- authorization pada seluruh protected routes
- server-side validation
- input validation menggunakan Zod
- SQL injection protection melalui Prisma
- XSS prevention
- CSRF protection jika relevan dengan auth implementation
- secure HTTP headers jika memungkinkan
- upload validation
- file size limit
- MIME/type validation
- filename sanitization
- jangan expose credential
- jangan expose storage secrets ke client

Semua secret menggunakan environment variables.

---

# 38. Environment Variables

Buat:

```text
DATABASE_URL=
AUTH_SECRET=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
```

Gunakan `.env.example`.

Jangan pernah commit:

```text
.env
.env.local
production secrets
```

---

# 39. Seed Data

Buat seed database untuk development.

Minimal:

### Admin

```text
username: admin
password: development-only-password
```

Password harus tetap di-hash.

### Sample Location

Satu tempat contoh.

### Sample Team

10 anggota tim.

### Sample Student Group

Beberapa kelompok.

### Sample Students

Beberapa murid.

### Sample Schedule

Beberapa jadwal.

### Sample Curriculum

Beberapa materi.

### Sample Activity

Minimal satu kegiatan lengkap.

Seed data harus mudah di-reset.

---

# 40. Error Handling

Semua error harus memiliki pesan yang manusiawi.

Jangan menampilkan:

```text
PrismaClientKnownRequestError...
```

kepada user.

Tampilkan:

```text
Gagal menyimpan kegiatan.
Silakan coba lagi.
```

Detail error tetap tersedia di server logs.

---

# 41. Loading State

Semua operasi asynchronous harus mempunyai loading state.

Contoh:

```text
Menyimpan...
Mengunggah...
Menghasilkan laporan...
Menyalin...
```

Jangan membuat user mengira aplikasi hang.

---

# 42. Empty State

Jika belum ada data:

```text
Belum ada kegiatan.

Buat kegiatan pertama
```

Gunakan empty state yang informatif.

---

# 43. Responsive Design

Harus berjalan baik pada:

- desktop
- laptop
- tablet
- smartphone

Namun desktop merupakan prioritas utama karena aplikasi adalah sistem monitoring internal.

---

# 44. Accessibility

Minimal:

- semantic HTML
- label form
- keyboard navigation dasar
- contrast yang baik
- focus state
- tombol memiliki label jelas

---

# 45. Performance

Prioritas:

- server-side data fetching jika cocok
- pagination
- lazy loading dokumentasi
- image optimization
- WebP untuk gambar
- jangan load semua kegiatan sekaligus
- jangan load semua file sekaligus

---

# 46. Pagination

Data yang berpotensi banyak harus menggunakan pagination:

- kegiatan
- murid
- tim
- dokumentasi
- laporan

Default:

```text
20–25 item/page
```

---

# 47. Audit Metadata

Data penting memiliki:

```text
createdAt
updatedAt
```

Untuk data kegiatan, simpan juga:

```text
createdBy
updatedBy
```

Walaupun saat ini hanya satu role.

---

# 48. Future Extensibility

Arsitektur harus memungkinkan fitur berikut di masa depan tanpa rewrite total:

- role Pengajar
- role Super Admin
- notifikasi
- WhatsApp integration
- QR attendance
- GPS attendance
- analytics lebih detail
- AI-generated narrative
- multiple program
- multiple organization
- mobile app

Namun **JANGAN mengimplementasikan fitur tersebut pada MVP kecuali dibutuhkan oleh requirement di atas.**

---

# 49. MVP Scope

## WAJIB

### Authentication
- login
- logout
- session

### Dashboard
- statistik
- kegiatan terbaru
- jadwal

### Master Data
- tempat
- tim
- kelompok murid
- murid
- kurikulum

### Jadwal
- create
- edit
- delete
- weekly recurrence
- custom schedule
- calendar

### Kegiatan
- create
- edit
- delete
- draft
- completed
- cancelled

### Absensi
- tim
- murid
- status
- catatan

### Dokumentasi
- multiple upload
- image → WebP
- file storage
- preview
- delete

### Laporan
- automatic generation
- editable narrative
- template
- copy to clipboard
- validation

### Rekap
- filter
- search
- Excel export

---

# 50. BUKAN MVP

Jangan implementasikan kecuali diperlukan:

- mobile application
- GPS
- QR attendance
- selfie attendance
- WhatsApp API
- push notification
- email notification
- AI chatbot
- AI analytics
- complex permission system
- payment
- public website
- public registration
- student login

---

# 51. Definition of Done

Aplikasi dianggap selesai jika:

1. Admin dapat login.
2. Admin dapat membuat tempat.
3. Admin dapat membuat anggota tim.
4. Admin dapat membuat kelompok murid.
5. Admin dapat membuat murid.
6. Admin dapat membuat kurikulum.
7. Admin dapat membuat jadwal mingguan.
8. Admin dapat melihat jadwal melalui kalender.
9. Admin dapat membuat kegiatan.
10. Admin dapat memilih anggota tim.
11. Admin dapat mencatat absensi tim.
12. Admin dapat mencatat murid.
13. Admin dapat mencatat absensi murid.
14. Admin dapat memasukkan jumlah penerima manfaat.
15. Admin dapat memilih materi kurikulum.
16. Admin wajib memasukkan dokumentasi sebelum final report.
17. Admin dapat upload multiple files.
18. Gambar otomatis diproses menjadi WebP.
19. File disimpan pada object storage.
20. Metadata file disimpan pada PostgreSQL.
21. Admin dapat melihat dokumentasi.
22. Admin dapat menghapus dokumentasi.
23. Sistem dapat menghasilkan laporan otomatis.
24. Sistem dapat menghasilkan narasi.
25. Admin dapat mengedit narasi.
26. Admin dapat copy laporan.
27. Admin dapat melihat histori.
28. Admin dapat filter histori.
29. Admin dapat export Excel.
30. Aplikasi responsive.
31. Tidak ada secret di repository.
32. Production database dapat digunakan.
33. Production storage dapat digunakan.
34. Aplikasi berhasil di-deploy ke Vercel.
35. Production deployment berhasil diuji end-to-end.

---

# 52. Development Workflow

Development harus dilakukan bertahap.

## Phase 1 — Analysis

Sebelum coding:

- review PRD
- identifikasi ambiguity
- buat architecture plan
- buat database ERD
- tentukan folder structure
- tentukan authentication strategy
- tentukan storage strategy

Jangan langsung coding sebelum architecture plan dibuat.

---

## Phase 2 — Project Setup

Buat:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Prisma
- PostgreSQL
- authentication
- validation
- linting
- formatting

Pastikan project dapat dijalankan secara lokal.

---

## Phase 3 — Database

Implementasikan:

- schema
- migration
- seed
- relations
- indexes

Test migration dari database kosong.

---

## Phase 4 — Authentication

Implementasikan:

- login
- logout
- protected routes
- session
- password hashing

Test unauthorized access.

---

## Phase 5 — Master Data

Implementasikan:

1. Tempat
2. Tim
3. Kelompok
4. Murid
5. Kurikulum

Semua harus CRUD.

---

## Phase 6 — Scheduling

Implementasikan:

- weekly schedule
- custom schedule
- recurring schedule
- calendar
- schedule detail

---

## Phase 7 — Activity

Implementasikan:

- activity wizard
- draft
- completed
- cancelled
- team attendance
- student attendance
- curriculum
- beneficiary count

---

## Phase 8 — Documentation

Implementasikan:

- upload
- multi-upload
- image optimization
- WebP conversion
- object storage
- metadata
- preview
- delete

Test berbagai format file.

---

## Phase 9 — Reporting

Implementasikan:

- report template
- placeholder replacement
- automatic narrative
- manual narrative editing
- validation
- report preview
- clipboard copy

Test hasil copy terhadap template yang ditentukan PRD.

---

## Phase 10 — Dashboard & Analytics

Implementasikan:

- statistics
- recent activities
- upcoming schedules
- attendance summary
- filters

---

## Phase 11 — Export

Implementasikan:

- Excel
- filtered export

---

## Phase 12 — Testing

Test:

### Functional

Semua CRUD.

### Authentication

- wrong password
- unauthorized page
- logout
- expired session

### Activity

- incomplete data
- complete data
- draft
- finalization

### Attendance

- all statuses
- inconsistent student count

### Upload

- image
- PDF
- DOCX
- unsupported file
- large file
- multiple files

### Report

- placeholder replacement
- missing data
- special characters
- clipboard

### Responsive

- desktop
- tablet
- mobile

---

# 53. Production Deployment

Target:

**Vercel**

Production architecture:

```text
Browser
   ↓
Vercel
   ↓
Next.js Application
   ↓
PostgreSQL
   ↓
Object Storage
```

Jangan mengandalkan:

```text
local filesystem
```

untuk permanent uploaded files.

---

# 54. Deployment Checklist

Sebelum deployment:

```text
[ ] Build berhasil
[ ] TypeScript tidak error
[ ] ESLint tidak memiliki error kritis
[ ] Prisma migration production siap
[ ] Environment variables tersedia
[ ] Storage credentials tersedia
[ ] Authentication secret tersedia
[ ] Upload bekerja
[ ] WebP conversion bekerja
[ ] Report generation bekerja
[ ] Clipboard bekerja
[ ] Excel export bekerja
```

Setelah deploy:

```text
[ ] Login production
[ ] Create location
[ ] Create team
[ ] Create student
[ ] Create schedule
[ ] Create activity
[ ] Upload documentation
[ ] Generate report
[ ] Copy report
[ ] Export Excel
[ ] Logout
```

---

# 55. Prinsip Implementasi untuk AI Coding Agent

AI coding agent harus:

1. Membaca PRD ini sepenuhnya sebelum coding.
2. Tidak mengarang requirement yang bertentangan dengan PRD.
3. Jika menemukan ambiguity yang benar-benar mempengaruhi arsitektur, tanyakan terlebih dahulu.
4. Jika ambiguity kecil, pilih solusi yang paling sederhana dan dokumentasikan keputusan.
5. Jangan membuat fitur di luar MVP hanya karena terlihat menarik.
6. Jangan membuat mockup yang tidak terhubung ke backend.
7. Semua form harus terhubung ke database.
8. Semua CRUD harus benar-benar berfungsi.
9. Jangan menggunakan dummy data sebagai pengganti backend.
10. Jangan menganggap task selesai hanya karena halaman UI sudah terlihat.
11. Setelah setiap fase, lakukan test.
12. Perbaiki error sebelum lanjut ke fase berikutnya.
13. Jangan meninggalkan TODO kritis.
14. Jangan menggunakan hard-coded data untuk data bisnis.
15. Gunakan reusable components.
16. Gunakan server-side validation untuk operasi penting.
17. Gunakan transaction ketika operasi membutuhkan atomicity.
18. Jangan expose secrets.
19. Jangan menyimpan uploaded files secara permanen di filesystem lokal Vercel.
20. Pastikan production build berhasil.

---

# 56. Prinsip Arsitektur

Prioritas arsitektur:

```text
Simple
↓
Maintainable
↓
Reliable
↓
Scalable
```

Jangan melakukan over-engineering.

Aplikasi ini adalah internal monitoring system, bukan enterprise SaaS.

Lebih baik:

```text
10 fitur benar-benar bekerja
```

daripada:

```text
30 fitur setengah jadi
```

---

# 57. Prinsip UX

Admin harus dapat melakukan:

```text
Login
 ↓
Tambah Kegiatan
 ↓
Pilih Lokasi
 ↓
Pilih Tim
 ↓
Isi Kehadiran
 ↓
Isi Murid
 ↓
Isi Materi
 ↓
Upload Dokumentasi
 ↓
Review
 ↓
Generate Report
 ↓
Copy
```

dengan friction seminimal mungkin.

Tujuan utama bukan membuat dashboard yang terlihat kompleks.

Tujuannya adalah:

**mempermudah pekerjaan administrasi Tazkia Mengajar.**

---

# 58. Acceptance Scenario Utama

Scenario utama:

Admin login.

Admin membuka:

**Tambah Kegiatan**

Admin mengisi:

```text
Nama kegiatan:
Tazkia Mengajar

Tanggal:
12 September 2026

Lokasi:
Desa Binaan Margajaya

Waktu:
13.00 - 14.30

Penerima manfaat:
Anak-anak keluarga prasejahtera

Jumlah:
10

Jenis bantuan:
Pembuatan konten
```

Admin memilih 10 anggota tim.

Contoh:

```text
Shifi Amalia Zein — Hadir
Rackisha Dhia Ezelly Lathief — Hadir
Shanaya Balghis Riyona — Hadir
Amanda Wijayanti — Hadir
Azmi Ittaqi Hammami — Hadir
Muhamad Naufal Fauzan — Izin
Thoriqurrahman Akrami — Sakit
Rahmawati — Hadir
Muhammad Nabil Thoriq — Hadir
Nayla Elrazqya Putri — Hadir
```

Admin memasukkan jumlah murid:

```text
10
```

Admin mengupload dokumentasi.

Admin menekan:

**Generate Report**

Sistem menghasilkan laporan berdasarkan template.

Admin dapat mengedit narasi.

Admin menekan:

**Copy Report**

Laporan berhasil masuk clipboard dan dapat langsung dipaste ke WhatsApp.

Kegiatan kemudian disimpan sebagai:

```text
COMPLETED
```

dan muncul di:

- Dashboard
- Kalender
- Histori
- Rekap
- Statistik

---

# 59. Final Product Goal

Produk akhir harus terasa seperti:

> "Buku administrasi Tazkia Mengajar yang dibuat menjadi aplikasi web."

Bukan:

> "Dashboard template dengan banyak menu."

Setiap fitur harus mempunyai hubungan dengan workflow kegiatan nyata.

Data yang dimasukkan Admin harus dapat digunakan kembali untuk monitoring, rekap, dan reporting.

---

# 60. Final Instruction

Implementasikan aplikasi berdasarkan PRD ini dari awal sampai production deployment.

Jangan berhenti pada:

- UI,
- prototype,
- mock data,
- database saja,
- atau local development.

Target akhir adalah:

**working production web application yang dapat digunakan Admin Tazkia Mengajar melalui Vercel.**