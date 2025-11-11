# Arquitetura do StudesDk

## Visão Geral

StudesDk é uma plataforma de gerenciamento de estudos construída com Next.js 15 usando arquitetura em camadas (Domain-Driven Design simplificado).

## Stack Tecnológico

- **Framework**: Next.js 15.3.2 (App Router, React Server Components)
- **Database**: PostgreSQL + Prisma ORM
- **Frontend**: React 19, Tailwind CSS, Radix UI
- **PDF**: PDFTron WebViewer, PDF.js
- **Auth**: NextAuth.js

## Arquitetura em Camadas

```
┌─────────────────────────────────────────┐
│         Interface Layer (UI)            │
│  /src/app + /src/components             │
│  - Next.js App Router                   │
│  - React Server/Client Components       │
│  - Server Actions                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Application Layer (Services)       │
│  /src/application/services              │
│  - Business Logic                       │
│  - Orchestration                        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       Domain Layer (Entities)           │
│  /src/domain/entities                   │
│  - Core Business Objects                │
│  - Domain Models                        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Infrastructure (Prisma/DB)         │
│  /prisma                                │
│  - Database Schema                      │
│  - Migrations                           │
└─────────────────────────────────────────┘
```

## Estrutura de Diretórios

```
/src
├── app/                          # Next.js App Router
│   ├── (authenticated)/         # Rotas protegidas por auth
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── disciplinas/        # CRUD de disciplinas
│   │   ├── material/[id]/      # Visualização de PDF
│   │   ├── plano-estudos/      # Gerenciamento de planos
│   │   ├── hoje/               # Visão do dia
│   │   └── agenda/             # Calendário
│   ├── api/                    # API Routes
│   │   ├── upload/            # Upload de arquivos
│   │   ├── static/            # Servir arquivos estáticos
│   │   ├── pdf/               # Processamento de PDF
│   │   └── cache/             # Estatísticas de cache
│   └── page.tsx               # Landing page
│
├── components/                  # Componentes React
│   ├── ui/                    # Componentes base (Radix)
│   ├── dashboard/             # Componentes do dashboard
│   ├── disciplina/            # Componentes de disciplinas
│   ├── material-estudo/       # Componentes de materiais/PDF
│   ├── plano-estudos/         # Componentes de planos
│   └── layout/                # Header, Sidebar, AppLayout
│
├── interface/actions/          # Server Actions (Next.js)
│   ├── disciplina/            # CRUD disciplinas
│   ├── material-estudo/       # CRUD materiais
│   ├── plano-estudo/          # Operações de planos
│   └── dashboard/             # Actions do dashboard
│
├── application/services/       # Lógica de negócio
│   ├── disciplina.service.ts
│   ├── material-estudo.service.ts
│   └── plano-estudo.service.ts
│
├── domain/entities/            # Entidades de domínio
│   ├── Disciplina.ts
│   ├── MaterialEstudo.ts
│   └── PlanoEstudo.ts
│
├── contexts/                   # React Contexts
├── utils/                      # Funções utilitárias
└── middleware.ts              # Auth middleware

/prisma
├── schema.prisma              # Schema do banco
└── migrations/                # Migrações

/public
├── uploads/                   # PDFs enviados
└── lib/webviewer/            # Assets PDFTron
```

## Modelos de Dados (Principais)

### Core Entities

```prisma
User
├── email, name, password
├── → Disciplinas (created)
├── → MaterialEstudo (owned)
└── → PlanoEstudo (created)

Disciplina
├── nome, cor, icone
├── → DisciplinaMaterial (many-to-many)
└── → DisciplinaSemana (em planos)

MaterialEstudo
├── titulo, urlPdf, totalPaginas
├── paginaAtual (progresso)
├── → HistoricoLeitura (sessões)
└── → DisciplinaMaterial (many-to-many)

PlanoEstudo
├── titulo, dataInicio, dataFim
├── → SemanaEstudo (ciclos)
└── → DisciplinaSemana (distribuição)
```

### Plano de Estudos (Hierarquia)

```
PlanoEstudo
  └── SemanaEstudo (Ciclos)
       ├── dataInicio, dataFim
       └── DisciplinaSemana (Distribuição)
            ├── disciplinaId
            ├── horasPlanejadas
            ├── questoesRealizadas
            └── progresso
```

### Sistema de Leitura

```
MaterialEstudo
  └── HistoricoLeitura (Sessões)
       ├── dataLeitura
       ├── paginaInicial, paginaFinal
       ├── tempoSessao (minutos)
       └── tempoReal (tempo efetivo de estudo)
```

## Fluxos Principais

### 1. Upload e Visualização de PDF

```
User → Upload Form
  ↓
POST /api/upload
  ↓ (salva arquivo)
public/uploads/[hash]-[filename].pdf
  ↓ (cria registro)
MaterialEstudo (DB)
  ↓ (navega para)
/material/[id]
  ↓ (carrega)
PDFTron WebViewer
  ↓ (tracking)
HistoricoLeitura (sessões)
```

