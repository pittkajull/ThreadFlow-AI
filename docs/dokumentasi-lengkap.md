# Dokumentasi Lengkap — Automation Konten & Publikasi Threads (Persona Pilot)

Dokumen ini merangkum keseluruhan project: konsep, strategi konten, arsitektur teknis, skema database, alur tiap workflow, bug-bug yang pernah ditemukan beserta solusinya, dan status terkini.

---

## 1. Latar Belakang & Tujuan

Project ini membangun sistem automation untuk mengelola publikasi konten di platform **Threads**, dengan studi kasus pertama pada persona **pilot komersial**. Tujuannya: menjaga frekuensi posting yang konsisten (3x sehari) tanpa membebani waktu operasional harian pemilik akun, sambil tetap menjaga kualitas dan kontrol penuh manusia atas apa yang dipublikasikan.

Pemilik akun (disebut "user" di dokumen ini) punya multi-profesi: pilot komersial (Boeing 737-800/900, licensed, maskapai swasta), founder JogjaCreativeProd, praktisi/investor di bidang AI, co-founder komunitas Kagama Digital & Inovasi (@kagamadigi), dan mahasiswa S2 Magister Management UGM. **Untuk fase ini, sistem difokuskan hanya pada satu pillar konten: Pilot & Pesawat.** Pillar lain (AI, startup, komunitas, management) direncanakan menyusul di fase berikutnya, dengan pola yang sama.

---

## 2. Strategi Konten

### 2.1 Persona

Akun berbicara murni sebagai pilot komersial — tidak mencampur identitas/profesi lain dalam pillar ini. Nada suara: kredibel, personal, kadang serius, kadang jenaka, kadang bikin merinding (horror).

### 2.2 Jadwal Posting

3x sehari: **08.00, 12.00, 16.00**. Tiap slot punya angle tetap per hari (bukan rotasi acak):

| Hari | 08.00 (pagi) | 12.00 (siang) | 16.00 (sore) |
|---|---|---|---|
| Senin | Serius (fakta/edukasi) | Lucu (relate/receh) | Serius (pengalaman) |
| Selasa | Horror (cerita) | Serius (edukasi) | Lucu (meme/quote) |
| Rabu | Lucu (receh) | Horror/mistis | Serius (behind the scene) |
| Kamis | Serius | Lucu | Horror |
| Jumat | Horror | Serius | Lucu |
| Sabtu | Lucu | Serius | Q&A (pertanyaan terbuka) |
| Minggu | Rekap/reflektif | Horror | Lucu ringan |

Catatan: jam tayang **aktual** bisa lebih fleksibel dari jadwal di atas — begitu draft di-generate, publikasi baru terjadi setelah pemilik akun menekan Approve, kapanpun itu. Karena itu, isi caption sengaja dibuat **generic tanpa referensi waktu spesifik** agar tetap relevan meski approval tertunda.

### 2.3 Definisi Tiap Angle

- **Serius** — insight/edukasi seputar dunia penerbangan, nada profesional tapi personal. Contoh tema: proses jadi pilot, sistem kerja kokpit, safety procedure, jenjang karier & gaji pilot, beda 737-800 vs 737-900, cerita nyata soal turbulensi.
- **Lucu/receh** — humor ringan, sopan, tidak menyinggung SOP/kerahasiaan maskapai. Contoh tema: stereotip orang soal pilot, drama sama ground crew, momen kocak di crew room, pertanyaan absurd dari penumpang.
- **Horror/mistis** — cerita/misteri dunia aviasi yang kredibel, tidak clickbait murahan. Contoh tema: penerbangan malam, "penumpang aneh", legenda pilot/cabin crew — tetap dijaga supaya tidak menyebarkan hoax/misleading.
- **Q&A/interaksi** (Sabtu 16.00) — format pertanyaan terbuka, mengundang followers menjawab/cerita di reply.
- **Rekap/reflektif** (Minggu 08.00) — closing minggu dengan nada personal, merenungkan sisi manusiawi dari jadi pilot. Contoh tema: highlight momen berkesan, hal yang bikin bersyukur, capek yang jarang terlihat orang, rasa pulang setelah rotasi terbang.

