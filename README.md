# ThreadFlow - Automation Konten & Publikasi Threads

Sistem automation untuk mengelola publikasi konten di platform Threads dengan AI-powered content generation dan human-in-the-loop approval workflow.

## Overview

ThreadFlow adalah sistem otomatis yang membantu menjaga konsistensi posting di Threads (3x sehari) tanpa membebani waktu operasional harian. Sistem ini menggunakan AI untuk generate konten, tetapi tetap memberikan kontrol penuh kepada manusia untuk approval sebelum publikasi.

### Fitur Utama

- Generate konten otomatis 3x sehari (08.00, 12.00, 16.00 WIB)
- AI-powered topic generation dengan anti-pengulangan
- Multi-post thread support (utas bersambung)
- Approval workflow via Telegram
- Edit manual dan AI-assisted revision
- Publish otomatis ke Threads via Zernio
- **Dashboard** — Monitor semua aktivitas konten dari satu halaman
- **Evaluasi Otomatis** — AI Judge menilai kualitas konten secara otomatis tiap kali generate

## Tech Stack

| Komponen | Fungsi |
|---|---|
| **n8n** | Orkestrasi automation workflow |
| **Supabase** | Database untuk menyimpan persona, jadwal, draft, dan history |
| **Google Gemini** | AI untuk menyusun topik, menulis, dan merevisi caption |
| **Telegram** | Kanal komunikasi untuk preview, approval, dan revisi |
| **Zernio** | Layanan publish konten ke Threads |
| **React** | Dashboard untuk monitoring & visualisasi data konten |

## Arsitektur Sistem

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Schedule      │     │   Telegram      │     │    Zernio       │
│   Trigger       │     │   Bot           │     │    API          │
│   (3x daily)    │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         n8n Workflows                           │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │ Workflow 1   │    │         Workflow 2                    │  │
│  │ Generate &   │    │  Approval, Reject, Edit              │  │
│  │ Send Approval│    │  (Manual & AI)                        │  │
│  └──────────────┘    └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Google Gemini  │     │    Supabase     │     │    Threads      │
│  (Strategist,   │     │    Database     │     │    Platform     │
│  Writer, Editor)│     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Database Schema

### Tabel Utama

| Tabel | Fungsi |
|-------|--------|
| `persona_pillar` | Menyimpan definisi persona untuk setiap content pillar |
| `angle_schedule` | Jadwal angle (serius/lucu/horror) per hari dan jam |
| `drafts` | Draft konten yang menunggu approval atau sudah diproses |
| `thread_posts` | Individual post dalam sebuah thread (satu draft bisa multi-post) |
| `history` | Arsip konten yang sudah dipublish untuk referensi anti-pengulangan |
| `evaluations` | Hasil evaluasi kualitas konten dari AI Judge (skor per kriteria) |

### Status Draft

- `pending_approval` - Menunggu approval dari user
- `awaiting_edit` - Menunggu input revisi (manual/AI)
- `published` - Sudah terpublish ke Threads
- `rejected` - Ditolak oleh user

Lihat [database/schema.sql](database/schema.sql) untuk detail lengkap.

## Workflow

### Workflow 1: Generate & Kirim Approval

```
Schedule Trigger (08:00, 12:00, 16:00)
    ↓
Cek jadwal angle berdasarkan hari & jam
    ↓
Cek jumlah draft pending (max 3)
    ↓
Ambil persona & history untuk referensi
    ↓
AI Strategist → generate topic baru
    ↓
AI Writer → tulis draft posts
    ↓
AI Editor → revisi & polish
    ↓
Simpan ke database (drafts + thread_posts)
    ↓
Kirim preview ke Telegram dengan tombol:
[Approve] [Edit] [Reject]
```

### Workflow 2: Approval & Edit

```
Telegram Trigger (Message + Callback Query)
    ↓
┌─────────────────────────────────────────────┐
│ Callback Query (tombol ditekan)             │
│   ├─ Approve → Publish ke Threads           │
│   ├─ Reject  → Tandai rejected              │
│   ├─ Edit    → Tampilkan submenu            │
│   ├─ Edit Manual → Mode edit manual         │
│   └─ Edit AI    → Mode edit AI              │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Reply Message (user membalas)               │
│   ├─ edit_mode = manual → parsing format    │
│   └─ edit_mode = ai     → AI revision       │
└─────────────────────────────────────────────┘
```

