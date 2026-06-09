# MetasMaua2026 — Histórico de Brainstorming

> Projeto: Aplicação web de gestão de metas corporativas  
> Metodologia: SDD (Specification-Driven Development) + GSD (Goal-Driven Design)  
> Início: 2026-06-08  
> Status: **Em produção** — todas as 7 fases entregues (Sentry infra pronta, aguarda DSN da conta Sentry.io)  
> Produção: https://estaleiromaua-eight.vercel.app  
> Repositório: https://github.com/luanagcouto-eng/estaleiromaua

---

## Sessão 1 — 2026-06-08

### Requisitos levantados pelo usuário

1. **Página de login** com autenticação Google, restrita ao domínio `@estaleiromaua.ind.br`
2. **Visão geral do CEO** com organograma dos setores: Financeiro, Produção, Planejamento, Qualidade, Manutenção, Compliance, Comercial e EHS — com gamificação via preenchimento progressivo conforme percentual das metas
3. **Página de detalhamento** para que cada gestor visualize suas metas individualmente, separadas por setor e diretoria
4. **Página de configuração** das metas: nome do gestor, meta, peso, nome do superior imediato

### Stack definida

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Framework | Next.js 15 (App Router) | Server Components, Server Actions, RSC reduzem round-trips |
| Estilo | Tailwind CSS + shadcn/ui | Headless, customizável, evita estilos genéricos |
| Auth | Supabase Auth + Google OAuth | Nativo no ecossistema, sem dependência extra |
| Banco de dados | Supabase (PostgreSQL + RLS) | Row Level Security garante isolamento por role sem lógica extra no front |
| Estado servidor | TanStack Query | Cache, invalidação e revalidação automática |
| Org chart | d3-org-chart | Maduro, flexível, suporte a SVG fill para gamificação |
| Hospedagem | Vercel | Deploy contínuo, Edge Middleware para auth, Analytics integrado |

---

## Decisões tomadas

### Modelo de metas
- **Opção A — Cascata (OKR clássico)**: CEO define metas → Diretores herdam e desdobram → Gestores herdam dos Diretores
- O percentual do CEO é a média ponderada dos diretores, que é a média ponderada dos gestores

### Lançamento do realizado
- **Manual**: o gestor preenche o valor atual periodicamente
- Ao lançar, devem aparecer junto: **memórias de cálculo** e **evidências** (arquivos, links, comentários)

### Periodicidade
- Metas **anuais** com acompanhamento **trimestral**

### RBAC (controle de acesso por papéis)
```
ceo        → vê tudo, org chart completo
director   → vê suas metas e de seus subordinados diretos
manager    → vê somente suas próprias metas
admin      → acessa página de configuração de metas
```

---

## Organograma Mauá (estrutura completa)

```
CEO: Miro Arantes
├── Diretor de Operações: Marcelo Arantes
│   ├── Gerência Técnica: Alexander Araújo
│   │   ├── Métodos e Processos
│   │   ├── CQ
│   │   ├── Planejamento
│   │   └── Engenharia
│   ├── Gerência Produção: Alexandre Nora
│   │   └── Produção
│   ├── Gerência Manutenção: Alexandre Nora
│   │   └── Manutenção
│   ├── Gerência Suprimentos: Ernani Brito
│   │   ├── Suprimentos
│   │   └── Almoxarifado
│   └── Gerência Contratos: Alexandre Trindade
│       └── Contratos
├── Diretoria RH/EHS: Marcello Romullo (acumula Gerente RH)
│   └── Gerente EHS: Diogo
├── Diretor Comercial: Hansel
│   ├── Gerente Comercial (Orçamento): Paulo Roberto
│   ├── Gerente Comercial (Vendas): [Em aberto — exibir como nó vazio]
│   └── Gerente IT: Marcelo Cohen
├── Gerente de CGQ: Claudia
│   ├── Coordenadora Compliance: Camila
│   └── CGQ
└── Gerente Financeiro: Joceir
    └── Coordenador Financeiro: [Em aberto — exibir como nó vazio]
```

**Regra de exibição do organograma:** somente até o 2º nível (CEO → subordinados diretos).  
Clique em um nó abre o detalhamento daquele nó e seus subordinados.

---

## Schema de banco (rascunho aprovado)

```sql
-- Usuários
users
  id            uuid PK
  email         text UNIQUE
  name          text
  role          enum(ceo, director, manager, admin)
  department_id uuid FK departments
  superior_id   uuid FK users (self-reference)
  avatar_url    text
  is_placeholder boolean DEFAULT false  -- para cargos "Em aberto"

-- Departamentos / Áreas
departments
  id          uuid PK
  name        text
  sector      enum(Financeiro, Produção, Planejamento, Qualidade,
                    Manutenção, Compliance, Comercial, EHS)
  director_id uuid FK users
  parent_id   uuid FK departments (hierarquia)

-- Metas
goals
  id            uuid PK
  title         text
  description   text
  period        text  -- ex: "2026-Q1", "2026-ANUAL"
  weight        numeric  -- peso percentual
  target_value  numeric
  current_value numeric
  unit          text  -- ex: %, R$, dias, unidades
  owner_id      uuid FK users
  department_id uuid FK departments
  created_at    timestamptz
  updated_at    timestamptz

-- Histórico / Acompanhamento trimestral
goal_history
  id           uuid PK
  goal_id      uuid FK goals
  value        numeric
  notes        text        -- memória de cálculo
  evidence_url text[]      -- links de evidências
  recorded_at  timestamptz
  recorded_by  uuid FK users

-- Auditoria geral
audit_log
  id         uuid PK
  user_id    uuid FK users
  action     text  -- UPDATE_GOAL, LOGIN, CONFIG_CHANGE, etc.
  entity_id  uuid
  old_value  jsonb
  new_value  jsonb
  ip         text
  timestamp  timestamptz
```

---

## Design System — Decisões finais

### Identidade visual
- **Logo**: Estaleiro Mauá (elipse com tarja laranja superior e azul inferior)
- **Modo**: Light only
- **Responsividade**: Desktop-first (uso corporativo interno)
- **Tipografia**: Inter (padrão shadcn/ui)

### Paleta de tokens

```css
/* Primitivos */
--maua-orange:    #F18213;
--maua-navy:      #364B59;
--maua-white:     #FFFFFF;
--maua-gray-50:   #F8F9FA;
--maua-gray-200:  #E2E8F0;
--maua-gray-500:  #6B7280;
--maua-gray-900:  #111827;

/* Semânticos */
--color-primary:     var(--maua-navy);      /* estrutura, headers, botões */
--color-accent:      var(--maua-orange);    /* CTAs, highlights, fill da gamificação */
--color-background:  var(--maua-white);
--color-surface:     var(--maua-gray-50);
--color-border:      var(--maua-gray-200);
--color-text:        var(--maua-gray-900);
--color-muted:       var(--maua-gray-500);
```

### Gamificação — lógica de cor do fill
```
0%  –  30%  → fill laranja fraco (opacity 30%)
31% –  60%  → fill laranja médio (opacity 60%)
61% –  89%  → fill laranja forte (#F18213)
90% – 100%  → fill navy (#364B59) + ícone de troféu
```

### Componentes-base a definir
| Componente | Descrição |
|------------|-----------|
| `OrgNode` | Nó do organograma com SVG clip-path animado |
| `GoalCard` | Card de meta com progresso, peso e status trimestral |
| `ProgressRing` | Indicador circular de percentual |
| `EvidenceUpload` | Anexo de evidência ao lançar resultado |
| `QuarterBadge` | Badge Q1/Q2/Q3/Q4 com status de preenchimento |

---

## Pontos de atenção confirmados

- **Segurança**:
  - RLS no Supabase garante isolamento por role no banco
  - Edge Middleware do Next.js valida domínio `@estaleiromaua.ind.br` antes de qualquer rota
  - Server Actions re-verificam role no servidor — nunca confiar no client
  - `SUPABASE_SERVICE_ROLE_KEY` apenas em Server Actions, nunca exposta ao browser
  - Trigger no Postgres para log automático de qualquer UPDATE em goals
- **Performance**:
  - Server Components + Suspense com Skeleton para o org chart do CEO
  - View ou Materialized View no Postgres para consolidado do CEO (não calcular no front)
- **Gamificação**: SVG clip-path animado (não CSS height) — mais fluido e funciona em qualquer forma
- **Hospedagem**: Vercel — Edge Middleware, Analytics e Speed Insights incluídos
- **Escalabilidade**: Não prioritária — aplicação interna com usuários limitados

---

## Observabilidade — Stack definida

| Ferramenta | O que monitora |
|-----------|---------------|
| Vercel Analytics | Page views, Web Vitals, erros de build |
| Vercel Speed Insights | LCP, CLS, FID por rota |
| Sentry | Erros em runtime (front + back) |
| Supabase Dashboard | Queries lentas, conexões, armazenamento |
| `audit_log` (próprio) | Quem alterou qual meta e quando |