### 2.4 Antrian & Reminder (Kesepakatan Desain)

- Generate konten dilakukan **on-demand** persis di jam slot (bukan disiapkan jauh-jauh hari/batch mingguan).
- Setelah di-generate, dikirim ke Telegram untuk approval. Begitu di-approve, **langsung tayang saat itu juga** (jam tayang aktual = jam approval, bukan jam jadwal).
- Kalau belum direspons, sistem mengirim **reminder tiap 10 menit** sampai direspons.
- Maksimal **3 draft** boleh menunggu approval bersamaan. Kalau sudah penuh, slot generate berikutnya **ditunda** sampai salah satu draft yang menunggu selesai (di-approve atau ditolak).

---

## 3. Arsitektur Sistem

### 3.1 Stack Teknis

| Komponen | Fungsi |
|---|---|
| **n8n** | Mesin orkestrasi/automation yang menjalankan seluruh alur kerja |
| **Supabase** | Database — menyimpan persona, jadwal angle, draft, riwayat, dan isi post |
| **Google Gemini** | Model AI yang menyusun topik, menulis, dan merevisi caption |
| **Telegram** | Kanal komunikasi antara sistem dan pemilik akun — preview, approval, reminder, revisi |
| **Zernio** | Layanan pihak ketiga yang mempublikasikan konten ke Threads (mendukung publish thread/utas bersambung serta penjadwalan) |

### 3.2 Struktur Workflow n8n

Karena **Telegram API hanya mengizinkan satu webhook aktif per bot**, seluruh interaksi tombol (callback_query) dan reply pesan (message) digabung dalam **satu Telegram Trigger** di Workflow 2, lalu di-routing menggunakan node IF/Switch.

| Workflow | Isi | Trigger |
|---|---|---|
| **Workflow 1** | Generate draft baru otomatis | Schedule Trigger (Cron: `0 8,12,16 * * *`, timezone `Asia/Jakarta`) |
| **Workflow 2** | Gabungan: handle tombol (Approve/Edit/Reject/Edit Manual/Edit AI) + handle reply pesan (edit manual & edit AI) | 1 Telegram Trigger (Update: Message + Callback Query) |

---

## 4. Skema Database (Supabase)

```sql
CREATE TABLE public.persona_pillar (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  persona_text text NOT NULL,
  tone_rules text,
  updated_at timestamp without time zone DEFAULT now(),
  style_examples text,
  CONSTRAINT persona_pillar_pkey PRIMARY KEY (id)
);

CREATE TABLE public.angle_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  day_of_week text NOT NULL,
  time_slot text NOT NULL,
  angle text NOT NULL,
  CONSTRAINT angle_schedule_pkey PRIMARY KEY (id)
);

CREATE TABLE public.drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  angle text NOT NULL,
  topic text,
  status text DEFAULT 'pending_approval'::text,
  scheduled_time timestamp without time zone,
  actual_publish_time timestamp without time zone,
  telegram_message_id text,
  reminder_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  isi_caption text,           -- LEGACY, sudah tidak dipakai (isi caption pindah ke thread_posts)
  edit_mode text,             -- 'manual' atau 'ai', ditambahkan belakangan untuk fitur edit
  CONSTRAINT drafts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  angle text NOT NULL,
  topic text NOT NULL,
  caption text NOT NULL,
  published_at timestamp without time zone,
  CONSTRAINT history_pkey PRIMARY KEY (id)
);

CREATE TABLE public.thread_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  draft_id uuid,
  post_order integer NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT thread_posts_pkey PRIMARY KEY (id),
  CONSTRAINT thread_posts_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.drafts(id)
);
```

**Catatan struktur:** satu `drafts` = satu "unit approval" (bisa berisi beberapa post berurutan/thread). Isi tiap post disimpan terpisah di `thread_posts`, dihubungkan lewat `draft_id`, dan diurutkan pakai `post_order`.

---

## 5. Workflow 1 — Generate & Kirim Approval

Alur node secara berurutan:

