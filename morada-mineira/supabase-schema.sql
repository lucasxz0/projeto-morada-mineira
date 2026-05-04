-- ============================================================
-- SCHEMA SUPABASE — MORADA MINEIRA
-- Versão: 2.0 — Profissional com Auth real
-- ============================================================

-- ============================================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role      AS ENUM ('gerente', 'funcionario');
  CREATE TYPE task_status    AS ENUM ('pendente','em_andamento','aguardando_evidencia','concluida','rejeitada','cancelada');
  CREATE TYPE task_priority  AS ENUM ('baixa','media','alta','urgente');
  CREATE TYPE task_recurrence AS ENUM ('unica','diaria','semanal','quinzenal','mensal');
  CREATE TYPE evidence_status AS ENUM ('pendente','aprovada','rejeitada');
  CREATE TYPE shift_label    AS ENUM ('manha','tarde','noite','integral');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABELA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'funcionario',
  avatar_emoji  TEXT        NOT NULL DEFAULT '👷',
  avatar_url    TEXT,
  shift         shift_label NOT NULL DEFAULT 'integral',
  phone         TEXT,
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role   ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);

-- ============================================================
-- TABELA: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT          NOT NULL,
  description       TEXT,
  instructions      TEXT,
  tips              TEXT[],
  category          TEXT          NOT NULL DEFAULT 'geral',
  priority          task_priority NOT NULL DEFAULT 'media',
  status            task_status   NOT NULL DEFAULT 'pendente',
  recurrence        task_recurrence NOT NULL DEFAULT 'unica',
  shift             shift_label,
  requires_evidence BOOLEAN       NOT NULL DEFAULT true,
  evidence_count    INT           NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  assigned_to       UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by        UUID          NOT NULL REFERENCES public.profiles(id),
  due_date          DATE,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  due_time          TIME,
  parent_task_id    UUID          REFERENCES public.tasks(id) ON DELETE SET NULL,
  next_due_date     DATE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status      ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category    ON public.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority    ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by  ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date    ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_shift       ON public.tasks(shift);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence  ON public.tasks(recurrence);

-- ============================================================
-- TABELA: evidences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidences (
  id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id           UUID            NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  image_url         TEXT            NOT NULL,
  storage_path      TEXT            NOT NULL,
  thumbnail_url     TEXT,
  description       TEXT,
  captured_by       UUID            NOT NULL REFERENCES public.profiles(id),
  captured_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  status            evidence_status NOT NULL DEFAULT 'pendente',
  reviewed_by       UUID            REFERENCES public.profiles(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidences_task_id     ON public.evidences(task_id);
CREATE INDEX IF NOT EXISTS idx_evidences_status      ON public.evidences(status);
CREATE INDEX IF NOT EXISTS idx_evidences_captured_by ON public.evidences(captured_by);
CREATE INDEX IF NOT EXISTS idx_evidences_captured_at ON public.evidences(captured_at DESC);

-- ============================================================
-- TABELA: task_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES public.profiles(id),
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

-- ============================================================
-- TABELA: activity_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          BIGSERIAL   PRIMARY KEY,
  actor_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name  TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor    ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action   ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity   ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_time     ON public.activity_logs(created_at DESC);

-- ============================================================
-- TABELA: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  body        TEXT,
  type        TEXT        NOT NULL DEFAULT 'info',
  read        BOOLEAN     NOT NULL DEFAULT false,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read) WHERE read = false;

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.tasks_with_users AS
SELECT
  t.*,
  a.name  AS assigned_to_name,
  a.avatar_emoji AS assigned_to_avatar,
  c.name  AS created_by_name
FROM public.tasks t
LEFT JOIN public.profiles a ON a.id = t.assigned_to
LEFT JOIN public.profiles c ON c.id = t.created_by;

CREATE OR REPLACE VIEW public.pending_evidences AS
SELECT
  e.*,
  p.name          AS captured_by_name,
  p.avatar_emoji  AS captured_by_avatar,
  t.title         AS task_title,
  t.category      AS task_category
FROM public.evidences e
JOIN public.profiles p ON p.id = e.captured_by
JOIN public.tasks    t ON t.id = e.task_id
WHERE e.status = 'pendente'
ORDER BY e.captured_at DESC;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_role_value user_role;
BEGIN
  BEGIN
    user_role_value := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN others THEN
    user_role_value := 'funcionario';
  END;
  INSERT INTO public.profiles (id, name, role, avatar_emoji)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(user_role_value, 'funcionario'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_emoji', '👷')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_profile_on_signup ON auth.users;
CREATE TRIGGER trg_create_profile_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
