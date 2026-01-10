# Arquitetura do StudesDk

## Visão Geral

StudesDk é uma plataforma de gerenciamento de estudos construída com Next.js 15 usando arquitetura em camadas (Domain-Driven Design simplificado).

## Stack Tecnológico

- **Framework**: Next.js 15.3.2 (App Router, React Server Components)
- **Database**: PostgreSQL + Prisma ORM
- **Frontend**: React 19, Tailwind CSS, Radix UI
- **PDF**: Syncfusion PDF Viewer
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
/material/[id]/syncfusion
  ↓ (carrega)
Syncfusion PDF Viewer
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

### Syncfusion PDF Viewer

```typescript
// Inicialização
<PdfViewerComponent
  id="container"
  documentPath={pdfUrl}
  resourceUrl="/api/wasm"
  pageChange={handlePageChange}
  enableAnnotation={true}
  enableTextSelection={true}
/>

// Tracking de progresso
const handlePageChange = (args: any) => {
  const currentPage = args.currentPageNumber;
  updateProgress(materialId, currentPage);
}
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
# 1. Copy PDF.js workers
# 2. Next.js build
```

### Variáveis de Ambiente (Produção)

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://app.studesk.com
NEXTAUTH_SECRET=[random-secret]
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY=[syncfusion-key]
NODE_ENV=production
```

### Recomendações

- **Vercel**: Deploy automático via Git
- **PostgreSQL**: Supabase, Neon, ou Railway
- **Storage**: Vercel Blob ou S3 para PDFs (futuro)

## Troubleshooting

### Problema: Syncfusion PDF Viewer não carrega

**Causa**: Licença trial expirada ou não configurada

**Solução**:
1. Obter chave em https://www.syncfusion.com/account/manage-trials/start-trials
2. Adicionar ao `.env.local`:
```env
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY="sua-chave-aqui"
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

## Sistema Mobile/PWA

### Arquitetura Multi-Aplicação

```
┌─────────────────────────────────────┐
│     Web App (port 3030)             │
│  - Desktop experience               │
│  - Full features                    │
│  - Syncfusion PDF Viewer            │
└─────────────────────────────────────┘
                ↓ API
┌─────────────────────────────────────┐
│   Mobile PWA (port 3031)            │
│  - Mobile-optimized UI              │
│  - Offline-first                    │
│  - IndexedDB cache                  │
│  - Syncfusion PDF Viewer            │
└─────────────────────────────────────┘
```

### Estrutura do Monorepo

```
/studesk-monorepo
├── apps/
│   ├── web/              # App original (porta 3030)
│   └── mobile/           # PWA mobile (porta 3031)
├── packages/
│   ├── database/         # Prisma shared
│   ├── types/            # TypeScript types
│   └── ui/               # Componentes compartilhados
└── pnpm-workspace.yaml
```

### Google Drive Integration

#### Autenticação Persistente

```typescript
// Verificação automática de token existente
const checkConnection = async () => {
  const response = await fetch('/api/google-drive/files')
  if (response.ok) {
    setIsConnected(true) // Token válido, pula autorização
  }
}
```

Fluxo:
1. Modal abre → mostra "Verificando conexão..."
2. Verifica se token existe no banco (campo `googleDriveAccessToken`)
3. Se existe → lista arquivos diretamente
4. Se não → mostra botão "Conectar Google Drive"

#### Download Direto do Google Drive

```typescript
// Proxy route: /api/google-drive/download-pdf
GET /api/google-drive/download-pdf?fileId=XXX
  ↓
Busca tokens do usuário no banco
  ↓
GoogleDriveService.downloadPdfBuffer(fileId)
  ↓
Retorna PDF com CORS headers
```

Benefícios:
- PDFs sempre atualizados (não depende de cópia local)
- Economiza espaço em disco
- Sem duplicação de arquivos

### Sistema de Cache Offline (IndexedDB)

#### Estrutura do Cache

```typescript
interface PdfCacheDB {
  pdfs: {
    id: string             // materialId
    data: ArrayBuffer      // PDF binário
    nome: string
    size: number
    timestamp: number      // Para LRU cleanup
    materialId: string
  }
  metadata: {
    totalSize: number
    lastCleanup: number
  }
}
```

#### Características

