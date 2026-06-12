# CHANGELOG — Panorama Semanal de Planejamento

Histórico completo de criação e alteração do projeto. Toda mudança relevante
(código, configuração, infraestrutura, decisões) deve ser registrada aqui,
em ordem cronológica, com data no formato `AAAA-MM-DD`.

> Documento complementar ao `project_master_prompt_panorama_semanal_planejamento.md`
> (raiz do workspace), que contém a especificação completa, arquitetura de fases
> e decisões arquiteturais. Este CHANGELOG foca no **histórico de execução**
> deste projeto especificamente.

---

## 2026-06-12

### Scaffolding inicial (commit `7058a54`)
- Projeto criado com `create-next-app@15` (Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4).
- Dependências adicionadas: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
- Design tokens da Mauá aplicados em `app/globals.css` via `@theme` (navy `#364B59`, orange `#F18213`, escala de cinzas, cores de gamificação para progresso de metas, tokens de impressão A4 via `@media print`).
- `lib/utils.ts` criado com helpers: `cn`, `goalColor`, `goalTextClass`, `OP_SYMBOL`, `formatGoalValue`, `calcProgress`, `progressBarPct`.
- Layout raiz (`app/layout.tsx`) com fonte Inter via `next/font/google`.
- Página de login (`/login`) com `LoginCard` (UI apenas, sem NextAuth ainda).
- Layout autenticado (`(authenticated)/layout.tsx`) com sidebar navy e navegação (Panorama Semanal, Indicadores, Relatórios, Configurações).
- Página placeholder `/panorama` com indicadores mockados usando os helpers de `lib/utils.ts`.
- **Fix**: removido `--turbopack` dos scripts `dev`/`build` — Turbopack apresentava panic (`byte index is not a char boundary`) por causa dos acentos no caminho do workspace ("Mauá"/"Área"). Build passou a usar webpack.
- **Fix**: adicionado `outputFileTracingRoot` em `next.config.ts` para resolver warning de múltiplos lockfiles.

### Autenticação + schema Supabase (commit `8ec5666`)
- **NextAuth v5 (beta) + Microsoft Entra ID**: `auth.ts` configurado com provider OIDC (`MicrosoftEntraID`), estratégia de sessão JWT, callback que propaga `accessToken` para uso futuro (Fase 2 — OData).
- Route handler `app/api/auth/[...nextauth]/route.ts` e augmentação de tipos `types/next-auth.d.ts` (Session/JWT com `accessToken`).
- `middleware.ts`: protege rotas autenticadas, redireciona `/login` ↔ `/panorama` conforme sessão.
- `LoginCard` conectado a `signIn("microsoft-entra-id", { redirectTo: "/panorama" })`; `LogoutButton` adicionado à sidebar, exibindo nome/e-mail/iniciais do usuário logado.
- **Clients Supabase**: `lib/supabase/server.ts` (SSR com cookies, anon key), `lib/supabase/client.ts` (browser, anon key), `lib/supabase/admin.ts` (service_role, server-only).
- **Migration `supabase/migrations/0001_init.sql`**: schema completo —
  - `tenants` (multi-tenancy: nome, `pwa_url`, `entra_tenant`)
  - `profiles` (extensão de `auth.users`: `full_name`, `email`, `role` admin/planner/viewer, `tenant_id`)
  - `reports` (panoramas semanais salvos, `snapshot` JSONB, soft delete)
  - `indicators` (KPIs configuráveis por tenant: `formula`, `entity_source`, `column_map`, `display_type`)
  - `audit_logs` (trilha de auditoria, leitura restrita a admins)
  - RLS habilitado em todas as tabelas + policies de isolamento por tenant/role
  - Trigger `update_updated_at()` em `profiles`
  - Índices: `idx_profiles_tenant_id`, `idx_reports_tenant_id`, `idx_reports_week_start`, `idx_indicators_tenant_id`, `idx_audit_logs_tenant_id`, `idx_audit_logs_created_at`
- `zod` instalado + `lib/schemas/profile.ts` (validação de `Profile`/`ProfileRole`).
- `.env.example` criado com todas as variáveis necessárias (Fase 1 e 2); `.gitignore` ajustado para ignorar `.env*` exceto `.env.example`.

### Credenciais reais + correção de segurança Supabase (commit `0d77ad1`)
- `.env.local` criado (não versionado) com credenciais reais:
  - Azure AD App Registration (`AZURE_AD_CLIENT_ID/SECRET/TENANT_ID`, exibido no consentimento como **"EstaleiroMaua - PlanodeMetas"**) + `NEXTAUTH_SECRET`.
  - Projeto Supabase dedicado **`PanoramaSemanalPlanejamento`** (ref `evcewpfizfbwcpnwahmt`, região `us-west-2`) — distinto do projeto `MetasMaua2026` (`hkguphmtiwwjjnadnbdq`, `sa-east-1`).