---

## Estratégia de desenvolvimento — Ordem definitiva

### Por que essa ordem?

> Princípio GSD aplicado: entregar valor verificável a cada fase, sem dependências bloqueantes.

```
FASE 0 — Fundação (sem UI)
  ├── Criar projeto Next.js 15 + Tailwind + shadcn/ui
  ├── Criar projeto Supabase + configurar tabelas + RLS
  ├── Configurar Google OAuth com restrição de domínio
  ├── Configurar tokens de design (CSS vars) e tema shadcn
  └── Deploy inicial vazio na Vercel (valida pipeline CI/CD)
  → Entrega: infraestrutura funcionando, auth protegendo rotas

FASE 1 — Auth + Layout base
  ├── Página de login (Google Sign-in + validação de domínio)
  ├── Edge Middleware de proteção de rotas
  ├── Layout principal (sidebar com nav por role)
  └── Seed: inserir hierarquia completa da Mauá no banco
  → Entrega: qualquer usuário @estaleiromaua.ind.br já consegue logar

FASE 2 — Configuração (Admin)
  ├── Página de gestão de usuários e cargos
  ├── Página de criação/edição de metas
  ├── Atribuição de peso e superior imediato
  └── Validação: soma dos pesos = 100% por gestor
  → Entrega: admin consegue cadastrar toda a estrutura de metas

FASE 3 — Visão do Gestor
  ├── Dashboard individual com cards de metas
  ├── Modal de lançamento trimestral (valor, memória de cálculo, evidência)
  ├── Histórico de lançamentos por meta
  └── Indicador de progresso anual consolidado
  → Entrega: gestores conseguem usar o sistema do dia a dia

FASE 4 — Visão do Diretor
  ├── Painel com metas próprias + consolidado dos subordinados diretos
  ├── Tabela comparativa dos gestores sob sua direção
  └── Drill-down: clicar num subordinado abre o GoalCard dele (read-only)
  → Entrega: diretores têm visibilidade de sua área

FASE 5 — Visão CEO (Org Chart)
  ├── Org chart 2 níveis com nós animados (SVG clip-path)
  ├── Gamificação: fill progressivo por % de cada nó
  ├── Painel lateral ao clicar num nó (detalhes do setor)
  └── Materialized view no Postgres alimentando o consolidado
  → Entrega: CEO tem visão gamificada da empresa inteira

FASE 6 — Polimento e Observabilidade
  ├── Integração Sentry
  ├── Notificações: alerta quando meta está abaixo de X% no trimestre
  ├── Exportação PDF do painel do CEO
  └── Ajustes de acessibilidade e performance (Lighthouse)
  → Entrega: aplicação pronta para produção
```

### Critério de "pronto" por fase (Definition of Done)
- Código no repositório com PR revisado
- RLS testada manualmente com usuários de roles diferentes
- Deploy na Vercel sem erros de build
- Funcionalidade validada com dado real (não mock)

---

## Perguntas respondidas

| Pergunta | Resposta |
|----------|---------|
| Modo dark/light? | Light only |
| Responsividade? | Desktop-first |
| Fonte? | Inter (padrão shadcn) |
| Paleta? | #F18213 (laranja), #364B59 (navy), cinza neutro |
| Logo? | Elipse Estaleiro Mauá (laranja + azul) |
| Escalabilidade? | Não prioritária — usuários internos limitados |
| Marcello Romullo duplo papel? | Sim, acumula Diretor RH e Gerente RH |
| Cargos "Em aberto"? | Exibir como nós vazios/cinza no organograma |
| Níveis no org chart do CEO? | Apenas 2 níveis (CEO → subordinados diretos) |
| Outros diretores além de Marcelo Arantes? | Sim — ver organograma completo acima |

---

## Fase 0 — Concluída em 2026-06-08

### O que foi feito

| Item | Status | Detalhe |
|------|--------|---------|
| Projeto Next.js 16 + Tailwind v4 + shadcn/ui 4.11 | ✅ | `MetasMaua2026/metas-maua/` |
| Tokens de design Mauá no CSS (Tailwind v4 CSS-first) | ✅ | `app/globals.css` — sem tailwind.config.ts |
| shadcn/ui inicializado com tema Mauá | ✅ | `:root` sobrescrito com paleta da marca |
| Dependências: Supabase SSR, TanStack Query, clsx, tw-merge | ✅ | `package.json` |
| Estrutura de pastas: types/, lib/supabase/, supabase/migrations/ | ✅ | — |
| Middleware de auth + validação de domínio | ✅ | `middleware.ts` + `lib/supabase/middleware.ts` |
| `.env.local` configurado | ✅ | URL e anon key do projeto |
| `.env.example` documentado | ✅ | Para onboarding de novos devs |
| Projeto Supabase criado (sa-east-1 / São Paulo) | ✅ | ID: `hkguphmtiwwjjnadnbdq` |
| Migration: enums, tabelas, índices, triggers | ✅ | `20260608_initial_schema.sql` |
| Migration: RLS policies, materialized view | ✅ | `20260608_rls_and_views.sql` |
| Seed: 23 departamentos da hierarquia Mauá | ✅ | `seed_departments_hierarchy` |
| Helpers utilitários: goalColor, calcProgress, formatGoalValue | ✅ | `lib/utils.ts` |
| Tipos TypeScript completos | ✅ | `types/index.ts` |

### Decisões técnicas tomadas na Fase 0

- **Next.js 16** (não 15 como planejado) — `create-next-app` instalou a versão mais recente; sem breaking changes relevantes para o projeto
- **Tailwind v4** — configuração CSS-first (sem `tailwind.config.ts`); tokens definidos via `@theme` no `globals.css`
- **shadcn/ui 4.11** — suporte nativo ao Tailwind v4; tema shadcn sobrescrito com paleta Mauá no bloco `:root`
- **Projeto Vera pausado** para liberar slot no plano gratuito do Supabase
- **Região Supabase: sa-east-1** (São Paulo) — menor latência para usuários brasileiros
- **profiles** em vez de `users` — padrão Supabase para estender `auth.users` sem conflito
- **Materialized view `department_progress`** — atualizada por trigger a cada INSERT/UPDATE/DELETE em `goals`
- **Tabela `role_config`** — mapeia padrão de e-mail → role/departamento para o setup inicial de usuários

### Credenciais do projeto Supabase
- **URL:** `https://hkguphmtiwwjjnadnbdq.supabase.co`
- **Project ID:** `hkguphmtiwwjjnadnbdq`
- **Região:** sa-east-1 (São Paulo)
- **Service Role Key:** obter em Settings > API do dashboard

---

## Fase 1 — Concluída em 2026-06-08

### Credenciais Google OAuth configuradas
- **Client ID:** `550727946081-f67l0ll6rknhb12huic11mdjpfb8vl1k.apps.googleusercontent.com`
- **Client Secret:** configurado no Supabase (não versionado)
- **Repositório GitHub:** https://github.com/luanagcouto-eng/estaleiromaua.git

### O que foi feito