1. **Schedule Trigger** — cron `0 8,12,16 * * *`, timezone Asia/Jakarta.
2. **Code** — menentukan `day_name` dan `slot_time` saat ini.
3. **Get a row** (Supabase) — ambil `angle` dari tabel `angle_schedule` sesuai hari & jam.
4. **Get many rows** (Supabase) — ambil semua `drafts` berstatus `pending_approval`, dihitung jumlahnya.
5. **Code + IF** — kalau jumlah pending ≥ 3, hentikan eksekusi (skip generate slot ini).
6. **Get a row** — ambil `persona_pillar` (deskripsi persona & tone rules).
7. **Get many rows** — ambil `history` (10 entri terakhir untuk angle ini) sebagai referensi anti-pengulangan topik.
8. **AI Agent Strategist** (Google Gemini + Structured Output Parser) — menentukan `topic` dan `sudut_pandang` baru yang belum ada di history.
9. **AI Agent Writer** (Google Gemini + Structured Output Parser) — menulis draft berupa beberapa post (array `posts`).
10. **AI Agent Editor** (Google Gemini + Structured Output Parser) — merevisi gaya bicara, memastikan konsisten dengan persona, dan **menghapus semua referensi waktu spesifik**.
11. **Code** — parsing hasil akhir, membentuk data siap insert.
12. **Create a row** (Supabase) — insert row induk ke `drafts` (status: `pending_approval`).
13. **Code** — memecah array `posts` menjadi item-item terpisah, masing-masing membawa `draft_id`, `content`, `post_order`.
14. **Create a row** (Supabase, dijalankan per item) — insert ke `thread_posts`.
15. **Telegram: Send Message** — kirim preview lengkap ke Telegram + 3 tombol inline: **Approve / Edit / Reject** (`callback_data`: `approve_{id}`, `edit_{id}`, `reject_{id}`).

---

## 6. Workflow 2 — Approval, Reject, Edit (Manual & AI)

### 6.1 Routing Utama

```
Telegram Trigger1 (Update: Message + Callback Query)
  → If2 — cek {{ $json.callback_query }} exists?
      ├─ True  → Code (parse callback_data → action, draft_id, chat_id, message_id)
      │            → Switch (routing berdasarkan action)
      │                ├─ Approve      → [alur publish, lihat 6.2]
      │                ├─ Reject       → [alur reject, lihat 6.3]
      │                ├─ Edit         → [submenu, lihat 6.4]
      │                ├─ Edit Manual  → [alur edit manual, lihat 6.5]
      │                └─ Edit AI      → [alur edit AI, lihat 6.6]
      │
      └─ False → If1 — cek {{ $json.message.reply_to_message }} exists?
                   ├─ True  → Get many rows (cari draft by telegram_message_id)
                   │            → IF — cek {{ $json.edit_mode }} equals "ai"?
                   │                ├─ True  (ai)     → [chain AI Revisi, lihat 6.6]
                   │                └─ False (manual) → [parsing edit manual, lihat 6.5]
                   └─ False → diabaikan (pesan biasa, bukan reply)
```

### 6.2 Cabang Approve — Publish ke Threads

1. **Get a row** — ambil data draft berdasarkan `draft_id`.
2. **Get many rows** — ambil semua `thread_posts` milik draft ini, diurutkan `post_order` ASC.
3. **Code** — susun body request:
   - `content` = post pertama (index 0)
   - `threadItems` = post ke-2 dan seterusnya (**wajib `.slice(1)`**, tidak boleh menyertakan post pertama lagi)
4. **HTTP Request** — `POST https://zernio.com/api/v1/posts`
   ```json
   {
     "content": "...",
     "platforms": [{
       "platform": "threads",
       "accountId": "...",
       "platformSpecificData": { "threadItems": [{ "content": "..." }] }
     }],
     "publishNow": true
   }
   ```
   **Poin krusial:** `platformSpecificData` harus berada **di dalam** object `platforms[0]`, bukan sejajar di level atas body.
