# StudesDk Monorepo

Monorepo contendo as aplicações web (desktop) e mobile (PWA) do StudesDk.

## Estrutura

```
studesk-monorepo/
├── apps/
│   ├── web/           # Aplicação web desktop (Next.js) - Backend + Frontend
│   └── mobile/        # PWA mobile/tablet (Next.js) - Frontend apenas
├── packages/
│   ├── database/      # Prisma schema e cliente compartilhado
│   ├── types/         # TypeScript types compartilhados
│   └── ui/            # Componentes UI compartilhados
└── package.json
```

## 🏗️ Arquitetura

### Modelo Cliente-Servidor

O projeto usa uma arquitetura **cliente-servidor separada**:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  MOBILE (PWA) - Frontend                        │
│  http://localhost:3031                          │
│                                                 │
│  • Interface mobile/tablet                      │
│  • Consome APIs via HTTP                        │
│  • Sem acesso direto ao banco                   │
│                                                 │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP Requests
                   │ (CORS configurado)
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│  WEB - Backend + Frontend                       │
│  http://localhost:3030                          │
│                                                 │
│  • Interface desktop                            │
│  • API Routes (/api/*)                          │
│  • Acesso direto ao PostgreSQL                  │
│  • NextAuth (sessões)                           │
│                                                 │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
           ┌───────────────┐
           │  PostgreSQL   │
           │  (Port 5433)  │
           └───────────────┘
```

### CORS - Comunicação Cross-Origin

O mobile faz requisições cross-origin para o backend web. **Todas as rotas de API** que o mobile consome devem ter headers CORS configurados:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
    ? 'https://mobile.studesk.com'
    : 'http://localhost:3031',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const data = await fetchData()
  return NextResponse.json({ success: true, data }, { headers: corsHeaders })
}
```

**Rotas com CORS implementado:**
- ✅ `/api/dashboard/materias-do-dia` (GET)
- ✅ `/api/dashboard/stats` (GET)
- ✅ `/api/dashboard/adicionar-tempo` (POST)
- ✅ `/api/dashboard/adicionar-questoes` (POST)
- ✅ `/api/disciplinas` (GET)
- ✅ `/api/disciplinas/[id]` (GET)
- ✅ `/api/disciplinas/[id]/materiais` (GET)
- ✅ `/api/materiais` (GET)

## Quick Start

```bash
# Instalar dependências
pnpm install

# Desenvolvimento (ambos apps)
pnpm dev

# Desenvolvimento (apenas web)
pnpm dev:web

# Desenvolvimento (apenas mobile)
pnpm dev:mobile

# Build de produção
pnpm build
```

## Apps

### Web (Desktop) - Backend + Frontend
- **Porta:** 3030
- **URL:** http://localhost:3030
- **Função:** Interface desktop completa + API Backend
- **Banco:** PostgreSQL direto via Prisma
- **Auth:** NextAuth com sessões
- **Arquitetura:** Monolito (frontend + backend juntos)

### Mobile (PWA) - Frontend apenas
- **Porta:** 3031
- **URL:** http://localhost:3031
- **Função:** Interface mobile/tablet
- **Backend:** Consome APIs do app web via HTTP
- **Auth:** Compartilha sessão com web via cookies
- **Instalável:** PWA para Android/iOS

## 📱 Estrutura de Rotas Mobile

```
Mobile App (localhost:3031)
├── /hoje              ← Atividades do dia (PRINCIPAL)
├── /dashboard         ← Em desenvolvimento (placeholder)
├── /materiais         ← Listagem de materiais
├── /disciplinas       ← Listagem de disciplinas
├── /agenda            ← Agenda semanal/mensal
├── /login             ← Autenticação
└── /register          ← Registro
```

### Navegação Bottom (Mobile)

```
┌─────────────────────────────────────────┐
│                                         │
│           Conteúdo da Página            │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  [🏠 Hoje] [📚 Materiais]               │
│  [📖 Disciplinas] [📅 Agenda]           │
└─────────────────────────────────────────┘
```

## Packages

### @studesk/database
Prisma schema e cliente compartilhado entre apps.

### @studesk/types
TypeScript types compartilhados (User, Disciplina, etc).

### @studesk/ui
Componentes UI reutilizáveis (Button, Input, etc).

## Comandos

```bash
pnpm dev              # Rodar todos os apps
pnpm build            # Build de todos os apps
pnpm lint             # Lint de todos os apps
pnpm clean            # Limpar builds e caches
```

## 🔧 Desenvolvimento

### Adicionando Nova Rota API para Mobile

Ao criar uma nova rota que o mobile vai consumir:

1. **Criar rota no projeto web** (studesk/src/app/api/...)
2. **Adicionar headers CORS** (copiar padrão acima)
3. **Implementar método OPTIONS** (para preflight)
4. **Formato de resposta padronizado:**
   ```typescript
   { success: boolean, data?: T, error?: string }
   ```
5. **Testar CORS:** Fazer requisição do mobile

### Cliente API Mobile

O mobile usa um cliente centralizado:

```typescript
// apps/mobile/src/lib/api-client.ts
import { apiClient } from '../api-client'

// Exemplo de uso
const response = await apiClient.get('/disciplinas')
const response = await apiClient.post('/material/create', { nome: 'PDF' })
```

## Tecnologias

- **Turborepo** - Build system
- **pnpm** - Package manager
- **Next.js 15** - Framework (ambos apps)
- **TypeScript** - Type safety
- **Prisma** - ORM (apenas web)
- **PostgreSQL** - Banco de dados (porta 5433)
- **NextAuth** - Autenticação compartilhada

## 📚 Documentação Adicional

- `apps/mobile/README.md` - Documentação específica do mobile
- `apps/mobile/DASHBOARD_IMPLEMENTADO.md` - Status do dashboard mobile
- `apps/mobile/MODULO_1_COMPLETO.md` - Módulo 1 implementado