Lihat [docs/dokumentasi-lengkap.md](docs/dokumentasi-lengkap.md) untuk detail alur workflow.

### Evaluasi Otomatis (AI Judge)

Setiap kali konten di-generate, workflow secara otomatis mengevaluasi kualitas output melalui AI Judge:

```
Code in JavaScript7 (format output)
    ├─→ Create a row (simpan draft) ──→ sisa workflow
    └─→ AI Judge ──→ Merge Scores ──→ Save Evaluation
```

**Kriteria Penilaian (skor 1-10):**

| Kriteria | Deskripsi |
|----------|-----------|
| **Persona** | Konsistensi dengan persona, nada natural dan kredibel |
| **Anti-Cliche** | Kebebasan dari formula klise, pendekatan segar |
| **Relevansi** | Relevansi topik dan potensi engagement |
| **Teknis** | Kualitas penulisan, transisi antar post, tata bahasa |

Hasil evaluasi tersimpan di tabel `evaluations` dan ditampilkan di dashboard tab **Evaluation**.

## Dashboard

ThreadFlow menyediakan dashboard berbasis React untuk memonitor semua aktivitas konten dari satu halaman. Dashboard connect langsung ke Supabase dan menampilkan data secara real-time.

### Fitur Dashboard

| Halaman | Fungsi |
|---------|--------|
| **Overview** | Statistik ringkas (pending, published, rejected, total history) + daftar draft terbaru |
| **Calendar** | Tampilan kalender bulanan dengan color-coded events berdasarkan angle (serius, lucu, horror, Q&A, rekap) |
| **Drafts** | Daftar semua draft lengkap dengan status, pillar, angle, dan jadwal |
| **History** | Riwayat publikasi konten yang sudah terpublish |
| **Evaluation** | Skor evaluasi AI Judge per konten, filter by prompt version, detail output + alasan |

### Color Coding Angle

| Angle | Warna |
|-------|-------|
| Serius (edukasi, BTS, pengalaman) | Biru |
| Lucu (receh) | Kuning |
| Horror (misteri aviasi) | Merah |
| Q&A | Hijau |
| Rekap (refleksi) | Ungu |

### Menjalankan Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Dashboard akan berjalan di `http://localhost:5173/`.

### Konfigurasi

Buat file `dashboard/.env` dengan isi:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

> **Catatan:** Gunakan Supabase **anon key** (bukan service key) karena dashboard diakses dari browser.

## Strategi Konten

### Jadwal Posting

| Hari | 08.00 | 12.00 | 16.00 |
|------|-------|-------|-------|
| Senin | Serius (edukasi) | Lucu (receh) | Serius (pengalaman) |
| Selasa | Horror | Serius (edukasi) | Lucu |
| Rabu | Lucu | Horror | Serius (BTS) |
| Kamis | Serius | Lucu | Horror |
| Jumat | Horror | Serius | Lucu |
| Sabtu | Lucu | Serius | Q&A |
| Minggu | Rekap | Horror | Lucu |

### Angle Definitions

- **Serius** - Insight/edukasi dunia penerbangan dengan nada profesional tapi personal
- **Lucu** - Humor ringan tentang kehidupan pilot (tanpa melanggar SOP/kerahasiaan)
- **Horror** - Cerita misteri dunia aviasi yang kredibel dan tidak clickbait
- **Q&A** - Pertanyaan terbuka untuk followers
- **Rekap** - Refleksi mingguan dengan nada personal

## Setup & Installation

### Prerequisites

- n8n instance (self-hosted atau cloud)
- Supabase project
- Google Gemini API key
- Telegram Bot Token
- Zernio account & API key

### Environment Variables

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Zernio
ZERNIO_API_KEY=your_api_key
ZERNIO_ACCOUNT_ID=your_account_id
```

### Database Setup

1. Buat project baru di Supabase
2. Jalankan SQL dari [database/schema.sql](database/schema.sql) di SQL Editor
3. Tabel dan data awal akan otomatis terbuat

### n8n Setup

1. Import workflow `.json` lo ke n8n (file workflow tidak di-track di GitHub — copy dari backup lokal lo)
2. Konfigurasi credentials untuk:
   - Supabase
   - Google Gemini
   - Telegram
   - Zernio
3. Update reference ke node sesuai dengan nama di workflow Anda
4. Aktifkan workflow

## Penggunaan

### Alur Harian

1. **Generate Otomatis** - Sistem generate draft sesuai jadwal
2. **Notifikasi Telegram** - Preview dikirim ke Telegram Anda
3. **Review & Action**:
   - **Approve** → Langsung publish ke Threads
   - **Edit Manual** → Balas dengan format `1: isi post 1, 2: isi post 2`
   - **Edit AI** → Balas dengan instruksi revisi (contoh: "bikin lebih santai")
   - **Reject** → Draft ditolak dan tidak dipublish

### Format Edit Manual

```
1: Isi post pertama yang sudah direvisi