| Item | Arquivo |
|------|---------|
| Rota OAuth callback | `app/auth/callback/route.ts` |
| Página de erro de auth | `app/auth/error/page.tsx` |
| Página de login (server) | `app/login/page.tsx` |
| Componente login com Google | `components/auth/login-card.tsx` |
| Layout autenticado + guard | `app/(authenticated)/layout.tsx` |
| Sidebar navy com nav por role | `components/layout/app-sidebar.tsx` |
| Server Action sign-out | `lib/actions/auth.ts` |
| Redirect por role no dashboard | `app/(authenticated)/dashboard/page.tsx` |
| Páginas stub: overview, my-goals, team, admin/* | criadas como placeholder Fase 2–5 |
| Logo SVG placeholder | `public/logo-maua.svg` |
| Commit e push para GitHub | branch `master` |

### Decisões técnicas tomadas na Fase 1
- `(authenticated)` como Route Group do Next.js — não aparece na URL, agrupa proteção num único layout
- Middleware verifica domínio `@estaleiromaua.ind.br` em **todas** as rotas não públicas antes de chegar ao app
- `signOut()` é um **Server Action** — evita exposição de lógica de auth no client
- Sidebar mostra e-mail em vez de role label no rodapé — mais informativo para o usuário
- Logo usa SVG placeholder; substituir por `logo-maua.png` basta sobrescrever `/public/logo-maua.svg` ou mudar o `src`

### Deploy na Vercel — Concluído em 2026-06-08
- **URL de produção:** https://estaleiromaua-git-main-luana-gfc-outo-s-projects.vercel.app
- **Repositório:** https://github.com/luanagcouto-eng/estaleiromaua (branch `main`)
- Variáveis de ambiente configuradas na Vercel
- Supabase Redirect URL atualizado
- Google Cloud Console atualizado

### Próximo passo: Fase 2
- [ ] Construir página de configuração de metas (Admin)
- [ ] Gestão de usuários e atribuição de roles
- [ ] Atribuição de peso e superior imediato por meta

## Fase 2 — Concluída em 2026-06-08

### O que foi feito

| Item | Arquivo |
|------|---------|
| Schema de validação de metas (Zod) | `lib/schemas/goal.ts` |
| Schema de validação de usuário (Zod) | `lib/schemas/user.ts` |
| Server Actions de metas (CRUD + resumo de peso) | `lib/actions/goals.ts` |
| Server Action de atualização de perfil | `lib/actions/users.ts` |
| Componente Form (shadcn, criado manualmente) | `components/ui/form.tsx` |
| Indicador visual de peso total por gestor | `app/(authenticated)/admin/_components/weight-indicator.tsx` |
| Dialog de criação/edição de meta | `app/(authenticated)/admin/_components/goal-form-dialog.tsx` |
| Tabela de metas com ações de editar/excluir | `app/(authenticated)/admin/_components/goals-table.tsx` |
| Dialog de edição de usuário (role/depto/superior) | `app/(authenticated)/admin/_components/user-edit-dialog.tsx` |
| Tabela de usuários com badges de role | `app/(authenticated)/admin/_components/users-table.tsx` |
| Página Admin → Configuração de Metas | `app/(authenticated)/admin/goals/page.tsx` |
| Página Admin → Gestão de Usuários | `app/(authenticated)/admin/users/page.tsx` |
| Componentes shadcn adicionados | `table`, `dialog`, `select`, `label`, `textarea`, `form` |
| Dependências instaladas | `react-hook-form`, `@hookform/resolvers`, `zod`, `sonner`, `@radix-ui/react-label`, `@radix-ui/react-slot` |
| Toaster global (sonner) | `app/layout.tsx` |
| Commit e push para GitHub | branch `main` |

### Decisões técnicas tomadas na Fase 2
- Validação de formulários com **React Hook Form + Zod** via `zodResolver`, com feedback de erro inline em cada campo
- **Indicador de peso por gestor**: barra visual que soma o peso das metas já atribuídas + a meta em edição, sinalizando quando o total se aproxima ou ultrapassa 100% — orienta o admin sem bloquear o salvamento (regra de negócio fica a critério humano)
- Schema de metas usa `z.number()` (não `z.coerce.number()`): os campos numéricos (`peso`, `meta`) já chegam convertidos via `field.onChange(parseFloat(...))` no input — evita o conflito de tipos `input` vs `output` do Zod v4 com o `Resolver` do react-hook-form
- Página de usuários normaliza relações aninhadas do Supabase (`department`, `superior`) de array para objeto único — o PostgREST sempre retorna relações como array, mesmo em FKs 1:1
- `components/ui/form.tsx` foi criado manualmente seguindo o padrão shadcn/ui, pois o CLI (`npx shadcn@latest add form`) falhou silenciosamente ao gerar o arquivo
- Toda mutação (criar/editar/excluir meta, atualizar perfil) é uma **Server Action** — mantém a lógica de escrita no servidor e aciona `revalidatePath` para refletir mudanças imediatamente

### Erros corrigidos durante a Fase 2
- `Cannot find module '@/components/ui/form'` → criado manualmente
- `'invalid_type_error' does not exist` (API removida no Zod v4) → trocado por `z.number("mensagem")`
- Tipo `{ department: {...}[] }` incompatível com `UserRow[]` → normalização de array para objeto único na query de usuários
- Conflito de tipos `Resolver<weight: unknown>` vs `Resolver<weight: number>` (Zod v4 + `@hookform/resolvers`) → revertido de `z.coerce.number()` para `z.number()`, já que a coerção manual no `onChange` torna a coerção do schema redundante
- `Cannot find module '@radix-ui/react-label'` / `'@radix-ui/react-slot'` → dependências instaladas via `npm install`

### Validação
- `npx tsc --noEmit` — sem erros
- `npm run build` — build de produção concluído com sucesso (13 rotas geradas)

### Próximo passo: Fase 3
- [ ] Página CEO — visão geral com organograma gamificado (preenchimento visual por % de meta atingida)
- [ ] Materialized view `department_progress` consumida no dashboard
- [ ] Lógica de cores de gamificação (`goalColor`) aplicada ao organograma

> **Nota de reordenação (2026-06-08):** o roadmap original definia a Fase 3 como "Visão do Gestor" e o organograma do CEO como Fase 5. A pedido do usuário, a ordem foi invertida — o painel do CEO foi construído primeiro (registrado abaixo como "Fase 3"). A Visão do Gestor (dashboard individual, lançamento trimestral, histórico) permanece como próxima entrega.

## Fase 3 — Painel do CEO (organograma gamificado) — Concluída em 2026-06-08

### O que foi feito

| Item | Arquivo |
|------|---------|
| Views recursivas de progresso por subárvore (`org_chart_progress`) e consolidado da empresa (`company_progress`) | `supabase/migrations/20260608_org_chart_progress.sql` |
| Componente `OrgNode` — card com fill SVG via `clip-path`, troféu para ≥90% | `app/(authenticated)/overview/_components/org-node.tsx` |
| Componente `OrgChart` — layout de 2 níveis com conectores CSS e seleção de nó | `app/(authenticated)/overview/_components/org-chart.tsx` |
| Painel lateral de detalhes (`Sheet`) com progresso, metas e subordinadas | `app/(authenticated)/overview/_components/node-detail-sheet.tsx` |
| Página "Visão Geral" do CEO consumindo as views + legenda de cores | `app/(authenticated)/overview/page.tsx` |

### Decisões técnicas tomadas na Fase 3
- **Cálculo no banco, não no front**: criadas as views `org_chart_progress` (CTE recursiva que soma o progresso ponderado de cada departamento + todos os seus descendentes) e `company_progress` (consolidado geral da empresa) — o componente apenas exibe o que o Postgres já calculou, conforme decisão de performance registrada no brainstorm
- **Fill gamificado via `clip-path: inset()`** animado com `transition-[clip-path]` — não usa `height`, conforme decisão de design registrada (mais fluido, funciona em qualquer formato de nó)
- **Organograma limitado a 2 níveis** (CEO + 5 diretorias de 1º nível, `parent_id IS NULL`): Diretoria de Operações, Diretoria Comercial, Diretoria RH/EHS, Gerência CGQ, Gerência Financeiro — clique em um nó abre o painel lateral com as áreas subordinadas (3º nível) e seus percentuais individuais
- **Identificação do responsável por nó**: busca em `profiles` por `role IN ('ceo','director')` casado por `department_id`; nós sem responsável são exibidos como "Em aberto" (estilo placeholder, opacidade reduzida) — hoje todos aparecem assim porque ainda não há usuários logados (`profiles` vazia)
- **Conectores do organograma**: implementados com `div`s posicionados via flex/absolute e bordas (linha vertical do CEO, linha horizontal conectando as 5 diretorias, linhas verticais até cada nó) — sem dependência de bibliotecas externas de diagramas
- **Acesso restrito**: página redireciona quem não é `ceo`/`admin` para `/dashboard`, replicando o padrão das páginas administrativas

### Validação
- Criada rota temporária `/dev-preview/org-chart` (whitelisted no middleware) para renderizar o `OrgChart` com dados mockados cobrindo as 5 faixas de percentual (0%, 22%, 45%, 65%, 72%, 95%) — validado visualmente via HTML renderizado: `clip-path` e cores corretos por faixa, troféu exibido apenas em ≥90%, conectores e grid de 5 colunas presentes. Rota e whitelist removidas após validação
- **Observação de ambiente**: o servidor de dev com Turbopack falha (`panic` no Rust) ao compilar novas rotas neste projeto, por causa do caractere "Á" no caminho da pasta (`OneDrive - Estaleiro Mauá`/`Área de Trabalho`). Contornado rodando `npx next dev --webpack`. Caso o problema persista em fases futuras, considerar mover o projeto para um caminho sem acentuação
- `npx tsc --noEmit` — sem erros
- `npm run build` — build de produção concluído com sucesso (13 rotas geradas, incluindo `/overview`)

### Próximo passo: Visão do Gestor (Fase 3 original / próxima entrega)
- [ ] Dashboard individual do gestor com cards de metas
- [ ] Modal de lançamento trimestral (valor, memória de cálculo, evidência)
- [ ] Histórico de lançamentos por meta
- [ ] Indicador de progresso anual consolidado

## Manutenção — Correção do deploy na Vercel e erro de avatar (2026-06-08)

### Contexto
Antes de seguir para a próxima fase, o usuário reportou falha em todos os deployments de produção do projeto `estaleiromaua` (time `luanagcouto-2081s-projects`) e um erro em tempo de execução na tela após o login.

### Diagnóstico e correções — Vercel
| Problema encontrado | Causa | Correção |
|---|---|---|
| Todos os deploys falhavam em ~150–650ms (incluindo os de 42–48 dias atrás) | Projeto configurado com `Root Directory = "index.html"` e `Framework Preset = "Other"` — provavelmente resquício de uma configuração inicial equivocada | Corrigido via chamada direta à **API REST da Vercel** (`PATCH /v9/projects/{id}`), já que a CLI não expõe edição dessas configurações: `framework: "nextjs"`. **Atenção**: a 1ª tentativa setou `rootDirectory: "MetasMaua2026/metas-maua"`, mas o deploy seguinte falhou com `"Root Directory ... does not exist"` — o repositório GitHub `estaleiromaua` tem o conteúdo do projeto Next.js na **raiz** (não aninhado em `MetasMaua2026/`). Corrigido na 2ª tentativa com `rootDirectory: null` (raiz do repo) |
| Projeto sem nenhuma variável de ambiente configurada | `lib/supabase/{client,server,middleware}.ts` dependem de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em runtime | Adicionadas via `vercel env add` para os 3 ambientes (Production, Preview, Development); para Preview foi necessário usar `--value <valor> --yes` para evitar o prompt interativo de seleção de branch git |

> **Nota:** existem múltiplos projetos `estaleiromaua*` (e variantes com sufixo aleatório) no time `luanagcouto-2081s-projects`. O projeto corrigido foi `estaleiromaua` (`prj_tGEJU1hul06zy1roPmAIcTkfxs2t`). Vale uma limpeza futura para remover projetos órfãos/duplicados.

### Correção — erro de avatar do Google (`next/image`)
- **Erro**: `Invalid src prop (https://lh3.googleusercontent.com/...) on next/image, hostname "lh3.googleusercontent.com" is not configured under images in your next.config.js`, disparado em `components/layout/app-sidebar.tsx` ao renderizar a foto de perfil vinda do login OAuth do Google
- **Correção**: adicionado `images.remotePatterns` em `next.config.ts` liberando o host `lh3.googleusercontent.com` (padrão de URLs de avatar do Google)

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};
```

### Validação
- Processos zumbis do `next dev` (portas 3000/3001) finalizados, cache `.next` removido e servidor reiniciado limpo com `npx next dev --webpack -p 3000` (workaround do panic do Turbopack com o caractere "Á" no caminho, já documentado na Fase 3) — `/login` responde HTTP 200
- Commit `fix: configurar hostname do Google avatar no next/image` enviado para `main`
- Deploy de produção disparado manualmente via `npx vercel --prod` após a correção do `rootDirectory` — **build concluído com sucesso (`READY`)** em ~59s, publicado em `https://estaleiromaua.vercel.app` (alias) — `/login` responde HTTP 200 ✅
- Aplicação acessível localmente em **http://localhost:3000** e em produção em **https://estaleiromaua.vercel.app**

## Fase 4 — Visão do Gestor (Minhas Metas) — Concluída em 2026-06-08

### O que foi feito

| Item | Arquivo |
|------|---------|
| Schema Zod do lançamento de resultado (`value`, `notes`/memória de cálculo, `evidence_url`) | `lib/schemas/goal-entry.ts` |
| Server Action `createGoalEntry` — grava em `goal_history` e atualiza `goals.current_value` | `lib/actions/goal-history.ts` |
| Componente `GoalCard` — card de meta com barra de progresso gamificada, badges de período/peso e ações | `app/(authenticated)/my-goals/_components/goal-card.tsx` |
| Componente `GoalEntryDialog` — modal de lançamento (Form + Zod + Server Action) | `app/(authenticated)/my-goals/_components/goal-entry-dialog.tsx` |
| Componente `GoalHistoryList` — lista expansível de lançamentos anteriores por meta | `app/(authenticated)/my-goals/_components/goal-history-list.tsx` |
| Página "Minhas Metas" reescrita — dashboard do gestor com indicador consolidado + cards | `app/(authenticated)/my-goals/page.tsx` |

### Decisões técnicas tomadas na Fase 4
- **Lançamento = novo registro em `goal_history` + atualização de `goals.current_value`**: cada lançamento trimestral grava uma linha de histórico (valor, memória de cálculo, evidência, autor, data) e sobrescreve o valor atual da meta — preserva o rastro de apurações anteriores sem precisar de lógica adicional de agregação
- **Evidência como URL** (não upload de arquivo): o campo `evidence_url` aceita um link para um arquivo já compartilhado (Drive, SharePoint, etc.) — evita a necessidade de configurar um bucket de Storage no Supabase nesta fase; pode evoluir para upload nativo se o usuário pedir
- **Indicador consolidado calculado na página** (não em view): como a página já busca todas as metas do gestor, o percentual ponderado das metas anuais (`Σ (atual/meta × peso) / Σ peso`) é calculado em JS — replica a mesma fórmula usada nas views `org_chart_progress`/`company_progress`, mas sem round-trip extra ao banco
- **Histórico expansível inline** (toggle por card) em vez de painel lateral — mantém o usuário no contexto da meta, sem abrir um novo `Sheet` por item
- **Reaproveitamento de utilitários de gamificação** (`goalColor`, `goalTextClass`, `calcProgress`, `formatGoalValue` de `lib/utils.ts`) — mesma lógica visual de cores/troféu (🏆 ≥ 90%) usada no organograma do CEO, garantindo consistência entre as telas
- Todas as metas do usuário (`period LIKE '2026%'`) aparecem como cards, mas apenas as de período `2026-ANUAL` entram no cálculo do indicador consolidado e exibem o peso — replicando a regra já usada em `getGoalsWithWeightSummary`

### Validação
- Criada rota temporária `/dev-preview/my-goals` (whitelisted no middleware) com 5 metas mockadas cobrindo as faixas de 0%, ~44%, ~65%, ~96% e 100% — validado via HTML renderizado: `clip-path`/cores corretos por faixa, troféu exibido apenas em ≥ 90%, indicador consolidado, badges de período/peso e botões "Lançar resultado"/"Ver histórico" presentes. Rota e whitelist removidas após validação
- `npx tsc --noEmit` — sem erros
- `npm run build` — build de produção concluído com sucesso (rota `/my-goals` gerada como dinâmica)
- Confirmadas as políticas RLS no Supabase: `goal_history_insert` permite que o autor (`recorded_by = auth.uid()`) registre lançamentos e `goals_owner_update` permite que o dono da meta atualize `current_value` — a Server Action funciona sem necessidade de novas políticas

### Próximo passo: Minha Equipe (Fase 5 — visão do gestor sobre subordinados)
- [ ] Lista de metas dos subordinados diretos (via `get_subordinate_ids`)
- [ ] Indicadores de progresso por colaborador
- [ ] Possível ação de "cobrar lançamento" para metas atrasadas

---

## Manutenção — Correção de contraste de texto (`text-muted`) em toda a aplicação — 2026-06-08

### Problema
Após revisar `/my-goals`, percebemos que toda a interface exibia textos secundários (subtítulos, descrições, badges, contadores) quase invisíveis — texto cinza muito claro sobre fundo branco. Não era um problema isolado da Fase 4: afetava **todas** as páginas que usam a classe `text-muted` (login, erro de auth, overview, team, admin/users, admin/goals, my-goals).

### Causa raiz
Em `app/globals.css`, o token semântico Mauá `--color-muted: var(--color-maua-gray-500)` (definido no bloco `@theme` da marca, pensado para resultar em `#6B7280`) era **sobrescrito** pelo bloco `@theme inline` gerado pelo shadcn logo abaixo, que redefine `--color-muted: var(--muted)` → `#F8F9FA` (quase branco). Em CSS, a declaração que aparece por último na cascata vence — então toda classe `text-muted`/`bg-muted` da aplicação resolvia para a cor de fundo "muted" do shadcn (clara), não para o tom de texto secundário da marca (`gray-500`).
Coincidentemente, o shadcn já define `--muted-foreground: #6B7280` — exatamente o tom que a marca Mauá pretendia para texto secundário.

### Correção
- Removida a declaração órfã `--color-muted: var(--color-maua-gray-500)` do bloco `@theme` da marca em `app/globals.css` (estava sempre sendo sobrescrita; mantê-la só confundiria futuras investigações)
- Substituída a classe `text-muted` por `text-muted-foreground` em todos os arquivos da aplicação (≈ 34 ocorrências em 17 arquivos: páginas de `overview`, `team`, `admin`, `my-goals`, `auth/error`, `login-card` e os novos componentes da Fase 4) — `text-muted-foreground` já resolve corretamente para `#6B7280`, sem necessidade de criar um novo token
- `bg-muted`/`text-muted-foreground` usados internamente pelos componentes shadcn (`badge`, `button`, `table`, `dialog`, `skeleton`, `avatar`) **não foram alterados** — eles já usavam os nomes corretos e dependem do tom claro (`#F8F9FA`) para hover/fundo

### Validação
- `npx tsc --noEmit` — sem erros
- `npm run build` — build de produção concluído com sucesso, todas as 13 rotas geradas
- Conferido o CSS compilado servido pelo dev server: `.text-muted-foreground { color: var(--muted-foreground) }` e `--muted-foreground: #6B7280` — contraste correto confirmado

---

## Fase 5 — Minha Equipe (visão do gestor sobre subordinados) — Concluída em 2026-06-08

### O que foi feito

| Item | Arquivo |
|------|---------|
| Novas políticas RLS — gestores podem ver metas/histórico dos subordinados diretos | migração `add_manager_team_select_policies` (Supabase) |
| Componente `TeamMemberCard` — card do colaborador com progresso consolidado, lista expansível de metas e ação "Cobrar lançamento" | `app/(authenticated)/team/_components/team-member-card.tsx` |
| Página "Minha Equipe" reescrita — lista os subordinados diretos com indicadores de progresso | `app/(authenticated)/team/page.tsx` |

### Decisões técnicas tomadas na Fase 5
- **Políticas RLS por papel, espelhando as de `director`**: a política `goals_manager_select` original restringia o gestor a `owner_id = auth.uid()` (só as próprias metas). Foram criadas `goals_manager_select_team` e `goal_history_manager_select_team`, usando a função já existente `get_subordinate_ids(auth.uid())` para liberar leitura das metas e do histórico dos subordinados diretos — sem alterar as políticas existentes (políticas de SELECT são combinadas com OR no Postgres)
- **Subordinados diretos via `profiles.superior_id = auth.uid()`**: como a política `profiles_select_authenticated` já libera leitura de todos os perfis para usuários autenticados, a consulta direta dispensou uma chamada RPC
- **"Sem lançamento" calculado por presença em `goal_history`**: para cada meta do subordinado, verifica-se se existe ao menos um registro em `goal_history` — se não houver, a meta recebe o badge "Sem lançamento" e entra na contagem do botão "Cobrar lançamento"
- **"Cobrar lançamento" como link `mailto:`**: gera um e-mail pré-preenchido (assunto + corpo listando as metas pendentes) para o endereço do subordinado — solução leve que não exige sistema de notificações/e-mail transacional nesta fase
- **Reaproveitamento total dos utilitários e padrões visuais de gamificação** (`goalColor`, `goalTextClass`, `calcProgress`, `formatGoalValue`, badges de período) — mesma identidade visual das telas "Visão Geral" e "Minhas Metas"
- **Cálculo do indicador consolidado replicado em JS** (igual à Fase 4): `Σ (atual/meta × peso) / Σ peso` sobre as metas `2026-ANUAL` de cada subordinado

### Validação
- Criada rota temporária `/dev-preview/team` (whitelisted no middleware) com 4 colaboradores mockados cobrindo as faixas de progresso 96% 🏆, 65%, 28% e 0% (sem metas) e metas com/sem lançamento — confirmado via HTML renderizado: badges de percentual, troféu (≥ 90%), badge "Sem lançamento" e botão "Cobrar lançamento (N)" presentes e corretos. Rota e whitelist removidas após validação
- `npx tsc --noEmit` — sem erros
- `npm run build` — build de produção concluído com sucesso, 13 rotas geradas
- Confirmado no banco: única conta com papel de gestor (a própria usuária) não possui subordinados diretos cadastrados — a tela exibe corretamente o estado vazio "Você ainda não possui subordinados diretos cadastrados"

### Próximo passo
- Cadastrar subordinados reais (Admin → Usuários, vinculando `superior_id`) para validar o fluxo de ponta a ponta em produção
- Considerar evoluir "Cobrar lançamento" para notificação in-app ou e-mail transacional, caso o `mailto:` se mostre insuficiente no uso real

---

## Manutenção — Admin: mockup + acesso ceo (2026-06-09)

### Problema
A página "Configuração (Admin)" estava inacessível porque a role do único usuário cadastrado era `manager` — o guard das páginas admin (`/admin/goals`, `/admin/users`) redireciona para `/dashboard` se role não for `admin` nem `ceo`. Além disso, o sidebar tinha um link "Configurações" apontando para `/admin/settings` (rota inexistente).

### Correções aplicadas

| Arquivo | Mudança |
|---------|---------|
| Supabase `profiles` | Role `manager` → `ceo` via SQL UPDATE |
| `components/layout/app-sidebar.tsx` | Adicionado `"ceo"` nas roles de "Usuários" e "Metas"; removido item "Configurações" (link quebrado `/admin/settings`) |
| `app/(authenticated)/admin/_components/goals-table.tsx` | Quando `goals.length === 0`: exibe 4 linhas de exemplo (opacity-50, pointer-events-none) + banner âmbar explicativo |
| `app/(authenticated)/admin/_components/users-table.tsx` | Quando `users.length === 0`: exibe 3 linhas de exemplo (opacity-50, pointer-events-none) + banner âmbar explicativo |

### Comportamento resultante
- Role `ceo` vê no sidebar: Visão Geral, Minhas Metas, Minha Equipe, Usuários, Metas
- Admin pages já permitiam `ceo` no server-side guard (`role !== 'admin' && role !== 'ceo'`) — sidebar só precisava expor os links
- Tabelas de metas e usuários mostram mockup realista quando não há dados reais cadastrados; ao cadastrar o primeiro item real, o mockup desaparece automaticamente
- Commit `051c17e` em `main`; deploy Vercel automático

---

## Fase 6 — Polimento e Observabilidade — Concluída em 2026-06-09

### Itens entregues

| Item do plano original | Status | Detalhe |
|------------------------|--------|---------|
| Integração Sentry | ⏳ Pendente | Requer criação de conta no Sentry.io e DSN; documentado abaixo |
| Notificações — alerta quando meta < X% | ✅ Concluído | `GoalAlertsPanel` in-app em `/my-goals` |
| Exportação PDF do painel do CEO / Relatórios | ✅ Concluído | `@media print` + botão "Imprimir / PDF" em `/reports` |
| Ajustes de acessibilidade | ✅ Concluído | Skip nav, aria-current, aria-label, aria-live, aria-hidden |
| Vercel Analytics | ✅ Concluído | `@vercel/analytics` instalado e ativado no root layout |

---

### Parte 1 — Relatórios — Concluída em 2026-06-09

### O que foi feito

| Item | Arquivo |
|------|---------|
| Página `/reports` (CEO + admin) com fetch de todas as metas 2026 | `app/(authenticated)/reports/page.tsx` |
| Componente `ReportsView` — filtro por período, cards de resumo, tabela, exportação CSV | `app/(authenticated)/reports/_components/reports-view.tsx` |

### Funcionalidades
- **Cards de resumo:** total de metas, progresso consolidado anual ponderado (Σ atual/meta × peso / Σ peso), metas em risco (< 50%), sem lançamento
- **Filtro por período:** Todas / Anual / T1 / T2 / T3 / T4 (client-side, sem round-trip)
- **Tabela completa:** título, responsável, departamento, período, meta, atual, peso, progresso (% + mini barra) e status do lançamento
- **Exportar CSV:** BOM UTF-8 para compatibilidade com Excel; habilitado apenas quando há dados reais
- **Mockup:** quando não há metas cadastradas, exibe 6 linhas de exemplo (opacity-50, non-interactive) + banner âmbar
- Commit `8bdf9f1` em `main`; deploy Vercel automático

### Decisões técnicas
- Filtro client-side: o dataset de uma empresa como a Mauá (≤ 100 metas) cabe em memória sem paginação
- BOM UTF-8 (`﻿`) no CSV: necessário para o Excel no Windows interpretar acentos corretamente sem precisar de "Importar dados"
- Relações `owner`/`department` normalizadas de array → objeto único (padrão PostgREST + Supabase JS)
- Barra de progresso inline (16px) por linha: faz a tabela ser "lida" visualmente sem precisar abrir cada registro

---

### Parte 2 — Notificações, Print/PDF, Analytics, Acessibilidade — Concluída em 2026-06-09

#### O que foi feito

| Item | Arquivo |
|------|---------|
| Vercel Analytics integrado | `app/layout.tsx` — `import { Analytics } from "@vercel/analytics/react"` + `<Analytics />` |
| Componente `GoalAlertsPanel` | `components/alerts/goal-alerts-panel.tsx` |
| Alertas computados e injetados na página Minhas Metas | `app/(authenticated)/my-goals/page.tsx` |
| Print CSS global | `app/globals.css` — bloco `@media print` |
| Botão "Imprimir / PDF" nos Relatórios | `app/(authenticated)/reports/_components/reports-view.tsx` |
| Acessibilidade: skip nav, aria-current, aria-label, aria-hidden | `app/(authenticated)/layout.tsx`, `components/layout/app-sidebar.tsx`, `reports-view.tsx` |

#### Painel de Alertas — GoalAlertsPanel
- **3 tipos de alerta**, computados no servidor (server component `my-goals/page.tsx`), passados como props ao client component:
  - `"no-history"` — meta sem nenhum lançamento e cujo período **não** é o trimestre atual (vermelho)
  - `"quarter-pending"` — meta do **trimestre atual** sem lançamento (âmbar)
  - `"at-risk"` — meta anual com progresso **< 50%** (laranja)
- Trimestre atual calculado em runtime via `new Date().getMonth()` (dinâmico — sem hardcode)
- Dismissível via botão `×` (state local); reexibe a cada carregamento de página (sem persistência de dismiss — intenção: alertar sempre que a condição existir)
- `role="alert"` + `aria-live="polite"` para leitores de tela

#### Print / PDF
- `@media print` em `globals.css`: oculta `aside` (sidebar) e elementos com classe `.no-print`, remove `margin-left`, define `@page { size: A4 landscape; margin: 1.2cm }`, reseta truncamento em células da tabela
- Botão "Imprimir / PDF" em `/reports` chama `window.print()` — usuário pode escolher "Salvar como PDF" no diálogo do navegador
- Filtros e botão de exportação têm classe `no-print` → não aparecem no impresso

#### Melhorias de Acessibilidade
| Melhoria | Onde |
|----------|------|
| Skip navigation link ("Ir para o conteúdo principal") | `app/(authenticated)/layout.tsx` — aparece apenas no foco (`focus:not-sr-only`) |
| `id="main-content"` + `tabIndex={-1}` no `<main>` | `app/(authenticated)/layout.tsx` |
| `aria-label="Navegação principal"` no `<nav>` | `app-sidebar.tsx` |
| `aria-current="page"` no link ativo | `app-sidebar.tsx` |
| `aria-hidden="true"` nos ícones decorativos SVG | `app-sidebar.tsx` |
| `aria-label="Sair da conta"` no botão de logout | `app-sidebar.tsx` |
| `aria-pressed` nos botões de filtro de período | `reports-view.tsx` |
| `aria-label="Imprimir relatório como PDF"` | `reports-view.tsx` |

#### Sentry — Pendente (requer conta externa)
Para integrar o Sentry, será necessário:
1. Criar conta em [sentry.io](https://sentry.io) e criar projeto "Next.js"
2. Obter o DSN do projeto
3. `npm install @sentry/nextjs`
4. Executar `npx @sentry/wizard@latest -i nextjs` (configura automaticamente `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` e `next.config.ts`)
5. Adicionar `SENTRY_DSN` nas variáveis de ambiente da Vercel
6. Testar com `Sentry.captureException(new Error("teste"))` em uma rota protegida

#### Decisões técnicas
- `@vercel/analytics` sem configuração adicional — funciona automaticamente em projetos Vercel via `NEXT_PUBLIC_VERCEL_*` env vars injetadas automaticamente no build
- Alertas computados no servidor (não client) → zero JS extra para cálculo; só o dismiss é client-side
- Print CSS em `globals.css` (não em módulo por rota) — garante que o comportamento de impressão seja consistente em toda a aplicação sem riscos de "esqueceu de importar"
- Commit `f1903ac` em `main`; deploy Vercel automático

---

## Fase 7 — Subordinados reais, audit_log, ProgressRing, EvidenceUpload, tabela comparativa — Concluída em 2026-06-09

### Itens do backlog implementados

| Item | Prioridade | Status |
|------|-----------|--------|
| Sentry (infra + global-error) | Alta | ✅ Concluído (aguarda DSN) |
| Subordinados placeholder + superior_id | Alta | ✅ Concluído |
| audit_log: trigger + página /admin/audit | Média | ✅ Concluído |
| Tabela comparativa de gestores em /team | Média | ✅ Concluído |
| EvidenceUpload: bucket Storage + upload | Baixa | ✅ Concluído |
| ProgressRing: componente SVG circular | Baixa | ✅ Concluído |

### O que foi feito

| Item | Arquivo |
|------|---------|
| `sentry.client.config.ts` — Replay integration, habilitado só com DSN | `sentry.client.config.ts` |
| `sentry.server.config.ts` — server-side tracing | `sentry.server.config.ts` |
| `sentry.edge.config.ts` — edge runtime tracing | `sentry.edge.config.ts` |
| `global-error.tsx` — Error Boundary global com captura Sentry | `app/global-error.tsx` |
| `next.config.ts` atualizado com `withSentryConfig` + hostnames Storage | `next.config.ts` |
| Drop FK `profiles_id_fkey` → permite profiles `is_placeholder=true` | migration `drop_profiles_auth_fk_for_placeholders` |
| Função `get_subordinate_ids` atualizada (recursiva) | migration `drop_profiles_auth_fk_for_placeholders` |
| 12 profiles placeholder inseridos (3 diretores + 9 gestores) | Supabase `execute_sql` |
| Migration `audit_log` triggers (INSERT/UPDATE/DELETE em goals + goal_history) | migration `add_audit_log_triggers` |
| Bucket Supabase Storage `evidence` (privado, 10 MB, PDF/imagens) | migration `create_evidence_storage_bucket` |
| Página `/admin/audit` com tabela filtrável por entidade + expansão old/new value | `app/(authenticated)/admin/audit/page.tsx` + `_components/audit-log-view.tsx` |
| Link "Auditoria" na sidebar (role admin/ceo) | `components/layout/app-sidebar.tsx` |
| `TeamComparisonTable` — tabela comparativa ordenável em /team | `app/(authenticated)/team/_components/team-comparison-table.tsx` |
| Integração da `TeamComparisonTable` na página /team | `app/(authenticated)/team/page.tsx` |
| `ProgressRing` — SVG circular com cor por faixa, transição CSS | `components/ui/progress-ring.tsx` |
| `GoalCard` atualizado: ProgressRing substitui barra linear horizontal | `app/(authenticated)/my-goals/_components/goal-card.tsx` |
| `GoalEntryDialog` atualizado: botão "Anexar arquivo" + upload Storage + URL assinada 10 anos + fallback URL manual | `app/(authenticated)/my-goals/_components/goal-entry-dialog.tsx` |

### Hierarquia de profiles inserida no Supabase

```
Luana Gonzaga (CEO — id real, não placeholder)
├── Marcelo Ferreira (Director, Dir. Operações)     dddddd01-...-001
│   ├── André Costa (Manager, Ger. Técnica)         aaaa0001-...-001
│   ├── Fernando Rocha (Manager, Ger. Produção)     aaaa0001-...-002
│   └── Carlos Oliveira (Manager, Ger. Manutenção)  aaaa0001-...-003
├── Ana Paula Lima (Director, Dir. RH/EHS)          dddddd01-...-002
│   ├── Renata Souza (Manager, Ger. RH)             aaaa0001-...-004
│   ├── Thiago Barbosa (Manager, Ger. EHS)          aaaa0001-...-005
│   └── Mariana Santos (Manager, Ger. TI)           aaaa0001-...-006
└── Ricardo Alves Santos (Director, Dir. Comercial) dddddd01-...-003
    ├── Beatriz Carvalho (Manager, Ger. Contratos)  aaaa0001-...-007
    ├── Gustavo Mendes (Manager, Comercial Orçamento) aaaa0001-...-008
    └── Camila Rodrigues (Manager, Comercial Vendas) aaaa0001-...-009
```

Para substituir um placeholder por um usuário real: quando o funcionário fizer login com o Google corporativo, um novo registro em `profiles` é criado com o ID real do `auth.uid()`. Execute:
```sql
UPDATE public.profiles SET superior_id = '<id_real_do_superior>' WHERE id = '<id_do_profile_criado_no_login>';
DELETE FROM public.profiles WHERE id = '<id_placeholder_correspondente>'::uuid;
```

### Decisões técnicas

- **Drop FK `profiles_id_fkey`**: a coluna `is_placeholder` já existia no schema original prevendo profiles sem auth user; a FK bloqueava isso. Removida para viabilizar seed de hierarquia sem exigir contas reais
- **Sentry com guard `!!process.env.NEXT_PUBLIC_SENTRY_DSN`**: o SDK inicia silenciosamente quando sem DSN; o guard evita consumo de quota e ruído em dev local
- **Signed URL 10 anos** para evidências uploadadas: evita expiração do link sem tornar o bucket público. Quando o funcionário saír da empresa a evidência permanece acessível para auditoria
- **`TeamComparisonTable` só exibe quando `members.length > 1`**: não faz sentido comparar um único membro consigo mesmo
- **ProgressRing integrado no GoalCard**: visualização circular é mais rica que a barra linear para percentuais baixos, onde a barra é quase invisível
- **audit_log com SECURITY DEFINER**: garante que o trigger grave no `audit_log` mesmo quando o usuário não tem INSERT direto na tabela

### Sentry — Passos para ativar em produção

1. Criar conta em [sentry.io](https://sentry.io) → New Project → Next.js
2. Copiar o DSN gerado (formato `https://abc@xyz.ingest.sentry.io/123`)
3. Na Vercel: Settings → Environment Variables → adicionar `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_ORG` + `SENTRY_PROJECT`
4. Rebuild/redeploy — os 3 config files (`sentry.*.config.ts`) serão detectados automaticamente
5. Testar: abrir o app → DevTools Console → `Sentry.captureMessage("teste")` ou navegar para uma rota inexistente para forçar um 404 trackado

### Validação

- `npm run build` — build de produção concluído com sucesso, 13 rotas geradas
- Commit `06dd100` em `main`; deploy Vercel automático

---

## Sessão 2 — 2026-06-09

### Redesign da tela de login

**Solicitação:** Replicar o design do arquivo `Metas Maua/Painel_Integrado_Maua.html` na tela de login, usando o OAuth Google já implementado no lugar do botão Microsoft 365, e fundo `#364B59` (azul navy do design system).

**Arquivos alterados:**
- `components/auth/login-card.tsx` — redesign completo
- `app/layout.tsx` — adicionada fonte Montserrat via `next/font/google`

**Design implementado:**
- Fundo da página: `#364B59` (navy Estaleiro Mauá)
- Card branco, `rounded-3xl`, `max-w-[360px]`, sombra premium (`box-shadow` com `rgba(0,66,126,0.18)`)
- Animação de entrada: `fadeInScale` (scale + translateY, 0.7s cubic-bezier(0.22,1,0.36,1))
- Logo `logo-maua.png` centrada no topo
- Título `METAS ESTRATÉGICAS 2026` — Montserrat Black, uppercase, `text-[22px]`
- Subtítulo `PORTAL DO COLABORADOR` — `text-[10px]` bold uppercase, `letter-spacing: 0.25em`, slate-400
- Botão primário dark (`bg-slate-900`) `ACESSAR PAINEL →` com seta que translada no hover e hover invertido (fundo transparente, texto dark) — aciona Google OAuth
- Divisor `OU UTILIZE` — linhas laterais com texto centralizado
- Botão secundário branco `ENTRAR COM GOOGLE` — logo Google colorido + texto uppercase, border slate-100, hover `#364B59` border
- Ambos os botões disparam `signInWithOAuth({ provider: "google" })` com `hd: "estaleiromaua.ind.br"`
- Rodapé `ESTALEIRO MAUÁ S.A. · NAVAL 2026` — `text-[9px]` uppercase `letter-spacing: 0.4em`, `opacity-60`

**Decisão de não incluir campos e-mail/senha:**
O formulário de e-mail/senha do HTML de referência é um protótipo visual (autenticação fake com `password === "1"`). Como o sistema usa exclusivamente Google OAuth, os campos foram omitidos para evitar UX confuso com campos não-funcionais. Os dois botões Google refletem a hierarquia visual da referência (CTA primário escuro + alternativa branca).

### Build de produção — 2026-06-09

- Compilação Turbopack: **sucesso** em 14,6 s
- TypeScript: **passou** (17 s, zero erros)
- Static pages: **15 rotas geradas**
  - Estáticas (`○`): `/`, `/_not-found`, `/auth/error`
  - Dinâmicas (`ƒ`): `/login`, `/dashboard`, `/my-goals`, `/team`, `/overview`, `/reports`, `/admin/audit`, `/admin/goals`, `/admin/users`, `/auth/callback`
- Proxy (Middleware): ativo
- Avisos não-bloqueantes:
  - `workspace root` inferido incorretamente (múltiplos `package-lock.json` no sistema — ignorar)
  - `"middleware"` deprecated → usar `"proxy"` (aviso do Next.js 16 interno — não afeta comportamento)
- Commit: `10896d6` → deploy automático no Vercel via push `main`

### Ajuste visual login — 2026-06-09

- **Botão "ACESSAR PAINEL"**: `bg-slate-900` → `bg-[#C8D5DC]` (cinza azulado do design system, mesmo tom do nav inativo no sidebar); texto `#364B59`; hover inverte para fundo navy + texto branco
- **Rodapé**: "ESTALEIRO MAUÁ S.A. · NAVAL 2026" → `"ESTALEIRO MAUÁ"` (simplificado)
- Montserrat Black mantida no título/subtítulo
- Commit: `a20ba0d`
- **Dropdown Departamento simplificado** (commit `cf6a21c`): removida coluna "setor" ao lado do nome; exibe apenas `d.name`

### Fix — Seleção de departamento + tipografia — 2026-06-09

**Problema 1 — Validação falsa no Select Departamento:**
Passar `children` ao `<SelectValue>` do Radix UI usa um caminho de renderização alternativo que não atualiza o contexto interno de seleção do componente. Resultado: a exibição mostrava o nome, mas `field.value` não era atualizado — `z.string().uuid()` falhava na submissão. Correção: `<SelectValue placeholder="..." />` simples, sem children; Radix resolve o display pelo `textValue` do `<SelectItem>` automaticamente.

**Problema 2 — Tipografia:**
Regra do design system: Inter (padrão shadcn/ui) em toda a aplicação, inclusive login. Montserrat foi removido de `layout.tsx` e de `login-card.tsx` (inline `fontFamily`). Toda a app herda Inter pelo `inter.className` no `<html>`.

- Commit: `60776d1`

### Gestão de Usuários + Permissões por Role — 2026-06-09

**Problemas reportados:**
1. Impossível criar/adicionar usuários — não havia botão/fluxo de criação
2. Lista de usuários exibia "Nenhum usuário cadastrado" mesmo com 13 perfis no banco
3. Permissões de navegação não refletiam a hierarquia desejada por role

**Causa raiz do item 2:**
Query do Supabase usava PostgREST self-join `superior:profiles!superior_id(...)` que falha silenciosamente em alguns cenários, retornando `data: null`. Corrigido fazendo queries separadas (profiles + departments) e juntando em código JS.

**Criação de usuários (novo fluxo):**
- Botão "+ Novo Usuário" na tabela de admin
- `UserCreateDialog`: nome, e-mail, role, departamento, superior → cria perfil com `is_placeholder=true`
- `createUserProfile` server action (valida com `userCreateSchema`)
- Status badge na tabela: `Ativo` (verde) ou `Pendente login` (âmbar)
- Quando o colaborador fizer 1º login via Google: trigger `handle_new_user` herda automaticamente role/dept/superior do placeholder e converte para perfil real

**Migração Supabase (`claim_placeholder_on_signup_and_admin_insert`):**
- `handle_new_user` atualizado: ao criar auth.users, busca placeholder com mesmo e-mail; se encontrado, migra todas as referências (superior_id, goals.owner_id) e converte para perfil real
- Nova policy `profiles_ceo_all`: CEO pode INSERT/UPDATE/DELETE perfis (espelho da policy admin)

**Permissões de navegação:**

| Role | Páginas visíveis |
|---|---|
| CEO | Visão Geral · Minha Equipe · Relatórios |
| Diretor | Visão Geral · Minhas Metas · Minha Equipe · Relatórios |
| Gestor | Visão Geral · Minhas Metas |
| Admin | Todas (incluindo admin/users, admin/goals, admin/audit) |

- Commit: `24f70a0`

### Redesign "Minhas Metas" — layout executivo — 2026-06-09

**Solicitação:** Seguir padrão do Painel_Integrado_Maua.html: KPI cards no topo + tabela consolidada + linhas expansíveis com detalhamento.

**Novo arquivo:** `app/(authenticated)/my-goals/_components/goals-executive-table.tsx`

**Layout implementado:**
1. **KPI Cards** — uma card por meta, row horizontal com scroll; exibe título (caps pequeno), percentual colorido, barra de progresso. Paleta: verde ≥90%, laranja ≥60%, vermelho <60%
2. **Tabelas por período** — uma seção por período (ANUAL / Q1-Q4), header dark `#364B59`, sub-header `#2D3F4A`
   - Colunas: Objetivo Estratégico | Subpeso | Meta | Atingimento (%) | Avaliação Técnica
   - Status badges: PENDENTE (sem histórico) / EM ANDAMENTO (60-89%) / EM CONFORMIDADE (≥90%) / EM RISCO (<60%)
3. **Linha expansível** — click na linha → abre painel inline com histórico de lançamentos + botão "Lançar resultado"
4. GoalAlertsPanel mantido acima das tabelas
5. Removido: progress bar consolidado antigo, cards individuais (GoalCard)

**page.tsx** simplificado: passa `goalCards[]` para `<GoalsExecutiveTable>`
- Build: sucesso (15,7s TypeScript, 15 rotas)
- Commit: `0eeb134`

### Fix — Dialog "Nova Meta" (admin/goals) — 2026-06-09

**Problema reportado:** Campos Responsável e Departamento exibiam UUIDs truncados em vez dos nomes; diálogo pequeno demais.

**Causas:**
1. Layout `grid grid-cols-2` colocava Responsável e Departamento lado a lado (~230px cada), sem espaço suficiente para o nome
2. `SelectValue` do shadcn/ui exibia o `value` bruto (UUID) quando o `SelectContent` (portal) ainda não havia montado na primeira renderização

**Correções aplicadas em `goal-form-dialog.tsx`:**
- `max-w-lg` → `max-w-xl` para o dialog
- Responsável e Departamento movidos para linhas independentes (largura total)
- `SelectValue` com lookup explícito (`profiles.find(p => p.id === field.value)?.name`) para garantir exibição do nome independente do ciclo de vida do portal
- Dropdown de Responsável mostra nome + e-mail; de Departamento mostra nome + setor
- Grid Período/Meta/Unidade ajustado para `grid-cols-[1fr_1.5fr_1fr]`
- Build: sucesso (9,8 s compile, TypeScript OK, 15 rotas)
- Commit: `83172ab`

### Fix — UUID inválido ao criar usuário + seleção nos Selects — 2026-06-09

**Problema reportado:** Ao tentar criar um novo usuário em `/admin/users`, mensagem "Invalid UUID" aparecia mesmo com campos preenchidos. Além disso, os Selects de departamento e superior não exibiam o valor selecionado corretamente.

**Causas:**
1. `z.string().uuid()` do Zod v4 verifica bits de versão e variante do RFC 4122. Placeholders inseridos manualmente (`aaaa0001-0000-0000-0000-000000000001`, `dddddd01-...`) não passam nesse check por não seguir o formato de versão padrão.
2. `<SelectValue>` com `children` quebra o tracking interno de seleção do Radix UI (já conhecido do fix anterior em `goal-form-dialog`).

**Correções:**

| Arquivo | Mudança |
|---------|---------|
| `lib/schemas/user.ts` | Criado helper `flexUuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)` — aceita qualquer UUID bem-formatado sem verificar bits de versão/variante. Usado em `userUpdateSchema` e `userCreateSchema` para `department_id` e `superior_id` |
| `lib/schemas/goal.ts` | `department_id`: `z.string().uuid()` → mesmo padrão regex `flexUuid` |
| `user-create-dialog.tsx` | `<SelectValue>` substituído por `<span>` custom dentro do `<SelectTrigger>` com lookup por array (`departments.find(...)?.name` e `allProfiles.find(...)?.name`) — idêntico ao workaround do Radix já aplicado em outros dialogs |
| `user-edit-dialog.tsx` | Mesmo fix de `<span>` custom nos Selects de departamento e superior |

**Nav Admin expandido:**
Luana (role `admin`) não via Minhas Metas, Minha Equipe e Relatórios pois essas rotas não incluíam `"admin"` na lista de roles do sidebar.

| Arquivo | Mudança |
|---------|---------|
| `components/layout/app-sidebar.tsx` | `"Minhas Metas"` → roles `["director", "manager", "admin"]`; `"Minha Equipe"` → roles `["ceo", "director", "admin"]`; `"Relatórios"` → roles `["ceo", "director", "admin"]` |

**Permissões Admin atualizadas:**

| Role | Páginas visíveis |
|---|---|
| CEO | Visão Geral · Minha Equipe · Relatórios |
| Diretor | Visão Geral · Minhas Metas · Minha Equipe · Relatórios |
| Gestor | Visão Geral · Minhas Metas |
| **Admin** | **Visão Geral · Minhas Metas · Minha Equipe · Relatórios · Metas · Usuários · Auditoria** |

- Build: sucesso (18,4 s compile, TypeScript OK, 15 rotas)
- Commit: `bac64dd`

### Fix — "Erro ao salvar meta" ao criar/editar metas — 2026-06-09

**Problema reportado:** Clicar em "Criar Meta" em `/admin/goals` retornava toast de erro mesmo com todos os campos preenchidos corretamente.

**Diagnóstico:**
Duas migrações distintas criaram funções de audit com schemas diferentes para a tabela `audit_log`. A coluna `entity_type` existe nas funções antigas mas **não existe** na tabela real:

| Trigger | Função | Status |
|---|---|---|
| `goal_audit_trigger` (goals) | `log_goal_change()` | Referenciava `entity_type` (inexistente) → quebrava todo INSERT/UPDATE/DELETE em goals |
| `goal_history_audit_trigger` | `log_goal_history_change()` | Mesma referência → quebrava `createGoalEntry` (lançar resultado) |
| `goals_audit` | `audit_goals_change()` | Schema correto — mantido |

**Correções no Supabase (sem mudança de código):**
- Migration `drop_duplicate_broken_goal_audit_trigger`: DROP TRIGGER `goal_audit_trigger` + DROP FUNCTION `log_goal_change()`
- Migration `fix_log_goal_history_change_entity_type`: CREATE OR REPLACE FUNCTION `log_goal_history_change()` removendo `entity_type`, incorporando o tipo na string de `action` (`INSERT_GOAL_HISTORY`, etc.)

**Resultado:** goals INSERT/UPDATE/DELETE funcionando; lançamento de resultados em goal_history funcionando; audit_log gravando corretamente via `audit_goals_change`.

### Reestruturação do menu "Metas" em sub-menus — 2026-06-09

**Solicitação:** Criar 2 sub-menus dentro de "Metas":
1. **Atualização de Metas** — todos os roles; obrigatoriedade de upload de evidência
2. **Criação de Metas** — somente Admin; formulário Nova Meta já existente

**Arquivos alterados:**

| Arquivo | Mudança |
|---------|---------|
| `components/layout/app-sidebar.tsx` | Removido item "Minhas Metas" standalone; adicionado `NavItem` com `children[]` para "Metas"; sub-itens "Atualização de Metas" (`/my-goals`, todos os roles) e "Criação de Metas" (`/admin/goals`, admin only). Rótulo do grupo não é link — sub-itens indentados com `pl-11`. Role label no rodapé da sidebar exibido corretamente. |
| `lib/schemas/goal-entry.ts` | `evidence_url`: removido `.optional().or(z.literal(""))` → agora `.min(1).url()` — campo obrigatório |
| `app/(authenticated)/my-goals/_components/goal-entry-dialog.tsx` | Label "Evidência (obrigatória)" em vermelho; upload como ação principal com ícone 📎; feedback ✓ + nome do arquivo após upload bem-sucedido; URL como campo alternativo (sem duplo FormDescription) |
| `app/(authenticated)/my-goals/page.tsx` | Título/metadata: "Minhas Metas" → "Atualização de Metas" |

**Permissões de navegação atualizadas:**

| Role | Páginas visíveis |
|---|---|
| CEO | Visão Geral · Minha Equipe · Relatórios · Metas > Atualização |
| Diretor | Visão Geral · Minha Equipe · Relatórios · Metas > Atualização |
| Gestor | Visão Geral · Metas > Atualização |
| Admin | Visão Geral · Minha Equipe · Relatórios · Metas > Atualização + Criação · Usuários · Auditoria |

- Build: sucesso (14,3 s compile, TypeScript OK, 15 rotas)
- Commit: `d3e6a31`

---

## Sessão 3 — 2026-06-09

### Correções

#### 1. Nome do usuário logado em "Atualização de Metas"

**Problema:** A página `/my-goals` exibia só o título genérico "Atualização de Metas" sem identificar a quem pertenciam as metas.

**Solução:** `my-goals/page.tsx` — busca do perfil (`profiles.name`) do usuário autenticado imediatamente após o `auth.getUser()`. Nome exibido como linha intermediária entre o título `<h1>` e o subtítulo descritivo, usando a cor primária `#364B59` para hierarquia visual.

#### 2. Erro ao criar usuário ("Erro ao criar usuário. Verifique os campos.")

**Causa raiz:** A coluna `profiles.id` era `uuid NOT NULL` sem valor default. O Server Action `createUserProfile` fazia INSERT sem fornecer `id`, causando violação de NOT NULL.

**Solução:** Migration Supabase `profiles_id_default_gen_random_uuid`:
```sql
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
```
O Postgres agora gera automaticamente um UUID v4 para cada perfil placeholder criado.

**Nota:** `profiles.id` não tem FK para `auth.users` — é chave primária livre. O vínculo entre placeholder e usuário real ocorre via `email` quando o colaborador faz o primeiro login.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `app/(authenticated)/my-goals/page.tsx` | Busca `profiles.name` do usuário logado; exibe nome abaixo do `<h1>` |
| Supabase migration | `profiles.id SET DEFAULT gen_random_uuid()` |

- Build: sucesso (TypeScript OK, 15 rotas)
- Commit: `00e64f0`