5. **Update Row** — set `status: published`, simpan `actual_publish_time` dan `zernio_post_id`.
6. **Insert Row ke `history`** — supaya Strategist di masa depan tidak mengulang topik ini.
7. **Edit Message Text** (Telegram) — ubah pesan preview jadi konfirmasi terpublish, hapus tombol.

### 6.3 Cabang Reject

1. **Update Row** — `status: rejected`.
2. **Edit Message Text** (Telegram) — tandai ditolak, hapus tombol.

### 6.4 Cabang Edit — Submenu

1. **Telegram: Send Message** — kirim submenu 2 tombol: **"✍️ Manual"** (`callback_data: editmanual_{draft_id}`) dan **"🤖 AI Revisi"** (`callback_data: editai_{draft_id}`).

### 6.5 Cabang Edit Manual

1. **Update Row** — set `edit_mode: manual`, `status: awaiting_edit`.
2. **Telegram: Send Message** — kirim instruksi format: *"Balas pesan ini dengan format: 1: isi post pertama, 2: isi post kedua, dst"*.
3. **Update Row** — simpan `telegram_message_id` dari pesan instruksi ini (`{{ $json.result.message_id }}`).

**Setelah user membalas (reply):**

4. **Get many rows** — cari draft dengan `telegram_message_id` = `reply_to_message.message_id`.
5. **IF (edit_mode)** — hasil `false` (bukan `ai`) → lanjut:
6. **Code** — parsing tiap baris `nomor: isi` (dipisah baris kosong) menjadi array `{draft_id, post_order, content}`.
7. **Update Row** — update `content` di `thread_posts` per `post_order`. **Wajib "Must Match: All Filters"**.
8. **Aggregate** — menyatukan kembali multiple item jadi satu.
9. **Get many rows** — ambil ulang semua `thread_posts` (post-update), sorted by `post_order`.
10. **Code** — susun ulang teks preview lengkap.
11. **Update Row** — `status: pending_approval`.
12. **Telegram: Send Message** — kirim ulang preview + 3 tombol Approve/Edit/Reject.

### 6.6 Cabang Edit AI

1. **Update Row** — set `edit_mode: ai`, `status: awaiting_edit`.
2. **Telegram: Send Message** — kirim instruksi: *"Balas pesan ini dengan instruksi revisi buat AI (contoh: 'bikin lebih santai')"*.
3. **Update Row** — simpan `telegram_message_id` dari pesan ini.

**Setelah user membalas (reply):**

4. **Get many rows** — cari draft dengan `telegram_message_id` cocok.
5. **IF (edit_mode)** — hasil `true` (`ai`) → lanjut ke chain AI Revisi:
6. **Get Draft Awaiting Edit** (Get Many, filter `status=awaiting_edit` + `telegram_message_id`, referensi ke Telegram Trigger pakai `.first()`).
7. **Get Old Thread Posts** — ambil semua post lama milik draft ini.
8. **Susun Konteks Revisi** (Code) — menggabungkan post lama + instruksi revisi user (`$json.message.text`).
9. **AI Agent Revisi** (Google Gemini + Structured Output Parser) — menghasilkan versi baru seluruh post.
10. **Delete Old Thread Posts** — hapus semua post lama milik draft ini.
11. **Split Post Revisi** (Code) — memecah hasil AI jadi item per post.
12. **Loop Insert Thread Posts** (Loop Over Items + Limit) — insert satu per satu.
13. **Update Draft Pending** — `status: pending_approval`.
14. **Get New Thread Posts** — ambil ulang post yang baru diinsert.
15. **Susun Preview Revisi** (Code) — menyusun teks preview.
16. **HTTP Request / Telegram Send Message** — kirim ulang preview + 3 tombol.

---

## 7. Bug-Bug yang Pernah Ditemukan (Riwayat & Solusi)

1. **Placeholder nama node belum diganti** — kode Code node sempat berisi nama contoh seperti `'Node 3'` yang belum diganti ke nama asli, menyebabkan error *"Referenced node doesn't exist"*. **Solusi:** ketik ulang `$(` di editor supaya dropdown autocomplete muncul, pilih nama node yang benar-benar ada.