- **Limite**: 500MB total
- **Cleanup automático**: Remove PDFs mais antigos quando atinge limite
- **Estratégia**: LRU (Least Recently Used)
- **Indicadores visuais**:
  - Badge "Offline" (verde) quando cached
  - Badge "Online" (cinza) quando não cached
  - Botão de download (↓) / remover (🗑️)

#### API do Cache Service

```typescript
// /studesk-monorepo/apps/mobile/src/services/pdf-cache.service.ts
export const pdfCacheService = {
  // Salvar PDF no cache
  savePdfFromBlob(materialId: string, blob: Blob, nome: string): Promise<void>

  // Recuperar PDF do cache
  getPdf(materialId: string): Promise<Blob | null>

  // Buscar com fallback ao servidor
  getPdfWithFallback(materialId: string, serverUrl: string): Promise<{blob, fromCache}>

  // Verificar se existe
  hasPdf(materialId: string): Promise<boolean>

  // Remover PDF
  removePdf(materialId: string): Promise<void>

  // Estatísticas
  getStats(): Promise<{totalPdfs, totalSize, usagePercentage}>
}
```

### Fluxo de Download para Cache

```
User clica "Download" no material
  ↓
Verifica se tem fileId do Google Drive
  ↓
┌───────────────┬────────────────┐
│ TEM fileId    │ NÃO TEM fileId │
├───────────────┼────────────────┤
│ Download via  │ Download via   │
│ Google Drive  │ localhost:3030 │
│ proxy         │ /api/uploads   │
└───────────────┴────────────────┘
  ↓
Converte response para Blob
  ↓
pdfCacheService.savePdfFromBlob()
  ↓
Atualiza UI: Badge → "Offline" ✓
```

### Syncfusion no Mobile

#### Instalação

```json
// apps/mobile/package.json
"dependencies": {
  "@syncfusion/ej2-base": "^28.1.36",
  "@syncfusion/ej2-react-pdfviewer": "^28.1.36",
  // ... outros pacotes syncfusion
}
```

#### Configuração

```typescript
// apps/mobile/src/lib/syncfusion-config.ts
import { registerLicense } from '@syncfusion/ej2-base';

const SYNCFUSION_LICENSE = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY;
if (SYNCFUSION_LICENSE) {
  registerLicense(SYNCFUSION_LICENSE);
}
```

#### Componente

```typescript
// apps/mobile/src/components/pdf/SyncfusionPdfViewer.tsx
import { PdfViewerComponent, Toolbar, Magnification, Navigation, Annotation, TextReflow, ... } from '@syncfusion/ej2-react-pdfviewer';

<PdfViewerComponent
  documentPath={pdfUrl}  // Pode ser Blob URL do cache
  resourceUrl="/api/wasm/ej2-pdfviewer-lib"
  enableMagnification={true}      // Controles de zoom
  enableAnnotation={true}         // Anotações
  enableTextSelection={true}      // Seleção de texto
  enablePinchZoom={true}         // Zoom com gestos
  pageChange={handlePageChange}
  documentLoad={handleDocumentLoad}
>
  <Inject services={[Toolbar, Magnification, Navigation, Annotation, TextReflow, ...]} />
</PdfViewerComponent>
```

#### Controles de Visualização Customizados

O visualizador inclui controles customizados para melhor experiência de leitura no mobile:

**1. Modo de Ajuste (Fit Modes)**
- `fitToWidth` - Ajusta PDF à largura da tela (padrão para mobile)
- `fitToPage` - Exibe página completa
- `automatic` - Zoom 100%

```typescript
const applyFitMode = (mode: FitMode) => {
  switch (mode) {
    case 'fitToWidth':
      viewerRef.current.magnification.fitToWidth();
      break;
    case 'fitToPage':
      viewerRef.current.magnification.fitToPage();
      break;
    case 'automatic':
      viewerRef.current.magnification.zoomTo(100);
      break;
  }
};
```

**2. Modos de Leitura** (filtros visuais)
- `normal` - Sem filtros
- `sepia` - Tom sépia (reduz cansaço visual)
- `night` - Modo noturno (inverte cores)
- `gray` - Escala de cinza
- `green` - Tom verde suave

```typescript
const getFilterStyle = () => {
  let filter = `brightness(${brightness}%) contrast(${contrast}%)`;

  switch (readingMode) {
    case 'sepia': filter += ' sepia(60%)'; break;
    case 'night': filter += ' invert(90%) hue-rotate(180deg)'; break;
    case 'gray': filter += ' grayscale(100%)'; break;
    case 'green': filter += ' sepia(40%) hue-rotate(40deg) saturate(50%)'; break;
  }

  return filter;
};
```

