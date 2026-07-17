-- ThreadFlow Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: persona_pillar
-- Stores persona definitions for each content pillar
CREATE TABLE public.persona_pillar (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  persona_text text NOT NULL,
  tone_rules text,
  updated_at timestamp without time zone DEFAULT now(),
  style_examples text,
  CONSTRAINT persona_pillar_pkey PRIMARY KEY (id)
);

-- Table: angle_schedule
-- Defines which angle to use for each day/time slot combination
CREATE TABLE public.angle_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  day_of_week text NOT NULL,
  time_slot text NOT NULL,
  angle text NOT NULL,
  CONSTRAINT angle_schedule_pkey PRIMARY KEY (id)
);

-- Table: drafts
-- Stores generated content drafts pending approval or already processed
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
  isi_caption text,           -- LEGACY: Content moved to thread_posts table
  edit_mode text,             -- 'manual' or 'ai' - used for edit feature routing
  CONSTRAINT drafts_pkey PRIMARY KEY (id)
);

-- Table: history
-- Archive of published content for anti-repetition reference
CREATE TABLE public.history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  angle text NOT NULL,
  topic text NOT NULL,
  caption text NOT NULL,
  published_at timestamp without time zone,
  CONSTRAINT history_pkey PRIMARY KEY (id)
);

-- Table: thread_posts
-- Individual posts within a thread (one draft can have multiple posts)
CREATE TABLE public.thread_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  draft_id uuid,
  post_order integer NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT thread_posts_pkey PRIMARY KEY (id),
  CONSTRAINT thread_posts_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.drafts(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_drafts_status ON public.drafts(status);
CREATE INDEX idx_drafts_telegram_message_id ON public.drafts(telegram_message_id);
CREATE INDEX idx_thread_posts_draft_id ON public.thread_posts(draft_id);
CREATE INDEX idx_angle_schedule_lookup ON public.angle_schedule(pillar_name, day_of_week, time_slot);
CREATE INDEX idx_history_angle ON public.history(pillar_name, angle);

-- Row Level Security (RLS) Policies
ALTER TABLE public.persona_pillar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.angle_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_posts ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated users" ON public.persona_pillar FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.angle_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.drafts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.thread_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions to service role (for n8n automation)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Insert default schedule for Pilot pillar
INSERT INTO public.angle_schedule (pillar_name, day_of_week, time_slot, angle) VALUES
('Pilot', 'Senin', '08:00', 'Serius'),
('Pilot', 'Senin', '12:00', 'Lucu'),
('Pilot', 'Senin', '16:00', 'Serius'),
('Pilot', 'Selasa', '08:00', 'Horror'),
('Pilot', 'Selasa', '12:00', 'Serius'),
('Pilot', 'Selasa', '16:00', 'Lucu'),
('Pilot', 'Rabu', '08:00', 'Lucu'),
('Pilot', 'Rabu', '12:00', 'Horror'),
('Pilot', 'Rabu', '16:00', 'Serius'),
('Pilot', 'Kamis', '08:00', 'Serius'),
('Pilot', 'Kamis', '12:00', 'Lucu'),
('Pilot', 'Kamis', '16:00', 'Horror'),
('Pilot', 'Jumat', '08:00', 'Horror'),
('Pilot', 'Jumat', '12:00', 'Serius'),
('Pilot', 'Jumat', '16:00', 'Lucu'),
('Pilot', 'Sabtu', '08:00', 'Lucu'),
('Pilot', 'Sabtu', '12:00', 'Serius'),
('Pilot', 'Sabtu', '16:00', 'Q&A'),
('Pilot', 'Minggu', '08:00', 'Rekap'),
('Pilot', 'Minggu', '12:00', 'Horror'),
('Pilot', 'Minggu', '16:00', 'Lucu');

-- Table: evaluations
-- Stores evaluation results from AI judge scoring
CREATE TABLE public.evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  angle text NOT NULL,
  topic text,
  output_thread text,
  skor_persona integer,
  skor_cliche integer,
  skor_relevansi integer,
  skor_teknis integer,
  skor_total numeric GENERATED ALWAYS AS (
    COALESCE(skor_persona, 0) + COALESCE(skor_cliche, 0) + COALESCE(skor_relevansi, 0) + COALESCE(skor_teknis, 0)
  ) STORED,
  alasan_judge text,
  prompt_version text DEFAULT 'v1'::text,
  model_used text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT evaluations_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_evaluations_prompt_version ON public.evaluations(prompt_version);
CREATE INDEX idx_evaluations_created_at ON public.evaluations(created_at);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.evaluations TO service_role;

-- Insert default persona for Pilot pillar
INSERT INTO public.persona_pillar (pillar_name, persona_text, tone_rules, style_examples) VALUES
('Pilot',
 'Pilot komersial berlisensi dengan rating Boeing 737-800/900. Bekerja di maskapai swasta Indonesia. Berpengalaman dalam penerbangan domestik dan regional.',

 'Nada suara: Kredibel, personal, kadang serius, kadang jenaka, kadang bikin merinding (horror).

 Aturan penting:
 - JANGAN pernah menyebut nama maskapai atau informasi rahasia perusahaan
 - Jangan menyebutkan SOP spesifik yang bisa mengganggu keselamatan
 - Gunakan bahasa Indonesia casual tapi tetap profesional
 - Hindari jargon teknis berlebihan, jelaskan dengan cara yang mudah dipahami
 - Sertakan nuansa kemanusiaan dalam setiap cerita
 - Untuk angle horror: jangan menyebarkan hoax atau informasi menyesatkan
 - Untuk angle lucu: tetap sopan dan tidak menyinggung pihak manapun',

 'Contoh gaya penulisan:

 [Serius]
 "Banyak yang bertanya, kokpit itu dingin atau panas? Jawabannya: tergantung. Di darat, bisa kepanasan kalau AC mati. Di altitude 35.000 kaki, di luar -50°C, tapi di dalam kokpit kita punya kontrol suhu sendiri. Yang jadi masalah bukan dingin atau panas, tapi kelembaban. Kulit jadi kering, mata pegal. Itu bagian dari pekerjaan yang jarang orang tahu."

 [Lucu]
 "Pertanyaan paling sering ditanyakan penumpang: 'Mas, bisa minta upgrade ga?' Teman, kalau saya bisa upgrade semua penumpang, saya udah jadi CEO maskapai bukan pilotnya."

 [Horror]
 "Penerbangan malam ke wilayah timur Indonesia. Penumpang sudah pada tidur, cabin crew juga istirahat bergantian. Di tengah penerbangan, saya dapati ada penumpang berdiri di belakang, nonton kita dari jauh. Tidak bergerak. Tidak berkedip. Sampai kita landing, penumpang itu tidak pernah kembali ke kursinya. Cabin crew bilang tidak ada penumpang yang berdiri saat itu."'
);
