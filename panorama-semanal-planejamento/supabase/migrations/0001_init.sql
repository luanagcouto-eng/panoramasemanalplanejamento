-- Panorama Semanal — Planejamento
-- Migration 0001: schema inicial (tenants, profiles, reports, indicators, audit_logs)
-- Fonte da verdade: project_master_prompt_panorama_semanal_planejamento.md

-- ─────────────────────────────────────────────────────────────────
-- 1. tenants — Multi-tenancy (isolamento por organização)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  pwa_url       TEXT NOT NULL,        -- https://<tenant>.sharepoint.com/sites/<pwa>
  entra_tenant  TEXT NOT NULL,        -- Azure AD tenant ID
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────
-- 2. profiles — Extensão do auth.users
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  email         TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'planner', 'viewer')),
  avatar_url    TEXT,
  tenant_id     UUID REFERENCES tenants(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins see all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- tenants: policy depende de profiles, criada após a tabela existir
CREATE POLICY "Users see own tenant" ON tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────
-- 3. reports — Panoramas semanais salvos
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  created_by    UUID NOT NULL REFERENCES profiles(id),
  title         TEXT NOT NULL,
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  snapshot      JSONB NOT NULL,       -- snapshot dos indicadores no momento da geração
  printed_at    TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,          -- soft delete
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners manage reports" ON reports
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'planner'))
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 4. indicators — Definição dos KPIs/indicadores configuráveis
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE indicators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  description   TEXT,
  formula       TEXT NOT NULL,        -- ex: "completed_tasks / total_tasks * 100"
  entity_source TEXT NOT NULL,        -- entidade OData de origem: 'Tasks', 'Projects'...
  column_map    JSONB NOT NULL,        -- mapeamento de colunas OData → variáveis da fórmula
  display_type  TEXT DEFAULT 'number' CHECK (display_type IN ('number', 'percent', 'bar', 'badge')),
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on indicators" ON indicators
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────
-- 5. audit_logs — Observabilidade e rastreabilidade
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id),
  user_id       UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,        -- 'report.create', 'cache.refresh', 'login', etc.
  resource_type TEXT,
  resource_id   UUID,
  metadata      JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sem RLS de escrita (inserção via service_role apenas)
-- Admins podem ler
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────
-- Funções auxiliares
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_reports_tenant_id ON reports(tenant_id);
CREATE INDEX idx_reports_week_start ON reports(week_start);
CREATE INDEX idx_indicators_tenant_id ON indicators(tenant_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
