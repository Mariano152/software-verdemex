CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NULL REFERENCES public.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  username VARCHAR(120),
  user_name VARCHAR(255),
  module VARCHAR(60) NOT NULL,
  action VARCHAR(30) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(150),
  title VARCHAR(500),
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

UPDATE public.users
SET permissions = CASE
  WHEN permissions ? 'notifications.view' THEN permissions
  ELSE permissions || '["notifications.view"]'::jsonb
END
WHERE role = 'admin';
