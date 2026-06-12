-- Allowlist de e-mails autorizados a fazer login (decisao #9: login via Google).
-- Diferente do Entra ID (tenant corporativo), contas Google nao sao
-- automaticamente restritas a Estaleiro Maua, entao o acesso e controlado
-- por esta tabela: so e-mails aqui cadastrados conseguem autenticar
-- (verificado no callback signIn do NextAuth antes do sync com auth.users).

CREATE TABLE allowed_emails (
  email      TEXT PRIMARY KEY,
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'planner', 'viewer')),
  tenant_id  UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar a allowlist; sem policy de leitura publica
-- (a verificacao no login usa o client service_role, que ignora RLS).
CREATE POLICY "Admins manage allowed_emails" ON allowed_emails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
