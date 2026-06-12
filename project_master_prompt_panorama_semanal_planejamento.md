# PROJECT MASTER PROMPT — PWA Planning Dashboard
> Metodologia: SDD (Spec-Driven Development) + GSD (Get Shit Done)
> Última atualização: 2025-06-11 (rev.3)
> Status: FASE 0 — Especificação

---

## 🧭 INSTRUÇÕES PARA O AGENTE

Você é um engenheiro de software sênior especializado em Next.js 15, Supabase e integrações Microsoft.
**A cada interação, atualize o changelog no final deste arquivo antes de qualquer resposta.**
Siga estritamente a metodologia abaixo:

### Regras de operação
1. **SDD primeiro**: nenhuma linha de código antes da spec estar aprovada na fase atual
2. **GSD na execução**: entregáveis verificáveis a cada fase — sem dependências bloqueantes
3. **Este arquivo é a fonte da verdade**: toda decisão de arquitetura, schema e componente é registrada aqui
4. **Antes de cada fase**: leia o changelog e o contexto acumulado
5. **Design System**: todos os componentes UI devem seguir os tokens e padrões da seção `🎨 DESIGN SYSTEM` deste documento — nenhum valor hardcoded fora do mapeamento definido
6. **Checklist gate**: antes de avançar de fase, executar os itens do `📋 CHECKLIST DE IMPLEMENTAÇÃO` correspondentes — fase só fecha com 0 FAILs críticos
7. **Pré-deploy obrigatório**: executar o `🔍 CODE REVIEW PRÉ-BUILD` completo antes de qualquer deploy em produção
8. **Git commit obrigatório**: ao final de cada entregável verificável, realizar commit no repositório `https://github.com/luanagcouto-eng/panoramasemanalplanejamento.git` seguindo o padrão abaixo

### Convenção de commits (Conventional Commits)

```
<type>(<scope>): <descrição curta em português>

[body opcional — contexto técnico]
[BREAKING CHANGE: se houver]
```

| Type | Quando usar |
|---|---|
| `feat` | nova funcionalidade |
| `fix` | correção de bug |
| `chore` | config, deps, scaffolding |
| `docs` | atualização deste `.md` ou README |
| `style` | ajustes de UI/CSS sem lógica |
| `refactor` | reestruturação sem mudança de comportamento |
| `test` | adição/ajuste de testes |
| `ci` | pipeline, GitHub Actions |

**Scopes válidos:** `auth`, `odata`, `indicators`, `reports`, `print`, `db`, `ui`, `observability`, `config`

**Exemplos:**
```bash
git commit -m "chore(config): scaffolding inicial Next.js 15 + Tailwind v4"
git commit -m "feat(auth): login Microsoft Entra ID com NextAuth v5"
git commit -m "feat(odata): cliente tipado para endpoint ProjectData REST"
git commit -m "feat(indicators): engine de cálculo de KPIs semanais"
git commit -m "feat(print): layout A4 panorama semanal @media print"
git commit -m "docs: atualiza PROJECT_MASTER_PROMPT fase 1 concluída"
```

**Frequência mínima de commit:**
- Ao concluir cada item `[ ]` de uma fase
- Ao fechar uma fase inteira (commit de fechamento com tag: `git tag fase-N-complete`)
- Ao atualizar este `PROJECT_MASTER_PROMPT.md`
- **Nunca acumular mais de 1 entregável por commit**

**Repositório:** `https://github.com/luanagcouto-eng/panoramasemanalplanejamento.git`
**Branch padrão:** `main`
**Branch de desenvolvimento:** `dev` → PRs para `main` ao fechar fase

---



| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 15 (App Router) | RSC + Server Actions reduzem round-trips |
| Estilo | Tailwind CSS v4 + `@base-ui/react` + `cva` | Primitives headless, variantes tipadas, tokens via `@theme` |
| Banco | Supabase (PostgreSQL + RLS) | Row Level Security por role sem lógica extra no front |
| Hospedagem | Vercel | Edge Middleware para auth, deploy contínuo |
| Auth | NextAuth.js v5 + Google + allowlist `allowed_emails` (decisão #9) | Login simples, sem dependência do consentimento de admin do tenant Entra ID |
| OData Auth | Microsoft Entra ID app-only (client credentials), credencial separada do login (Fase 2) | Acesso ao PWA independe de qual provedor o usuário usa para logar |
| Observabilidade | Vercel Analytics + Sentry + Supabase Logs | Cobertura full-stack |
| OData Client | fetch nativo via Server Component / Server Action | RSC já roda no servidor — sem CORS, token do Entra ID injetado diretamente |
| Cache OData | Next.js `fetch` com `revalidate` (ISR) | Cache em memória na Edge — sem banco, sem latência extra |
| Impressão | CSS `@media print` + Tailwind `print:` | Panorama A4 — padrão já implementado no design system |
| Ícones | `lucide-react` | Consistente com design system existente |
| Utilitários | `clsx` + `tailwind-merge` via `cn()` | Merge seguro de classes Tailwind |

---

## 📐 SCHEMA DO BANCO DE DADOS (Supabase / PostgreSQL)

> Status: APROVADO PARA IMPLEMENTAÇÃO

### Princípios
- RLS habilitado em todas as tabelas
- `user_id` referencia `auth.users` do Supabase (via NextAuth session sync)
- Dados do SharePoint OData são consumidos **em tempo real via Server Components** — nunca persistidos no banco
- Cache de OData gerenciado pelo Next.js ISR (`revalidate`) na camada de fetch — zero infra extra
- Supabase persiste apenas: perfis, configurações de indicadores, snapshots de relatórios e logs de auditoria
- Soft delete com `deleted_at` nas tabelas críticas

---

### 1. `profiles` — Extensão do auth.users

```sql
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

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins see all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

### 2. `tenants` — Multi-tenancy (isolamento por organização)

```sql
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  pwa_url       TEXT NOT NULL,        -- https://<tenant>.sharepoint.com/sites/<pwa>
  entra_tenant  TEXT NOT NULL,        -- Azure AD tenant ID
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tenant" ON tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
```

---

### 3. `reports` — Panoramas semanais salvos

```sql
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
```

---

### 4. `indicators` — Definição dos KPIs/indicadores configuráveis

```sql
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
```

---

### 5. `audit_logs` — Observabilidade e rastreabilidade

```sql
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
```

---

### Funções auxiliares

```sql
-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 🗺️ ARQUITETURA DE FASES (GSD)

### FASE 0 — Especificação ✅ EM CURSO
**Entregável verificável:** este documento aprovado + schema revisado

### FASE 1 — Auth + Scaffolding
**Entregável verificável:** login funcional, sessão persistida, redirect por role
- [x] Registro do App no Azure Portal — App Registration criado, credenciais (`AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_SECRET` / `AZURE_AD_TENANT_ID`) fornecidas e configuradas em `.env.local`. Reaproveitado como credencial app-only da Fase 2 (decisão #9)
- [x] ~~NextAuth v5 + Entra ID provider~~ — substituído por **Google** (decisão #9): `auth.ts` + `app/api/auth/[...nextauth]/route.ts`
- [x] Supabase: criar tabelas `tenants` e `profiles` — migration `supabase/migrations/0001_init.sql` aplicada no projeto real `PanoramaSemanalPlanejamento` (`evcewpfizfbwcpnwahmt`, us-west-2); schema das 5 tabelas confirmado via MCP `list_tables`. Aviso de segurança `function_search_path_mutable` corrigido (`supabase/migrations/0002_fix_search_path.sql`), `get_advisors` sem lints pendentes
- [x] Middleware de autenticação no Vercel Edge — `middleware.ts` protege `(authenticated)` e redireciona `/login` ↔ `/panorama` conforme sessão
- [x] Página de login (aguarda design system) — `/login` com `LoginCard` (client) chamando `signIn("google")`

- [x] Sync NextAuth → `auth.users`/`profiles` do Supabase — resolvido pela decisão arquitetural #8: `lib/supabase/sync-user.ts` (`supabase.auth.admin.createUser` + upsert em `profiles` no primeiro login) + `lib/supabase/jwt.ts` (assina token `authenticated` com `SUPABASE_JWT_SECRET`, `sub = profiles.id`) usado por `lib/supabase/server.ts` para que `auth.uid()` funcione nas policies de RLS. `SUPABASE_JWT_SECRET` configurado e validado end-to-end.
- [x] **Decisão #9** — login Microsoft trocado por Google + allowlist `allowed_emails` (migration `0003_allowed_emails.sql`, `lib/supabase/check-allowlist.ts`). `auth.ts` callback `signIn` nega login se e-mail não estiver na allowlist; `jwt` usa a `role` da allowlist no sync. Allowlist: `luanagcouto@gmail.com` e `luana.couto@estaleiromaua.ind.br` como `admin`. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` configurados (OAuth Client `855151171262-...`); redirect URI `http://localhost:3000/api/auth/callback/google` cadastrado no Google Cloud Console.

**Status:** login Google + allowlist + sync Supabase testado end-to-end com sucesso (`luana.couto@estaleiromaua.ind.br`, role `admin`, `profiles` populado). Gate de Segurança da Fase 1 fechado.

### FASE 2 — Integração OData (PWA / SharePoint)
**Entregável verificável:** Server Component exibindo dados reais do PWA em tela
- [ ] App Registration Entra ID com permissões de **aplicação** (Application permissions, ex. `Sites.Read.All` ou equivalente do Project Online) + admin consent — credencial **app-only** (client credentials flow), independente do login do usuário (decisão #9)
- [ ] `lib/odata.ts` — cliente tipado para o endpoint OData REST, autentica via client credentials (`AZURE_AD_CLIENT_ID`/`SECRET`/`TENANT_ID`)
- [ ] `fetch` com `next: { revalidate: 900 }` (ISR 15min) por entidade
- [ ] Endpoint `GET /api/odata/$metadata` → introspect das entidades disponíveis
- [ ] Tratamento de erro + retry com exponential backoff

### FASE 3 — Engine de Indicadores
**Entregável verificável:** indicadores calculados e exibidos em tela
- [ ] Tabela `indicators` populada com KPIs base do planejamento
- [ ] Server Action para calcular indicadores a partir dos dados OData em tempo real
- [ ] Componentes de visualização (aguarda design system)

### FASE 4 — Panorama Semanal + Impressão A4
**Entregável verificável:** página imprimível conforme layout A4
- [ ] Layout de impressão CSS (`@media print`)
- [ ] Composição do panorama com indicadores da semana
- [ ] Server Action `saveReport` → persiste snapshot em `reports`
- [ ] Integração com design system definitivo

### FASE 5 — Observabilidade + Produção
**Entregável verificável:** erros capturados, logs de auditoria funcionando
- [ ] Sentry integrado (client + server)
- [ ] Vercel Analytics ativo
- [ ] `audit_logs` alimentado por Server Actions críticas

---

## 🔧 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# NextAuth / Google (decisao #9)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Microsoft Entra ID — app-only (client credentials) para OData/PWA (Fase 2)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Sentry (Observabilidade)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# SharePoint / PWA
SHAREPOINT_PWA_BASE_URL=    # https://<tenant>.sharepoint.com/sites/<pwa>
```

---

## 📋 DECISÕES ARQUITETURAIS REGISTRADAS

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| 1 | NextAuth v5 + Entra ID | MSAL direto | NextAuth abstrai refresh token e integra com Supabase |
| 2 | Server Components consomem OData diretamente | Route Handler proxy | RSC já roda no servidor — sem CORS, sem round-trip extra |
| 3 | Next.js ISR `revalidate` para cache OData | `odata_cache` no Supabase | Cache na Edge, zero infra, sem complexidade de RLS em dados transitórios |
| 4 | `@media print` CSS | @react-pdf/renderer | Sem dependência, mais fácil de manter com Tailwind |
| 5 | JSONB para `snapshot` e `column_map` | Tabelas relacionais | Flexibilidade — estrutura OData varia por tenant |
| 7 | `@base-ui/react` + `cva` em vez de shadcn/ui | shadcn/ui | Design System existente já usa @base-ui — consistência com metas-maua |
| 8 | Sync NextAuth → `auth.users`/`profiles` via `supabase.auth.admin.createUser` no primeiro login + JWT `authenticated` assinado com `SUPABASE_JWT_SECRET` (`sub = profiles.id`) | Trocar FK `profiles.id` por `TEXT` com `sub` do Entra ID + claims customizadas | Preserva `profiles.id → auth.users(id)`, mantém RLS nativo via `auth.uid()`, evita reescrever policies e infra própria de tokens |
| 9 | Login via **Google** (NextAuth) + allowlist `allowed_emails` (tabela Supabase, `signIn` callback nega login se e-mail não cadastrado); acesso ao PWA na Fase 2 via credencial Entra ID **app-only** (client credentials), independente do login | Manter Microsoft Entra ID como login (decisão #1) | Login Microsoft ficou bloqueado por política de consentimento de administrador do tenant (AADSTS — "Need admin approval"), mesmo após consentimento geral concedido e remoção do escopo `User.Read`/Graph — causa raiz na política "Do not allow user consent" do tenant, fora do controle da aplicação. Google evita essa dependência; allowlist substitui a restrição automática por domínio corporativo que o Entra ID oferecia. Acesso ao PWA (Fase 2) não depende de qual provedor o usuário usa para logar — sempre exigiria consentimento de admin para permissões de aplicação (Application permissions), então uma credencial app-only dedicada é necessária de qualquer forma |

---

## 🎨 DESIGN SYSTEM

> Status: **ATIVO** — fonte: `DESIGN_SYSTEM.md` (Metas Mauá 2026)
> Toda implementação de UI deve seguir estes tokens. Nenhum valor de cor, fonte ou espaçamento hardcoded fora deste mapeamento.

### Stack de UI
- **Tailwind CSS v4** — tokens via `@theme` em `app/globals.css`
- **`@base-ui/react`** — primitives não estilizados (Button, Input, Select, Dialog, Sheet…)
- **`cva` (class-variance-authority)** — variantes de componentes
- **`cn()`** — `twMerge(clsx(...))` em `lib/utils.ts`
- **`lucide-react`** — ícones (`w-4 h-4` / `w-5 h-5`, sempre `aria-hidden`)
- **Fonte**: Inter via `next/font/google`, aplicada globalmente (`font-sans`)

---

### Tokens de cor (`app/globals.css` via `@theme`)

#### Primitivos de marca
| Token | Valor | Uso |
|---|---|---|
| `--color-maua-navy` | `#364B59` | Primária — sidebar, títulos, botões |
| `--color-maua-orange` | `#F18213` | Destaque — CTAs, badges ativos, anel de foco |
| `--color-maua-white` | `#FFFFFF` | Fundo de cards |
| `--color-maua-gray-50` | `#E7EAEE` | Fundo de páginas autenticadas |
| `--color-maua-gray-100` | `#F1F3F5` | Hover sutil |
| `--color-maua-gray-200` | `#E2E8F0` | Bordas |
| `--color-maua-gray-400` | `#94A3B8` | Texto secundário em fundo escuro |
| `--color-maua-gray-500` | `#6B7280` | `muted-foreground` |
| `--color-maua-gray-900` | `#111827` | Texto principal |

#### Tokens semânticos
| Token | Valor |
|---|---|
| `--color-primary` | navy `#364B59` |
| `--color-accent` | orange `#F18213` |
| `--color-background` | `#FFFFFF` |
| `--color-surface` | `#E7EAEE` (fundo páginas autenticadas) |
| `--color-border` | `#E2E8F0` |
| `--color-text` | `#111827` |
| `--ring` | `#F18213` (foco de inputs/selects/botões) |

#### Gamificação de progresso
| Faixa | Cor | Token |
|---|---|---|
| 0–32% | `#DFA1AA` (vermelho) | `--color-goal-low` |
| 33–65% | `#F9E79F` (amarelo) | `--color-goal-mid` |
| 66–100% | `#9AD595` (verde) | `--color-goal-high` |

Helpers obrigatórios em `lib/utils.ts`:
- `goalColor(pct)` → cor CSS para `style={{ backgroundColor }}`
- `goalTextClass(pct)` → classes Tailwind para badges

#### Status de Avaliação Técnica
| Status | Condição | Classes |
|---|---|---|
| PENDENTE | sem lançamento | `bg-slate-100 text-slate-500` |
| EM CONFORMIDADE | pct ≥ 90% | `bg-emerald-50 text-emerald-700` |
| EM ANDAMENTO | pct ≥ 60% | `bg-orange-50 text-[#F18213]` |
| EM RISCO | pct < 60% | `bg-red-50 text-red-600` |

#### Sidebar (tema escuro)
- Fundo: `#364B59` · Hover/sub-seção: `#2D3F4A`
- Item ativo: `bg-[#F18213] text-white`
- Texto inativo: `#C8D5DC` · Labels: `#94A3B8`

---

### Tipografia
| Uso | Classes |
|---|---|
| Título de página | `text-2xl font-bold text-[#364B59]` |
| Header de seção | `text-base font-semibold text-[#364B59]` |
| Cabeçalho de coluna | `text-[10px] font-bold uppercase tracking-wider text-[#364B59]/70` |
| Texto padrão | `text-sm` |
| Texto auxiliar | `text-xs text-muted-foreground` |
| Microtexto (badges) | `text-[9px]` a `text-[11px]` |

---

### Espaçamento, raio e sombra
| Token | Valor |
|---|---|
| `--radius-sm` | `0.25rem` |
| `--radius-md` | `0.5rem` |
| `--radius-lg` | `0.75rem` |
| `--radius-xl` | `1rem` |

- Cards: `rounded-xl border border-border bg-white shadow-sm`
- Fundo páginas autenticadas: `bg-surface`

---

### Padrões de componente obrigatórios

#### Header bar de seção
```tsx
<div className="px-6 py-3 bg-[#364B59]/20">
  <h3 className="flex items-center gap-2 text-base font-semibold text-[#364B59]">
    <Icon className="w-5 h-5" aria-hidden />
    Título da seção
  </h3>
</div>
```

#### Botão primário (laranja — CTA)
```tsx
className="text-xs font-bold bg-[#F18213] hover:bg-[#D9730D] text-white px-4 py-2 rounded-lg transition-colors"
```

#### Botão primário (navy)
```tsx
className="bg-[#364B59] hover:bg-[#2D3F4A] text-white text-sm"
```

#### Inputs e Selects
```tsx
// h-8 text-sm bg-white sobrescreve bg-transparent do base
className="h-8 text-sm bg-white"  // via cn() para merge correto
// Foco: anel laranja herdado automaticamente via --ring
```

#### Badge de status/período
```tsx
className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full {bg} {text}"
// cor via goalTextClass(pct) ou mapa fixo de status
```

#### Card de organograma
```tsx
className="rounded-xl border bg-white p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5"
// Selecionado: ring-2 ring-[#F18213] ring-offset-2
// Barra de progresso: style={{ backgroundColor: goalColor(pct) }}
```

---

### Impressão A4 (`@media print`)
- Orientação: paisagem
- Ocultar: `aside`, `.no-print`
- Cabeçalho/rodapé fixos: `.print-page-header` / `.print-page-footer`
- Títulos e regras em navy: `.print-rule`, `.print-system-name` → `#364B59`

---

### Utilitários `lib/utils.ts` (obrigatórios)
| Função | Retorno |
|---|---|
| `cn(...)` | `twMerge(clsx(...))` |
| `goalColor(pct)` | cor CSS (string) para barras |
| `goalTextClass(pct)` | classes Tailwind para badges |
| `calcProgress(current, target, operator?)` | % atingimento |
| `formatGoalValue(value, unit)` | formata `R$`, `%`, outros |
| `OP_SYMBOL` | mapeia operador para símbolo (`≥`, `≤`…) |

---

## 📦 ENTIDADES ODATA MAPEADAS

> Status: A confirmar com `$metadata` real do tenant

| Entidade | Colunas relevantes esperadas | Uso nos indicadores |
|---|---|---|
| Projects | ProjectId, ProjectName, ProjectStartDate, ProjectFinishDate, ProjectWork, ProjectCost | Visão geral do portfólio |
| Tasks | TaskId, TaskName, ProjectId, TaskStartDate, TaskFinishDate, TaskPercentCompleted, TaskWork | % conclusão, atraso |
| Resources | ResourceId, ResourceName, ResourceType, ResourceCapacity | Capacidade da equipe |
| Assignments | AssignmentId, TaskId, ResourceId, AssignmentWork, AssignmentActualWork | Alocação real vs planejado |
| TimeSheetLines | PeriodId, ResourceId, ActualWork | Horas registradas na semana |

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO (gate por fase)

> O agente deve executar os itens abaixo como **gate obrigatório** antes de fechar cada fase.
> Fase só avança com 0 itens FAIL críticos.

### Testes Automatizados _(gate Fase 3+)_
- [ ] Jest + React Testing Library configurados
- [ ] Testes unitários para componentes e hooks críticos
- [ ] Testes de integração para Server Actions e Route Handlers
- [ ] Playwright configurado para E2E (fluxo login → visualizar panorama → imprimir)
- [ ] CI/CD rodando testes automaticamente no PR
- [ ] Cobertura de código com relatório

### Segurança _(gate Fase 1+)_
- [ ] Zod validando schemas em todas as Server Actions e Route Handlers
- [ ] Rate limiting no middleware (login, reset, OData proxy)
- [ ] Dependabot configurado para auditorias de segurança
- [ ] Nenhuma credencial hardcoded — tudo em variáveis de ambiente
- [ ] RLS testado por role (admin / planner / viewer)
- [ ] CORS restrito — sem `Access-Control-Allow-Origin: *` em produção

### Observabilidade _(gate Fase 5)_
- [ ] Sentry capturando erros client + server com DSN separados
- [ ] Logs estruturados JSON (`timestamp`, `level`, `service`, `traceId`)
- [ ] Vercel Analytics ativo
- [ ] Health check em `/api/health` (banco + OData connectivity)
- [ ] Alertas configurados para erros críticos
- [ ] `audit_logs` registrando: login, geração de relatório, refresh OData

### Escalabilidade _(gate Fase 5)_
- [ ] Aplicação stateless (sem estado em memória local)
- [ ] Connection pooler do Supabase configurado
- [ ] Graceful shutdown implementado

---

## 🔍 CODE REVIEW PRÉ-BUILD

> **Execução obrigatória antes de qualquer deploy em produção.**
> Cole o prompt abaixo na IA com acesso ao repositório. Substitua os campos `[ ]`.

```
Você é um engenheiro de software sênior realizando um code review pré-build completo.
Você tem acesso ao código-fonte deste projeto. Analise o repositório e audite cada item abaixo.

## REGRAS DE OUTPUT
Para cada item auditado, retorne EXATAMENTE neste formato:
✅ PASS   — [item] — [evidência direta no código, ex: arquivo:linha]
❌ FAIL   — [item] — [problema encontrado + arquivo:linha se aplicável]
⚠️ WARN   — [item] — [implementado parcialmente ou não verificável estaticamente]
➖ N/A    — [item] — [não se aplica a esta stack/projeto]

Ao final, gere:
1. RESUMO com contagem: PASS / FAIL / WARN / N/A
2. PRIORIDADE DE CORREÇÃO: FAILs ordenados por severidade (Critical > High > Medium > Low)
3. PLANO DE AÇÃO: para cada FAIL crítico/high, correção mínima com exemplo de código

## CONTEXTO DO PROJETO
- Stack: Next.js 15 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS v4, @base-ui/react
- Ambiente alvo: produção na Vercel + Supabase Cloud
- Autenticação: NextAuth.js v5 + Microsoft Entra ID (OAuth2 Delegated)
- Banco: PostgreSQL via Supabase (RLS ativo em todas as tabelas)
- Deploy: Vercel com CI/CD via GitHub Actions
- OData: consumo direto do SharePoint PWA via Server Components (fetch server-side com ISR revalidate=900)
- Impressão: @media print CSS para panorama semanal A4

## CHECKLIST DE AUDITORIA

### 1. FRONTEND
- Bundle size: next-bundle-analyzer configurado?
- Code splitting: rotas usam dynamic import onde aplicável?
- Imagens: next/image com formatos modernos?
- Fontes: font-display swap + preload nas críticas?
- SEO: title único, meta description, Open Graph por página?
- Responsividade: breakpoints mobile/tablet/desktop?
- Acessibilidade: alt em imagens, label em inputs, foco visível, aria-* corretos?
- Estados de UI: loading, error e empty state em todos os fluxos de dados?
- Formulários: validação client-side com Zod + feedback de erro visível?
- Páginas de erro: 404 e 500 customizadas?
- console.log removidos de produção?
- favicon, robots.txt, sitemap.xml presentes?
- Design System: tokens de cor/tipografia seguem DESIGN_SYSTEM.md? Nenhum valor hardcoded fora do mapeamento?
- Impressão A4: @media print oculta sidebar/.no-print, cabeçalho/rodapé fixos?

### 2. APIs & BACKEND LOGIC
- Server Actions e Route Handlers com validação Zod server-side?
- Error response padronizado e consistente?
- Lógica de negócio separada de componentes UI (lib/ ou services/)?
- Chamadas OData com timeout configurado?
- Retry com backoff exponencial nas chamadas OData?
- Token Entra ID não exposto ao client (apenas server-side)?
- Paginação nas listagens OData (evitar over-fetching)?

### 3. DATABASE & STORAGE
- Migrações versionadas com rollback?
- RLS ativo e testado em todas as tabelas (profiles, tenants, reports, indicators, audit_logs)?
- Índices em colunas de WHERE/JOIN/ORDER BY?
- Sem N+1 queries?
- Connection pooling configurado no Supabase?
- Credenciais hardcoded no código-fonte?

### 4. AUTH & PERMISSIONS
- Token Entra ID com expiração + refresh implementado?
- Logout invalida sessão corretamente?
- Cada rota protegida verifica role (admin/planner/viewer)?
- RLS por tenant testado (usuário A não acessa dados do tenant B)?
- Rate limit no endpoint de login?
- OAuth scopes mínimos solicitados ao Entra ID?

### 5. HOSTING & DEPLOYMENT
- Secrets em variáveis de ambiente — nenhum .env commitado com valores reais?
- Health check em /api/health?
- Rollback strategy definida?
- HTTPS enforced?

### 6. CI/CD & VERSION CONTROL
- Pipeline: lint → test → build → security scan → deploy?
- Branch protection: merge bloqueado se CI falhar?
- Secrets não expostos em logs do CI?
- Conventional Commits seguidos?

### 7. SECURITY
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options configurados?
- XSS: inputs com escape, sem dangerouslySetInnerHTML não sanitizado?
- CSRF: proteção em mutations?
- IDOR: autorização verifica ownership antes de retornar/modificar?
- CORS restrito em produção?
- npm audit sem vulnerabilidades high/critical?
- Dados sensíveis (tokens, emails) não aparecem em logs?

### 8. RATE LIMITING
- Rate limit global por IP no middleware?
- Rate limit específico em login, OData refresh, geração de relatório?
- Headers X-RateLimit-* retornados?
- 429 retornado corretamente?

### 9. CACHING & CDN
- Assets estáticos via CDN da Vercel?
- Cache-Control correto por tipo de recurso?
- Respostas com dados de usuário têm Cache-Control: no-store?
- ISR revalidate=900 nas chamadas OData (conforme arquitetura)?

### 10. ERROR TRACKING & LOGS
- Sentry configurado e capturando erros (client + server)?
- Logs estruturados JSON com timestamp/level/service/traceId?
- DEBUG desabilitado em produção?
- audit_logs registrando ações críticas (login, report.create, odata.refresh)?

### 11. AVAILABILITY & RECOVERY
- Health check monitorando banco + OData connectivity?
- Backup do Supabase configurado?
- Uptime monitoring ativo?

Comece a auditoria agora. Retorne o relatório completo no formato especificado.
```

---



## 📝 CHANGELOG

| Data | Fase | Ação | Autor |
|---|---|---|---|
| 2025-06-11 | FASE 0 | Criação do documento master, schema completo, arquitetura de fases definida | Claude |
| 2025-06-11 | FASE 0 | **rev.2** — Removida `odata_cache` do Supabase. OData via Server Components + Next.js ISR. | Claude |
| 2025-06-11 | FASE 0 | **rev.3** — Design System completo integrado. Stack corrigida (`@base-ui/react` + `cva`). Checklist gate e Code Review Pré-Build adicionados. | Claude |
| 2025-06-11 | FASE 0 | **rev.4** — Git workflow integrado: regra #8, Conventional Commits, branch strategy (`dev`→`main`), repositório `luanagcouto-eng/panoramasemanalplanejamento` registrado. | Claude |
| 2026-06-12 | FASE 1 | Scaffolding inicial criado em `panorama-semanal-planejamento/` (Next.js 15 App Router + Tailwind v4 + `@base-ui/react` + `cva` + `lucide-react`). Design tokens Mauá aplicados em `app/globals.css` via `@theme`. `lib/utils.ts` com `cn`, `goalColor`, `goalTextClass`, `calcProgress`, `formatGoalValue`, `OP_SYMBOL`, `progressBarPct`. Página de login (`/login`) com card e botão Microsoft (UI only, sem NextAuth ainda). Layout autenticado com sidebar navy (`/panorama`) e página placeholder do Panorama Semanal com indicadores mockados. Build de produção validado (webpack — Turbopack apresenta panic em paths com acentuação, ex. "Mauá"; `outputFileTracingRoot` configurado em `next.config.ts`). | Claude |
| 2026-06-12 | FASE 1 | NextAuth v5 + Microsoft Entra ID configurado (`auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `types/next-auth.d.ts`). `middleware.ts` protegendo rotas autenticadas com redirect `/login` ↔ `/panorama`. `LoginCard` conectado a `signIn("microsoft-entra-id")`; `LogoutButton` na sidebar exibindo nome/e-mail da sessão. Clients Supabase criados (`lib/supabase/server.ts`, `client.ts`, `admin.ts`). Migration `supabase/migrations/0001_init.sql` com schema completo (tenants, profiles, reports, indicators, audit_logs, triggers, índices). `zod` instalado + `lib/schemas/profile.ts`. `.env.example` com todas as variáveis da Fase 1/2. Build e lint validados. | Claude |
| 2026-06-12 | FASE 1 | Credenciais reais do Azure AD (App Registration) e Supabase (`PanoramaSemanalPlanejamento`, `evcewpfizfbwcpnwahmt`) configuradas em `.env.local`. Migration `0001_init.sql` confirmada já aplicada no projeto via MCP (`list_tables`); aviso de segurança `function_search_path_mutable` corrigido com `supabase/migrations/0002_fix_search_path.sql` (`apply_migration` + `get_advisors` limpo). Dev server validado em `http://localhost:3000`: `/api/auth/providers` retorna `microsoft-entra-id` (OIDC) corretamente, `/login` e `/` (redirect) respondem 200. | Claude |
| 2026-06-12 | FASE 1 | **Decisão #8** — sync NextAuth → Supabase implementado: `lib/supabase/sync-user.ts` (cria/atualiza `auth.users` + `profiles` no primeiro login via `service_role`), `lib/supabase/jwt.ts` (assina JWT `authenticated` com `SUPABASE_JWT_SECRET`, `sub = profiles.id`, exp. 1h, via `jose`). `auth.ts`: callback `jwt` chama o sync e renova `supabaseAccessToken`; callback `session` expõe `session.user.id` (= `profiles.id`) e `session.supabaseAccessToken`. `lib/supabase/server.ts` refeito para usar `@supabase/supabase-js` com header `Authorization: Bearer <supabaseAccessToken>`, habilitando `auth.uid()` nas policies de RLS. `types/next-auth.d.ts` atualizado. Pendente: usuário fornecer `SUPABASE_JWT_SECRET` (Project Settings → Data API → JWT Settings) e desbloqueio do consentimento de admin do Azure AD para teste end-to-end. Build, lint e `tsc --noEmit` validados. | Claude |
| 2026-06-12 | FASE 1 | Tentativa de desbloqueio do login Microsoft: removido escopo `User.Read`/Graph de `auth.ts` (causa raiz aparente do "Need admin approval"). Erro persistiu mesmo após consentimento geral concedido — causa raiz é a política "Do not allow user consent" do tenant Estaleiro Mauá, fora do controle da aplicação. | Claude |
| 2026-06-12 | FASE 1 | **Decisão #9** — login trocado de Microsoft Entra ID para **Google** + allowlist. Migration `supabase/migrations/0003_allowed_emails.sql` (tabela `allowed_emails`: email/role/tenant_id, RLS restrita a admins) aplicada via MCP; seed `luanagcouto@gmail.com` como `admin`. Novo `lib/supabase/check-allowlist.ts`. `lib/supabase/sync-user.ts` generalizado (`syncEntraUserToSupabase` → `syncUserToSupabase`, recebe `role` da allowlist). `auth.ts`: provider `Google`, callback `signIn` nega login se e-mail fora da allowlist, callback `jwt` usa `role` da allowlist no sync; removido `accessToken`/`session.accessToken` (não aplicável a Google). `types/next-auth.d.ts` atualizado. `LoginCard` com botão "Entrar com Google". `.env.example`/`.env.local`: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (login) + `AZURE_AD_*` realocado para credencial app-only da Fase 2 (OData/PWA). Pendente: criar OAuth Client no Google Cloud Console e configurar `SUPABASE_JWT_SECRET`. | Claude |
| 2026-06-12 | FASE 1 | Login Google validado end-to-end: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` e `SUPABASE_JWT_SECRET` configurados em `.env.local`. Fix `400 redirect_uri_mismatch` (URI `http://localhost:3000/api/auth/callback/google` cadastrada no Google Cloud Console). Allowlist ampliada com `luana.couto@estaleiromaua.ind.br` (`admin`). Login real testado com sucesso — `profiles` populado (`role: admin`), sessão ativa em `/panorama`. Gate de Segurança da Fase 1 fechado. | Claude |

---

> **Próxima ação:** Validar o fluxo de login end-to-end no navegador (Microsoft → callback → sessão → `/panorama`). Decidir e implementar a estratégia de sync NextAuth → `auth.users` do Supabase (pendência arquitetural da Fase 1: `profiles.id → auth.users(id)` não é populado automaticamente por login via Entra ID — avaliar `supabase.auth.admin.createUser` no primeiro login via `lib/supabase/admin.ts`, ou trocar a FK por `TEXT` com o `sub` do Entra ID). Após resolver, fechar gate de Segurança da Fase 1.