2: Isi post kedua yang sudah direvisi

3: Isi post ketiga (jika ada)
```

### Tips Penggunaan

- Caption dibuat **generic tanpa referensi waktu spesifik** agar tetap relevan meski approval tertunda
- Maksimal **3 draft** boleh menunggu approval bersamaan
- Reminder akan dikirim tiap **10 menit** untuk draft yang belum direspons

## Troubleshooting

### Error Umum

| Error | Penyebab | Solusi |
|-------|----------|--------|
| "Referenced node doesn't exist" | Nama node salah | Ketik ulang `$( ` untuk autocomplete |
| "Cannot read properties of undefined" | Referensi `.item` gagal | Gunakan `.first()` |
| Duplikasi post di Threads | `threadItems` salah | Gunakan `.slice(1)` |
| Error 409 dari Zernio | Double-tap Approve | Tambahkan cek status sebelum publish |
| Post tidak terpublish semua | `platformSpecificData` salah posisi | Pastikan di dalam `platforms[0]` |
| "Model output doesn't fit format" | AI Judge output bukan JSON | Matiin "Require Specific Output Format", pakai parsing manual |
| "Referenced node doesn't exist" di Merge Scores | Nama node salah | Cek nama node — `$('AI Judge')` harus sesuai nama di canvas |
| Skor evaluasi null/0 | Regex gagal parse | Pastikan prompt minta format `SKOR_PERSONA: [angka]` |

### Debug Tips

- Selalu cek tab Output di n8n sebelum menulis expression
- Struktur output AI Agent biasanya `$json.output.{field}`
- Gunakan "All Filters" pada Update Row untuk kondisi ganda

## Roadmap

### Phase 1 (Current)
- [x] Generate otomatis 3x sehari
- [x] Approval workflow via Telegram
- [x] Edit manual & AI revision
- [x] Multi-post thread support
- [x] Publish ke Threads

### Phase 2
- [ ] Guard anti-duplikasi publish
- [ ] Workflow reminder otomatis
- [ ] Stabilisasi & testing produksi
- [x] Dashboard monitoring (React + Supabase)
- [x] Evaluasi otomatis dengan AI Judge

### Phase 3
- [ ] Ekspansi pillar konten (AI, startup, komunitas, management)
- [ ] Multi-platform support
- [ ] Analytics & reporting

## Project Structure

```
ThreadFlow/
├── dashboard/                  # React dashboard untuk monitoring
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx   # Komponen utama dashboard
│   │   ├── lib/
│   │   │   └── supabase.js     # Supabase client
│   │   ├── App.jsx             # Layout & routing
│   │   ├── App.css             # Styling
│   │   ├── index.css           # Global styles
│   │   └── main.jsx            # Entry point
│   ├── .env                    # Supabase credentials (tidak di-track)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── database/
│   ├── schema.sql              # Database schema & seed data
│   └── schema-new-supabase.sql # Schema untuk testing di Supabase baru
├── docs/
│   ├── screenshots/            # Workflow screenshots
│   │   ├── WF1_ThreadFlow.png
│   │   └── WF2_ThreadFlow.png
│   └── dokumentasi-lengkap.md
├── .gitignore
└── README.md
```

> **Catatan:** File workflow n8n (`.json`) tidak di-track di GitHub karena berisi credential IDs dan API keys. Import langsung dari file lokal lo.

## Contributing

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## License

MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## Acknowledgments

- [n8n](https://n8n.io/) - Workflow automation platform
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Google Gemini](https://ai.google.dev/) - Generative AI
- [Zernio](https://zernio.com/) - Social media scheduling & publishing

---

**ThreadFlow** - Maintaining consistent social media presence without the daily operational burden.
