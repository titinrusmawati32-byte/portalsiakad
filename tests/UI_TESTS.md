# UI/UX & RESPONSIVENESS TEST SUITE
# PORTAL ADMINISTRASI GURU SD

Dokumen pengujian ini memvalidasi kepatuhan antarmuka terhadap referensi desain visual resmi, tata letak responsif pada berbagai ukuran layar, serta mode tampilan terang/gelap.

---

## 1. Kesesuaian Desain Visual (Design Fidelity)

| Elemen Antarmuka | Target Desain Referensi | Hasil Implementasi | Status |
|---|---|---|---|
| Sidebar Kiri | Navy `#142B4A` dengan logo Tut Wuri Handayani, nama SD, profil guru di bawah | Terpasang sesuai token HEX dan ikon | PASSED |
| Header App Bar | Breadcrumb, Pill Tahun Pelajaran 2026/2027, Dark/Light switch, Badge Bell '3' | Lengkap dan interaktif | PASSED |
| Hero Welcome Card | Banner sapaan guru, pill sekolah & kelas, ilustrasi guru berseragam dinas & gedung SD | Menggunakan SVG dinamis dan skema gradient sky | PASSED |
| 5 Top KPI Cards | Siswa (28), Hadir (26), Kelas (4), Perangkat (12), Pending (3) dengan lingkaran warna-warni | Identik dengan susunan 5 kolom | PASSED |
| Grafik Kehadiran | Line chart 7 hari terakhir, fill gradient biru, titik koordinat, peak badge 96% | SVG interaktif dengan filter dropdown | PASSED |
| Jadwal Hari Ini | Tabel jam, kelas, mapel, badge status Selesai, Berlangsung, Menunggu | Terpasang dengan status dinamis | PASSED |
| Pengumuman & Pengingat | Card berita sekolah, pengingat dengan dot kuning/merah/biru, banner Semangat Mengajar | Tampil rapi di kolom kanan | PASSED |
| Aktivitas Terbaru | Timeline 3 entri dengan badge kategori (Presensi, Nilai, Pembelajaran) | Terpasang di grid bawah kiri | PASSED |
| Akses Cepat 6-Grid | 6 Kotak ikon pastel (QR, Manual, Nilai, Jurnal, Perangkat, Laporan) | Kotak interaktif dengan efek hover | PASSED |

---

## 2. Pengujian Responsivitas Perangkat

### Desktop Display (> 1200px)
- Sidebar tetap (fixed) di sisi kiri selebar 260px.
- Grid 5 kolom untuk metrik atas tersaji proporsional.
- Konten tengah tersusun dalam 3 kolom (Grafik, Jadwal, Pengumuman).
- Tidak ada horizontal overflow.

### Tablet Display (768px - 1199px)
- Grid metrik menyesuaikan menjadi 2 atau 3 kolom.
- Kolom tengah dan bawah mengalir secara vertikal (1 kolom).
- Tabel dapat digulir horizontal secara halus di dalam kontainer.

### Mobile Smartphone (< 768px)
- Sidebar menjadi drawer tersembunyi yang dapat dibuka via tombol hamburger di header.
- Hero card menyesuaikan tata letak vertikal.
- Akses cepat berubah menjadi grid 2 kolom yang nyaman disentuh (touch-friendly).
- Tidak ada horizontal scrollbar pada keseluruhan halaman web (`overflow-x: hidden`).

---

## 3. Pengujian Mode Tampilan (Theme Switch)
- **Light Mode**: Latar belakang `#F5F7FB`, kartu `#FFFFFF`, teks `#0F172A`.
- **Dark Mode**: Latar belakang `#0B1320`, kartu `#152238`, teks `#F8FAFC`.
- Pilihan tema tersimpan di `localStorage` dan dimuat otomatis saat pengguna kembali.
- Status: PASSED