### 2. Criar Plano de Estudos

```
User → Wizard Plano
  ↓ (escolhe modo)
[Simples|Rápido|Ágil|Disciplinas]
  ↓ (preenche)
- Título, datas
- Disciplinas
- Horas/semana
  ↓
Server Action: create()
  ↓
Prisma Transaction:
  - PlanoEstudo
  - SemanaEstudo (N semanas)
  - DisciplinaSemana (distribuição)
  ↓
Redirect → /plano-estudos
```

### 3. Dashboard - Materiais do Dia

```
Dashboard Page
  ↓
Server Action: materias-do-dia()
  ↓
Query:
  - SemanaEstudo (atual)
  - DisciplinaSemana (da semana)
  - MaterialEstudo (por disciplina)
  ↓
Render: Cards com disciplinas do dia
  + progresso
  + tempo planejado vs realizado
```

## Padrões e Convenções

### Server Actions

Todas as operações de dados usam Server Actions (não API Routes):

```typescript
// /src/interface/actions/[domain]/action.ts
'use server'

export async function actionName(data: Schema) {
  // 1. Validação
  const validated = schema.parse(data)

  // 2. Chamada ao serviço
  const result = await service.method(validated)

  // 3. Retorno
  return { success: true, data: result }
}
```

### Serviços (Application Layer)

```typescript
// /src/application/services/entity.service.ts
export class EntityService {
  async create(data: CreateDto): Promise<Entity> {
    // Lógica de negócio
    return await prisma.entity.create({ data })
  }
}
```

### Componentes

- **Server Components**: Padrão para pages e layouts
- **Client Components**: Quando necessário interatividade (`'use client'`)
- **Radix UI**: Base para todos os componentes UI

### Naming Conventions

- **Arquivos**: `kebab-case.tsx`
- **Componentes**: `PascalCase`
- **Actions**: `camelCase`
- **Tipos**: `PascalCase` + sufixo (`CreateDto`, `UpdateDto`)

## Sistema de PDF

### PDFTron WebViewer

```typescript
// Inicialização
WebViewer({
  path: '/lib/webviewer',
  initialDoc: pdfUrl,
}, viewerRef.current)

// Tracking de progresso
instance.Core.documentViewer.addEventListener('pageNumberUpdated', (pageNumber) => {
  // Atualiza paginaAtual no MaterialEstudo
  updateProgress(materialId, pageNumber)
})
```

### Cache de Texto

```prisma
ChunkCache
  ├── materialId
  ├── paginaInicio, paginaFim
  ├── conteudo (texto extraído)
  └── hash (para deduplicação)
```

## Autenticação

### NextAuth.js Setup

```typescript
// app/api/auth/[...nextauth]/route.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({...})
  ],
  session: { strategy: 'jwt' }
}
```

### Proteção de Rotas

```typescript
// middleware.ts
export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/(authenticated)/:path*',
    '/dashboard/:path*',
    // ...
  ]
}
```

## Performance

### Otimizações Implementadas

1. **React Server Components**: Renderização no servidor por padrão
2. **Cache de Chunks**: Texto de PDF cacheado no DB
3. **Lazy Loading**: Componentes carregados sob demanda
4. **Parallel Data Fetching**: Múltiplas queries em paralelo

### Database Queries

```typescript
// ✅ BOM: Parallel queries
const [disciplinas, materiais] = await Promise.all([
  prisma.disciplina.findMany(),
  prisma.materialEstudo.findMany()
])

// ❌ RUIM: Sequential queries
const disciplinas = await prisma.disciplina.findMany()
const materiais = await prisma.materialEstudo.findMany()
```

## Deploy

### Build

```bash
npm run build
# 1. Copy WebViewer files
# 2. Next.js build
# 3. Setup PDF.js workers
```

### Variáveis de Ambiente (Produção)

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://app.studesk.com
NEXTAUTH_SECRET=[random-secret]
NODE_ENV=production
```

### Recomendações

- **Vercel**: Deploy automático via Git
- **PostgreSQL**: Supabase, Neon, ou Railway
- **Storage**: Vercel Blob ou S3 para PDFs (futuro)

## Troubleshooting

### Problema: WebViewer não carrega

**Causa**: Assets não copiados para `/public/lib/webviewer`

**Solução**:
```bash
npm run copy-webviewer
```

### Problema: Erro em Prisma após alteração no schema

**Solução**:
```bash
npx prisma generate
npx prisma db push
```

### Problema: PDFs não aparecem

**Causa**: URL incorreta ou arquivo não existe

**Debug**:
```bash
ls -la public/uploads/
# Verificar se o arquivo existe
```

## Próximos Passos Arquiteturais

1. **Migrar uploads para Storage externo** (Vercel Blob/S3)
2. **Implementar cache Redis** (para sessões e queries frequentes)
3. **Background jobs** (processar PDFs de forma assíncrona)
4. **Websockets** (real-time progress updates)
5. **Multi-tenancy** (suporte a workspaces/teams)

---

**Última atualização**: 2025-01-11