**3. Ajustes de Brilho e Contraste**
- Brilho: 50% - 150%
- Contraste: 50% - 150%
- Valores salvos em `localStorage`

**4. Modo Reflow Mobile**
- Otimiza zoom para leitura em dispositivos móveis
- Aplica `fitToWidth()` + zoom extra de 20%
- Elimina scroll horizontal

```typescript
const toggleReflowMode = (enable: boolean) => {
  if (enable) {
    viewerRef.current.magnification.fitToWidth();
    setTimeout(() => {
      const currentZoom = viewerRef.current.magnification.zoomFactor;
      viewerRef.current.magnification.zoomTo(currentZoom * 1.2);
    }, 200);
  } else {
    viewerRef.current.magnification.fitToPage();
  }
};
```

#### Persistência de Configurações

Todas as preferências são salvas no `localStorage` do browser:

```typescript
localStorage.setItem('syncfusion-pdf-brightness', brightness.toString());
localStorage.setItem('syncfusion-pdf-contrast', contrast.toString());
localStorage.setItem('syncfusion-pdf-reading-mode', readingMode);
localStorage.setItem('syncfusion-pdf-fit-mode', fitMode);
localStorage.setItem('syncfusion-pdf-reflow-mode', isReflowMode.toString());
```

#### Interface de Controles

Os controles são acessíveis via:
1. **Botão Settings (⚙️)** no header da página
2. **Modal flutuante** com todas as opções
3. **Integração com header customizado** (não usa toolbar padrão do Syncfusion)

### API Routes Compartilhadas

#### Google Drive Routes (Web App)

```
/api/google-drive/
├── auth/              # Inicia OAuth2
├── callback/          # OAuth2 callback
├── files/             # Lista arquivos/pastas
├── import-pdf/        # Importa PDF e cria MaterialEstudo
├── download-pdf/      # Proxy de download (NEW)
└── disconnect/        # Remove tokens
```

#### CORS Configuration

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
```

**IMPORTANTE - CORS com Credentials:**

Quando usando `credentials: 'include'` em fetch requests, o header `Access-Control-Allow-Origin` **NÃO PODE** ser wildcard `*`. Deve ser a origem específica:

```typescript
// ❌ ERRO: Wildcard com credentials
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true'
}

// ✅ CORRETO: Origem específica com credentials
{
  'Access-Control-Allow-Origin': 'http://192.168.15.8:3031',
  'Access-Control-Allow-Credentials': 'true'
}
```

### Detecção Dinâmica de URLs (Rede Local)

#### Problema

O app mobile precisa se comunicar com o backend em diferentes cenários:
- **Localhost**: `http://localhost:3030` (desenvolvimento no PC)
- **Rede Local**: `http://192.168.15.8:3030` (acesso pelo celular)

URLs hardcoded causam `ERR_CONNECTION_REFUSED` quando acessado via rede.

#### Solução - API Base URL Utility

```typescript
// /studesk-monorepo/apps/mobile/src/lib/api-base-url.ts

export function getBackendBaseUrl(): string {
  // Server-side: retorna URL padrão
  if (typeof window === 'undefined') {
    return 'http://localhost:3030'
  }

  // Client-side: detecta hostname atual
  const hostname = window.location.hostname
  const protocol = window.location.protocol

  // Se for localhost, usar localhost:3030
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3030'
  }

  // Se for IP da rede, usar o mesmo IP na porta 3030
  return `${protocol}//${hostname}:3030`
}

export function getApiBaseUrl(): string {
  return `${getBackendBaseUrl()}/api`
}
```

#### Uso nos Componentes

```typescript
// PDF Download
import { getBackendBaseUrl } from '@/lib/api-base-url'

const backendUrl = getBackendBaseUrl()
const pdfUrl = `${backendUrl}/api/uploads/${path}`

// API Calls
import { getApiBaseUrl } from '@/lib/api-base-url'

