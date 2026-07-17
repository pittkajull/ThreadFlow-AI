-- ThreadFlow — Testing Supabase Schema
-- Persis seperti yang dibutuhkan Threads Final workflow + evaluations table
-- Safe to run multiple times

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES (identical to production)
-- =============================================

CREATE TABLE IF NOT EXISTS public.persona_pillar (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  persona_text text NOT NULL,
  tone_rules text,
  updated_at timestamp without time zone DEFAULT now(),
  style_examples text,
  CONSTRAINT persona_pillar_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.angle_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  day_of_week text NOT NULL,
  time_slot text NOT NULL,
  angle text NOT NULL,
  CONSTRAINT angle_schedule_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.drafts (
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
  isi_caption text,
  edit_mode text,
  CONSTRAINT drafts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pillar_name text NOT NULL,
  angle text NOT NULL,
  topic text NOT NULL,
  caption text NOT NULL,
  published_at timestamp without time zone,
  CONSTRAINT history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.thread_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  draft_id uuid,
  post_order integer NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT thread_posts_pkey PRIMARY KEY (id),
  CONSTRAINT thread_posts_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.drafts(id) ON DELETE CASCADE
);

-- =============================================
-- NEW: Evaluations table
-- =============================================

CREATE TABLE IF NOT EXISTS public.evaluations (
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

-- =============================================
-- INDEXES
-- =============================================

DO $$ BEGIN CREATE INDEX idx_drafts_status ON public.drafts(status); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_drafts_telegram_message_id ON public.drafts(telegram_message_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_thread_posts_draft_id ON public.thread_posts(draft_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_angle_schedule_lookup ON public.angle_schedule(pillar_name, day_of_week, time_slot); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_history_angle ON public.history(pillar_name, angle); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_evaluations_prompt_version ON public.evaluations(prompt_version); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_evaluations_created_at ON public.evaluations(created_at); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.persona_pillar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.angle_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Allow all for authenticated users" ON public.persona_pillar FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for authenticated users" ON public.angle_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for authenticated users" ON public.drafts FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for authenticated users" ON public.history FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for authenticated users" ON public.thread_posts FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for authenticated users" ON public.evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================
-- SEED DATA: Angle Schedule (5 pillars sesuai ACTIVE_PILLARS di workflow)
-- =============================================

INSERT INTO public.angle_schedule (pillar_name, day_of_week, time_slot, angle) VALUES
-- Entrepreneurship
('Entrepreneurship', 'senin', '06:00', 'Serius'),
('Entrepreneurship', 'senin', '09:00', 'Lucu'),
('Entrepreneurship', 'senin', '12:00', 'Serius'),
('Entrepreneurship', 'senin', '15:00', 'Horror'),
('Entrepreneurship', 'senin', '18:00', 'Lucu'),
('Entrepreneurship', 'selasa', '06:00', 'Lucu'),
('Entrepreneurship', 'selasa', '09:00', 'Serius'),
('Entrepreneurship', 'selasa', '12:00', 'Horror'),
('Entrepreneurship', 'selasa', '15:00', 'Serius'),
('Entrepreneurship', 'selasa', '18:00', 'Lucu'),
('Entrepreneurship', 'rabu', '06:00', 'Serius'),
('Entrepreneurship', 'rabu', '09:00', 'Lucu'),
('Entrepreneurship', 'rabu', '12:00', 'Serius'),
('Entrepreneurship', 'rabu', '15:00', 'Horror'),
('Entrepreneurship', 'rabu', '18:00', 'Lucu'),
('Entrepreneurship', 'kamis', '06:00', 'Horror'),
('Entrepreneurship', 'kamis', '09:00', 'Serius'),
('Entrepreneurship', 'kamis', '12:00', 'Lucu'),
('Entrepreneurship', 'kamis', '15:00', 'Serius'),
('Entrepreneurship', 'kamis', '18:00', 'Horror'),
('Entrepreneurship', 'jumat', '06:00', 'Lucu'),
('Entrepreneurship', 'jumat', '09:00', 'Horror'),
('Entrepreneurship', 'jumat', '12:00', 'Serius'),
('Entrepreneurship', 'jumat', '15:00', 'Lucu'),
('Entrepreneurship', 'jumat', '18:00', 'Serius'),
('Entrepreneurship', 'sabtu', '06:00', 'Serius'),
('Entrepreneurship', 'sabtu', '09:00', 'Lucu'),
('Entrepreneurship', 'sabtu', '12:00', 'Q&A'),
('Entrepreneurship', 'sabtu', '15:00', 'Rekap'),
('Entrepreneurship', 'sabtu', '18:00', 'Horror'),
('Entrepreneurship', 'minggu', '06:00', 'Rekap'),
('Entrepreneurship', 'minggu', '09:00', 'Horror'),
('Entrepreneurship', 'minggu', '12:00', 'Lucu'),
('Entrepreneurship', 'minggu', '15:00', 'Serius'),
('Entrepreneurship', 'minggu', '18:00', 'Lucu'),
-- Personal Reflection
('Personal Reflection', 'senin', '06:00', 'Serius'),
('Personal Reflection', 'senin', '09:00', 'Lucu'),
('Personal Reflection', 'senin', '12:00', 'Serius'),
('Personal Reflection', 'senin', '15:00', 'Horror'),
('Personal Reflection', 'senin', '18:00', 'Lucu'),
('Personal Reflection', 'selasa', '06:00', 'Lucu'),
('Personal Reflection', 'selasa', '09:00', 'Serius'),
('Personal Reflection', 'selasa', '12:00', 'Horror'),
('Personal Reflection', 'selasa', '15:00', 'Serius'),
('Personal Reflection', 'selasa', '18:00', 'Lucu'),
('Personal Reflection', 'rabu', '06:00', 'Serius'),
('Personal Reflection', 'rabu', '09:00', 'Lucu'),
('Personal Reflection', 'rabu', '12:00', 'Serius'),
('Personal Reflection', 'rabu', '15:00', 'Horror'),
('Personal Reflection', 'rabu', '18:00', 'Lucu'),
('Personal Reflection', 'kamis', '06:00', 'Horror'),
('Personal Reflection', 'kamis', '09:00', 'Serius'),
('Personal Reflection', 'kamis', '12:00', 'Lucu'),
('Personal Reflection', 'kamis', '15:00', 'Serius'),
('Personal Reflection', 'kamis', '18:00', 'Horror'),
('Personal Reflection', 'jumat', '06:00', 'Lucu'),
('Personal Reflection', 'jumat', '09:00', 'Horror'),
('Personal Reflection', 'jumat', '12:00', 'Serius'),
('Personal Reflection', 'jumat', '15:00', 'Lucu'),
('Personal Reflection', 'jumat', '18:00', 'Serius'),
('Personal Reflection', 'sabtu', '06:00', 'Serius'),
('Personal Reflection', 'sabtu', '09:00', 'Lucu'),
('Personal Reflection', 'sabtu', '12:00', 'Q&A'),
('Personal Reflection', 'sabtu', '15:00', 'Rekap'),
('Personal Reflection', 'sabtu', '18:00', 'Horror'),
('Personal Reflection', 'minggu', '06:00', 'Rekap'),
('Personal Reflection', 'minggu', '09:00', 'Horror'),
('Personal Reflection', 'minggu', '12:00', 'Lucu'),
('Personal Reflection', 'minggu', '15:00', 'Serius'),
('Personal Reflection', 'minggu', '18:00', 'Lucu'),
-- MBA Journey
('MBA Journey', 'senin', '06:00', 'Serius'),
('MBA Journey', 'senin', '09:00', 'Lucu'),
('MBA Journey', 'senin', '12:00', 'Serius'),
('MBA Journey', 'senin', '15:00', 'Horror'),
('MBA Journey', 'senin', '18:00', 'Lucu'),
('MBA Journey', 'selasa', '06:00', 'Lucu'),
('MBA Journey', 'selasa', '09:00', 'Serius'),
('MBA Journey', 'selasa', '12:00', 'Horror'),
('MBA Journey', 'selasa', '15:00', 'Serius'),
('MBA Journey', 'selasa', '18:00', 'Lucu'),
('MBA Journey', 'rabu', '06:00', 'Serius'),
('MBA Journey', 'rabu', '09:00', 'Lucu'),
('MBA Journey', 'rabu', '12:00', 'Serius'),
('MBA Journey', 'rabu', '15:00', 'Horror'),
('MBA Journey', 'rabu', '18:00', 'Lucu'),
('MBA Journey', 'kamis', '06:00', 'Horror'),
('MBA Journey', 'kamis', '09:00', 'Serius'),
('MBA Journey', 'kamis', '12:00', 'Lucu'),
('MBA Journey', 'kamis', '15:00', 'Serius'),
('MBA Journey', 'kamis', '18:00', 'Horror'),
('MBA Journey', 'jumat', '06:00', 'Lucu'),
('MBA Journey', 'jumat', '09:00', 'Horror'),
('MBA Journey', 'jumat', '12:00', 'Serius'),
('MBA Journey', 'jumat', '15:00', 'Lucu'),
('MBA Journey', 'jumat', '18:00', 'Serius'),
('MBA Journey', 'sabtu', '06:00', 'Serius'),
('MBA Journey', 'sabtu', '09:00', 'Lucu'),
('MBA Journey', 'sabtu', '12:00', 'Q&A'),
('MBA Journey', 'sabtu', '15:00', 'Rekap'),
('MBA Journey', 'sabtu', '18:00', 'Horror'),
('MBA Journey', 'minggu', '06:00', 'Rekap'),
('MBA Journey', 'minggu', '09:00', 'Horror'),
('MBA Journey', 'minggu', '12:00', 'Lucu'),
('MBA Journey', 'minggu', '15:00', 'Serius'),
('MBA Journey', 'minggu', '18:00', 'Lucu'),
-- AI Business
('AI Business', 'senin', '06:00', 'Serius'),
('AI Business', 'senin', '09:00', 'Lucu'),
('AI Business', 'senin', '12:00', 'Serius'),
('AI Business', 'senin', '15:00', 'Horror'),
('AI Business', 'senin', '18:00', 'Lucu'),
('AI Business', 'selasa', '06:00', 'Lucu'),
('AI Business', 'selasa', '09:00', 'Serius'),
('AI Business', 'selasa', '12:00', 'Horror'),
('AI Business', 'selasa', '15:00', 'Serius'),
('AI Business', 'selasa', '18:00', 'Lucu'),
('AI Business', 'rabu', '06:00', 'Serius'),
('AI Business', 'rabu', '09:00', 'Lucu'),
('AI Business', 'rabu', '12:00', 'Serius'),
('AI Business', 'rabu', '15:00', 'Horror'),
('AI Business', 'rabu', '18:00', 'Lucu'),
('AI Business', 'kamis', '06:00', 'Horror'),
('AI Business', 'kamis', '09:00', 'Serius'),
('AI Business', 'kamis', '12:00', 'Lucu'),
('AI Business', 'kamis', '15:00', 'Serius'),
('AI Business', 'kamis', '18:00', 'Horror'),
('AI Business', 'jumat', '06:00', 'Lucu'),
('AI Business', 'jumat', '09:00', 'Horror'),
('AI Business', 'jumat', '12:00', 'Serius'),
('AI Business', 'jumat', '15:00', 'Lucu'),
('AI Business', 'jumat', '18:00', 'Serius'),
('AI Business', 'sabtu', '06:00', 'Serius'),
('AI Business', 'sabtu', '09:00', 'Lucu'),
('AI Business', 'sabtu', '12:00', 'Q&A'),
('AI Business', 'sabtu', '15:00', 'Rekap'),
('AI Business', 'sabtu', '18:00', 'Horror'),
('AI Business', 'minggu', '06:00', 'Rekap'),
('AI Business', 'minggu', '09:00', 'Horror'),
('AI Business', 'minggu', '12:00', 'Lucu'),
('AI Business', 'minggu', '15:00', 'Serius'),
('AI Business', 'minggu', '18:00', 'Lucu'),
-- Build in Public
('Build in Public', 'senin', '06:00', 'Serius'),
('Build in Public', 'senin', '09:00', 'Lucu'),
('Build in Public', 'senin', '12:00', 'Serius'),
('Build in Public', 'senin', '15:00', 'Horror'),
('Build in Public', 'senin', '18:00', 'Lucu'),
('Build in Public', 'selasa', '06:00', 'Lucu'),
('Build in Public', 'selasa', '09:00', 'Serius'),
('Build in Public', 'selasa', '12:00', 'Horror'),
('Build in Public', 'selasa', '15:00', 'Serius'),
('Build in Public', 'selasa', '18:00', 'Lucu'),
('Build in Public', 'rabu', '06:00', 'Serius'),
('Build in Public', 'rabu', '09:00', 'Lucu'),
('Build in Public', 'rabu', '12:00', 'Serius'),
('Build in Public', 'rabu', '15:00', 'Horror'),
('Build in Public', 'rabu', '18:00', 'Lucu'),
('Build in Public', 'kamis', '06:00', 'Horror'),
('Build in Public', 'kamis', '09:00', 'Serius'),
('Build in Public', 'kamis', '12:00', 'Lucu'),
('Build in Public', 'kamis', '15:00', 'Serius'),
('Build in Public', 'kamis', '18:00', 'Horror'),
('Build in Public', 'jumat', '06:00', 'Lucu'),
('Build in Public', 'jumat', '09:00', 'Horror'),
('Build in Public', 'jumat', '12:00', 'Serius'),
('Build in Public', 'jumat', '15:00', 'Lucu'),
('Build in Public', 'jumat', '18:00', 'Serius'),
('Build in Public', 'sabtu', '06:00', 'Serius'),
('Build in Public', 'sabtu', '09:00', 'Lucu'),
('Build in Public', 'sabtu', '12:00', 'Q&A'),
('Build in Public', 'sabtu', '15:00', 'Rekap'),
('Build in Public', 'sabtu', '18:00', 'Horror'),
('Build in Public', 'minggu', '06:00', 'Rekap'),
('Build in Public', 'minggu', '09:00', 'Horror'),
('Build in Public', 'minggu', '12:00', 'Lucu'),
('Build in Public', 'minggu', '15:00', 'Serius'),
('Build in Public', 'minggu', '18:00', 'Lucu')
ON CONFLICT DO NOTHING;

-- =============================================
-- SEED DATA: Persona (placeholder — GANTI dari production asli kalau perlu)
-- =============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.persona_pillar LIMIT 1) THEN
    INSERT INTO public.persona_pillar (pillar_name, persona_text, tone_rules, style_examples) VALUES
    ('Entrepreneurship', 'Founder building an AI Company. Documenting the journey of entrepreneurship.', 'Santai, jujur, seperti diary founder. Gunakan kata "saya."', '[Serius] "Baru sadar, bikin company itu bukan soal tech-nya."'),
    ('Personal Reflection', 'Personal reflection on life, work, and the journey of building.', 'Reflektif, personal, jujur. Gunakan kata "saya."', '[Serius] "Malam ini saya duduk di office sendirian."'),
    ('MBA Journey', 'MBA student at SEMBA UGM. Documenting the academic and personal journey.', 'Akademis tapi personal. Gunakan kata "saya."', '[Serius] "Kuliah MBA itu bukan cuma soal gelar."'),
    ('AI Business', 'Building an AI Creative Company. Sharing insights about AI adoption in Indonesia.', 'Praktis, data-driven, tapi tetap personal. Gunakan kata "saya."', '[Serius] "AI itu bukan soal teknologi, tapi soal adoption."'),
    ('Build in Public', 'Building in public — sharing the raw, unfiltered journey of building a company.', 'Transparan, vulnerabilitas, jujur. Gunakan kata "saya."', '[Serius] "Hari ini saya gagal. Dan saya mau cerita soal itu."');
  END IF;
END $$;