2. **`.item` vs `.first()`** — referensi lintas node (`$('NamaNode').item...`) gagal dengan *"Cannot read properties of undefined"* setelah melewati banyak percabangan. **Solusi:** ganti `.item` jadi `.first()`.

3. **Struktur output AI Agent tidak konsisten** — biasanya `$json.output.{field}`, bukan `$json.{field}` langsung atau `$json.response.output.{field}`. **Solusi:** selalu cek tab Output sebelum menulis expression.

4. **Debug line tertinggal** — `throw new Error("INPUT: " + JSON.stringify(...))` sempat tertinggal di kode produksi, menyebabkan setiap eksekusi selalu gagal.

5. **Duplikasi post pertama di thread Zernio** — `threadItems` sempat berisi seluruh array termasuk post pertama, menyebabkan post pertama tampil dobel. **Solusi:** `threadItems` harus `.slice(1)`.

6. **`platformSpecificData` salah posisi** — sempat sejajar dengan `content`/`platforms` di root body, seharusnya di dalam `platforms[0]`. Menyebabkan hanya satu post yang terpublish.

7. **"Must Match: Any Filter" pada Update Row** — menyebabkan data `thread_posts` tertimpa salah karena kondisi ganda tidak dievaluasi sebagai gabungan wajib. **Solusi:** gunakan "All Filters".

8. **`telegram_message_id` tidak tersimpan / salah path** — sempat lupa disimpan, atau diambil dari path yang salah (`$json.message_id` alih-alih `$json.result.message_id`).

9. **`edit_mode` tidak direset antar percobaan** — draft yang pernah diuji lewat jalur AI tetap membawa nilai lama meski dites ulang lewat jalur Manual. **Solusi:** kedua cabang wajib menuliskan ulang `edit_mode` miliknya sendiri setiap kali dipicu.

10. **IF node dead-end (belum tersambung ke node berikutnya)** — sempat terjadi saat penggabungan Workflow 2 & 3, IF node terlihat di jalur benar namun outputnya belum benar-benar tersambung.

11. **Duplikasi publish (error 409 dari Zernio)** — *"This exact content is already scheduled, publishing, or was posted to this account within the last 24 hours"*. Kemungkinan besar karena tombol Approve ter-trigger dua kali (double-tap atau race condition). **Solusi yang direkomendasikan (belum diterapkan):** tambahkan pengecekan status draft di awal alur Approve — kalau `status` sudah `published`, hentikan eksekusi lebih dini.

---

## 8. Status Saat Ini

**Sudah berjalan dan teruji:**
- Generate otomatis 3x sehari dengan anti-pengulangan topik
- Approve → publish ke Threads sebagai thread bersambung (multi-post)
- Reject
- Edit Manual (reply format nomor)
- Edit AI (reply instruksi bebas)

**Diketahui berpotensi bermasalah:**
- Race condition pada double-tap tombol Approve (poin 11) — perlu ditambahkan pengecekan status sebelum publish

**Belum dibangun:**
- Workflow reminder — pengingat otomatis tiap 10 menit untuk draft yang belum direspons (baru sebatas kesepakatan desain)
- Pembersihan data draft lama hasil testing yang isinya tidak konsisten (aman diabaikan)

---

## 9. Rencana Selanjutnya

1. Menambahkan guard anti-duplikasi publish — cek status draft sebelum memanggil Zernio.
2. Membangun Workflow reminder — cron tiap 10 menit, ambil semua draft `pending_approval`/`awaiting_edit` yang sudah lewat 10 menit, kirim ulang pengingat.
3. Masa stabilisasi — menjalankan sistem pada penggunaan nyata sebelum diperluas.
4. Ekspansi pillar konten lain — AI & teknologi, startup & investasi, Kagama Digital & Inovasi, management.
5. Kemungkinan ekspansi platform lain — belum direncanakan konkret, saat ini fokus penuh di Threads.

---

## 10. Screenshot Workflow

Lihat folder `docs/screenshots/` untuk visualisasi workflow:
- `WF1_ThreadFlow.png` - Workflow 1: Generate & Kirim Approval
- `WF2_ThreadFlow.png` - Workflow 2: Approval, Reject, Edit
