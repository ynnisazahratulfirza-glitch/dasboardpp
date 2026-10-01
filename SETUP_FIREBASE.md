# Setup Firebase untuk Dashboard PLN

## Langkah 1: Buat Project Firebase
1. Buka https://console.firebase.google.com
2. Klik "Add project" → beri nama misal "dashboard-pln"
3. Nonaktifkan Google Analytics (opsional) → klik "Create project"

## Langkah 2: Buat Web App
1. Di halaman project, klik ikon "</>" (Web)
2. Daftarkan app dengan nama "dashboard-pln"
3. Copy konfigurasi yang muncul (apiKey, authDomain, dll)

## Langkah 3: Aktifkan Firestore
1. Di sidebar kiri, klik "Firestore Database"
2. Klik "Create database"
3. Pilih "Start in test mode" (untuk development)
4. Pilih region terdekat (misal: asia-southeast1)
5. Klik "Enable"

## Langkah 4: Isi File .env
Buka file `.env` di folder `dashboard-pln` dan isi dengan konfigurasi Firebase kamu:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=nama-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nama-project
VITE_FIREBASE_STORAGE_BUCKET=nama-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Langkah 5: Jalankan Aplikasi
```bash
npm run dev
```

Buka browser di http://localhost:5173

## Koleksi Firestore yang Digunakan
- `daftar_tunggu` - Data dari Excel upload
- `perluasan_jaringan` - Data yang diinput manual

## Catatan Kolom Excel
Aplikasi akan otomatis mendeteksi kolom dari file Excel dengan nama:
- Nama Pelanggan / NAMA PELANGGAN
- ID Pelanggan / ID PEL
- No Agenda / NO AGENDA
- Kategori Pelanggan / KATEGORI
- Status APP / STATUS
- ULP
- Daya Lama / DAYA LAMA
- Daya Baru / DAYA BARU
- Tanggal / TGL
- Keterangan

Deteksi Kategori otomatis:
- "Pasang Baru" / "PB" → dikategorikan sebagai Pasang Baru
- "Perubahan Daya" / "PD" / "Ubah Daya" → dikategorikan sebagai Perubahan Daya