- Confirmado via MCP Supabase (`list_tables`) que a migration `0001_init.sql` já estava aplicada no projeto real, com as 5 tabelas e RLS corretos.
- **Fix de segurança**: `get_advisors` apontou aviso `function_search_path_mutable` em `update_updated_at()`. Corrigido via `supabase/migrations/0002_fix_search_path.sql` (adiciona `SET search_path = public`), aplicado via MCP `apply_migration`. `get_advisors` voltou a não reportar lints.
- **Fix do dev server**: processo `next start` (produção) órfão estava ocupando a porta 3000, causando erro 500 (`ENOENT .next/server/pages/_document.js`) ao acessar `/api/auth/providers`. Processo finalizado e `npm run dev` reiniciado limpo na porta 3000.
- Validado: `/api/auth/providers` retorna o provider `microsoft-entra-id` (OIDC) corretamente; `/login` e `/` respondem 200.

### Consentimento de administrador (Azure AD) — pendente (ação fora do código)
- Erro **"Necessidade de aprovação do administrador"** (AADSTS — admin consent required) ocorre porque o tenant da Estaleiro Mauá tem a política "Do not allow user consent" para o app "EstaleiroMaua - PlanodeMetas" (client id `2a3f8838-1ad5-412a-bc43-eecd3458c9d0`).
- Removido o escopo `User.Read` (Microsoft Graph) de `auth.ts` (ver abaixo) — não resolveu, pois a tela de consentimento do Azure AD é avaliada a partir das **permissões configuradas no App Registration + política do tenant**, não do escopo enviado em tempo de execução pelo NextAuth.
- **Ação necessária (fora do código)**: um admin com papel Global Administrator / Privileged Role Administrator / Cloud Application Administrator / Application Administrator precisa:
  1. Clicar em "Have an admin account? Sign in with that account" na própria tela de erro, entrar com a conta admin e marcar **"Consent on behalf of your organization"** antes de aceitar; OU
  2. No Entra admin center → Identity → App registrations → "EstaleiroMaua - PlanodeMetas" → API permissions → **"Grant admin consent for [tenant]"**.
- **Fix de código** (mantido, é uma melhoria independente): `auth.ts` agora sobrescreve `authorization.params.scope` para `"openid profile email"`, removendo `User.Read`/Graph do fluxo de login. A foto de perfil (`image`) passa a vir sempre `null` (fallback já existente no provider).

### Fix do dev server: CSS 404 em `/login` (asset 404 apos build)
- Rodar `npm run build` enquanto o `npm run dev` estava ativo sobrescreveu `.next`, quebrando o mapa de assets do dev server — `/_next/static/css/app/layout.css` passou a retornar 404, deixando `/login` sem estilos (Tailwind/branding Mauá).
- **Fix**: `.next` limpo (`rm -rf .next`) e `npm run dev` reiniciado. CSS volta a responder `200 text/css`.
- **Nota de processo**: ao rodar `npm run build` para validação (agora obrigatório antes de cada commit), reiniciar o dev server depois para evitar esse problema.

### Remote GitHub configurado
- `origin` → `https://github.com/luanagcouto-eng/panoramasemanalplanejamento.git`, branch `master` enviada (`git push -u origin master`).

### Sync NextAuth ↔ Supabase `auth.users` (decisão #8 — resolvido)
- **Decisão**: manter Entra ID como provedor de autenticação (via NextAuth) e Supabase como backend de dados/RLS, sincronizando automaticamente o usuário Entra ID com `auth.users`/`profiles` no primeiro login. Alternativa de trocar a FK `profiles.id` por `TEXT`/`sub` do Entra ID foi descartada (exigiria infraestrutura própria de tokens e reescrita de todas as policies de RLS).
- **`lib/supabase/sync-user.ts`** (novo): no primeiro login, busca `profiles` por `email`; se não existir, cria o usuário via `supabase.auth.admin.createUser` (service_role) e insere o `profiles` correspondente (`role: viewer` por padrão). Em logins subsequentes, apenas atualiza `full_name`/`avatar_url`.
- **`lib/supabase/jwt.ts`** (novo): assina, via `jose` (`SignJWT`, HS256), um access token compatível com o GoTrue do Supabase — `sub = profiles.id`, `role: authenticated`, expiração de 1h — usando `SUPABASE_JWT_SECRET` (mesmo segredo das chaves anon/service_role do projeto, confirmado HS256/legacy).
- **`auth.ts`**: callback `jwt` chama `syncEntraUserToSupabase` no primeiro login (quando `account` está presente) e renova `supabaseAccessToken` a cada requisição a partir do `supabaseUserId` já armazenado no token. Callback `session` expõe `session.user.id` (= `profiles.id`) e `session.supabaseAccessToken`.
- **`lib/supabase/server.ts`** (reescrito): trocado `createServerClient` (cookies, `@supabase/ssr`) por `createClient` (`@supabase/supabase-js`) com header `Authorization: Bearer <supabaseAccessToken>`, fazendo `auth.uid()` resolver para `profiles.id` nas policies de RLS já criadas em `0001_init.sql`.
- **`types/next-auth.d.ts`**: `Session.user.id`, `Session.supabaseAccessToken`, `JWT.supabaseUserId`, `JWT.supabaseAccessToken`.
- Dependência **`jose`** adicionada (assinatura de JWT HS256, leve, compatível com Edge Runtime).
- Validado: `tsc --noEmit`, `npm run lint` e `npm run build` sem erros.
- **Pendente**: definir `SUPABASE_JWT_SECRET` em `.env.local` (Supabase Dashboard → Project Settings → Data API → JWT Settings → JWT Secret) e testar o fluxo completo (login → sync → `profiles` populado → query com RLS).