const apiUrl = getApiBaseUrl()
fetch(`${apiUrl}/material/${id}/historico-leitura`, {
  credentials: 'include'
})
```

#### Arquivos Corrigidos

1. **PDF Downloads**:
   - `apps/mobile/src/app/disciplinas/[disciplinaId]/materiais/page.tsx`
   - `apps/mobile/src/app/materiais/page.tsx`

2. **Material Progress & Reading History**:
   - `apps/mobile/src/app/material/[id]/page.tsx`

3. **Google Drive Integration**:
   - `apps/mobile/src/components/materiais/google-drive-picker-mobile.tsx`

#### Comportamento

```bash
# Acesso via localhost
window.location.hostname = "localhost"
→ Backend URL: http://localhost:3030

# Acesso via rede (celular)
window.location.hostname = "192.168.15.8"
→ Backend URL: http://192.168.15.8:3030
```

#### Logs de Debug

Console mostra detecção automática:
```
🟠 [api-base-url] Detectando URL do backend: { hostname: '192.168.15.8', protocol: 'http:' }
🟠 [api-base-url] URL do backend (rede): http://192.168.15.8:3030
Baixando PDF local: http://192.168.15.8:3030/api/uploads/...
```

### Estratégia de Dados

#### Sincronização

- **API**: Mobile consome APIs do web app (localhost:3030)
- **Autenticação**: NextAuth compartilhado via cookies
- **Banco de Dados**: Mesmo PostgreSQL para ambos
- **Cache**: Apenas no mobile (IndexedDB)

#### Isolation

- Cada app tem seu próprio:
  - `node_modules/`
  - Build output (`.next/`)
  - Environment variables (`.env.local`)

- Compartilhado via packages:
  - Prisma client
  - TypeScript types
  - UI components (futuro)

### Performance Otimizations

#### Mobile-Specific

1. **Lazy Loading de PDFs**: Apenas baixa quando usuário solicita
2. **Cache LRU**: Remove automaticamente arquivos antigos
3. **Compressão**: PDFs servidos com `Cache-Control: immutable`
4. **Parallel Requests**: Download de metadados e verificação de cache em paralelo

```typescript
// Parallel data loading
const [disciplinaData, materiaisData] = await Promise.all([
  disciplinasApi.getById(id),
  materiaisApi.listByDisciplina(id)
])

// Parallel cache status check
await Promise.all(
  materiais.map(async (material) => {
    status[material.id] = await pdfCacheService.hasPdf(material.id)
  })
)
```

## Próximos Passos Arquiteturais

1. **Mobile PWA**:
   - ✅ Sistema de cache offline (IndexedDB)
   - ✅ Google Drive integration
   - ✅ Syncfusion PDF Viewer
   - 🚧 Rota de visualização de PDF
   - 📅 Service Worker para offline completo
   - 📅 Background sync

2. **Backend**:
   - 📅 Migrar uploads para Storage externo (Vercel Blob/S3)
   - 📅 Implementar cache Redis (para sessões e queries frequentes)
   - 📅 Background jobs (processar PDFs de forma assíncrona)
   - 📅 Websockets (real-time progress updates)

3. **Multi-tenancy**:
   - 📅 Suporte a workspaces/teams
   - 📅 Permissões granulares

**Legenda**: ✅ Completo | 🚧 Em andamento | 📅 Planejado

## Troubleshooting Mobile

### Erro: ERR_CONNECTION_REFUSED ao acessar via rede

**Sintoma**: Mobile funciona no localhost mas falha ao acessar pelo celular.

**Causa**: URLs hardcoded para `localhost:3030`.

**Solução**: Usar `getBackendBaseUrl()` ou `getApiBaseUrl()` de `/lib/api-base-url.ts`.

### Erro: CORS Policy - wildcard '*' when credentials mode is 'include'

**Sintoma**:
```
Access to fetch at 'http://192.168.15.8:3030/api/...' has been blocked by CORS policy:
The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*'
when the request's credentials mode is 'include'.
```

**Causa**: Backend retorna `Access-Control-Allow-Origin: *` mas client usa `credentials: 'include'`.

**Solução**: Configurar origem específica no `next.config.ts` do backend:
```typescript
{
  source: '/api/:path*',
  headers: [
    { key: 'Access-Control-Allow-Origin', value: 'http://192.168.15.8:3031' },
    { key: 'Access-Control-Allow-Credentials', value: 'true' },
  ]
}
```

### PDF não baixa no mobile

**Verificar**:
1. Console do celular via Chrome DevTools (`chrome://inspect`)
2. URL gerada pelo `getBackendBaseUrl()` está correta
3. Backend está rodando na porta 3030
4. Firewall permite conexões na rede local

---

**Última atualização**: 2025-12-28