### Migração do login: Microsoft Entra ID → Google + allowlist (decisão #9)
- **Motivação**: o login via Entra ID ficou bloqueado por "Necessidade de aprovação de administrador" (AADSTS admin-consent-required) mesmo após remover o escopo `User.Read`/Graph — causa raiz é a política "Do not allow user consent" do tenant Estaleiro Mauá (Enterprise Applications → Consent and permissions), fora do controle da aplicação e sem confirmação de correção pelo admin. Decisão do usuário: **substituir o login Entra ID por Google** (NextAuth) e manter o acesso ao PWA/OData (Fase 2) via uma credencial Entra ID **app-only (client credentials)** separada do login, já que o PWA só aceita tokens Entra ID.
- **Migration `supabase/migrations/0003_allowed_emails.sql`** (aplicada via MCP `apply_migration`): nova tabela `allowed_emails` (`email` PK, `role` admin/planner/viewer, `tenant_id`), RLS restrita a admins. Diferente do Entra ID (tenant corporativo), contas Google não são restritas automaticamente ao domínio Mauá — o acesso é controlado por esta allowlist, verificada no callback `signIn` antes do sync com `auth.users`. Seed: `luanagcouto@gmail.com` como `admin` (`execute_sql`). `get_advisors` sem novos lints.
- **`lib/supabase/check-allowlist.ts`** (novo): `checkAllowlist(email)` consulta `allowed_emails` (via `service_role`) e retorna `{ allowed, role }`.
- **`lib/supabase/sync-user.ts`** (generalizado): renomeado `syncEntraUserToSupabase` → `syncUserToSupabase`, agora recebe `role` (vindo da allowlist) e usa esse valor ao criar o `profiles` (antes hardcoded `viewer`).
- **`auth.ts`** (reescrito): provider `MicrosoftEntraID` substituído por `Google` (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`). Novo callback `signIn` chama `checkAllowlist(user.email)` e **nega o login** (`return false`) se o e-mail não estiver na allowlist ou não existir. Callback `jwt` consulta a allowlist no primeiro login para obter `role` e passa para `syncUserToSupabase`; removida a propagação de `accessToken`/`session.accessToken` (específica do Entra ID, não aplicável ao Google — token Entra ID para a Fase 2 virá da credencial app-only separada).
- **`types/next-auth.d.ts`**: removido `accessToken?: string` de `Session` e `JWT` (mantidos apenas `supabaseAccessToken`/`supabaseUserId` da decisão #8).
- **`components/auth/login-card.tsx`**: `MicrosoftLogo` → `GoogleLogo` (SVG "G" colorido), `handleSignIn` chama `signIn("google", { redirectTo: "/panorama" })`, texto do botão "Entrar com Google", rodapé "Acesso restrito a usuários autorizados. / Autenticação via Google."
- **`.env.example`/`.env.local`**: nova seção "NextAuth / Google" (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`); seção `AZURE_AD_*` realocada e re-rotulada como credencial **app-only (client credentials)** para a Fase 2 (OData/PWA), independente do login — comentário "Definir ao iniciar a Fase 2" no `.env.example` (em `.env.local` os valores existentes do App Registration "EstaleiroMaua - PlanodeMetas" foram mantidos, agora reservados para a Fase 2).
- **Pendente**: (1) criar OAuth Client ID (Web application) no Google Cloud Console — redirect URI `http://localhost:3000/api/auth/callback/google`, adicionar `luanagcouto@gmail.com` (e outros e-mails de teste) como test users se o app estiver em modo "Testing"; preencher `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` em `.env.local`. (2) definir `SUPABASE_JWT_SECRET` (decisão #8, ainda pendente). (3) Fase 2: criar App Registration Entra ID separado com Application permissions (app-only) + admin consent para acesso OData/PWA.

### Login Google validado end-to-end
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` configurados em `.env.local` (OAuth Client `855151171262-...apps.googleusercontent.com`); `SUPABASE_JWT_SECRET` também configurado.
- **Fix**: erro `400 redirect_uri_mismatch` no primeiro teste — corrigido adicionando `http://localhost:3000/api/auth/callback/google` em "URIs de redirecionamento autorizados" no Google Cloud Console.
- Allowlist: adicionado `luana.couto@estaleiromaua.ind.br` como `admin` em `allowed_emails` (e-mail corporativo usado no login real, além de `luanagcouto@gmail.com`).
- **Login testado com sucesso**: `signIn("google")` → allowlist aprova → `syncUserToSupabase` cria registro em `profiles` (`email: luana.couto@estaleiromaua.ind.br`, `full_name` do Google, `role: admin`) → sessão ativa em `/panorama`. Fluxo completo de autenticação (decisões #8 e #9) validado end-to-end.
