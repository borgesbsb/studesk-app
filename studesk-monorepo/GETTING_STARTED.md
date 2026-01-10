# Getting Started - StudesDk Monorepo

## 📦 Estrutura Criada

```
studesk-monorepo/
├── apps/
│   ├── web/              # App desktop (porta 3030)
│   └── mobile/           # PWA mobile (porta 3031)
├── packages/
│   ├── database/         # Prisma schema compartilhado
│   ├── types/            # TypeScript types
│   └── ui/               # Componentes UI
├── package.json          # Root package.json
├── pnpm-workspace.yaml   # Workspaces config
└── turbo.json            # Turborepo config
```

## 🚀 Setup Inicial

### 1. Instalar Dependências

```bash
cd /home/borgesbsb/projetos/studesk-app/studesk-monorepo
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie `.env.local` em `apps/web/`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/studesk"
NEXTAUTH_URL="http://localhost:3030"
NEXTAUTH_SECRET="seu-secret-aqui"
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY="sua-chave-syncfusion"
```

Crie `.env.local` em `apps/mobile/`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3030/api"
```

### 3. Gerar Prisma Client

```bash
cd packages/database
pnpm db:generate
pnpm db:push
```

## 🏃 Desenvolvimento

### Rodar Ambos os Apps

```bash
# Na raiz do monorepo
pnpm dev
```

- **Web**: http://localhost:3030
- **Mobile**: http://localhost:3031

### Rodar Apenas Um App

```bash
# Apenas web
pnpm dev:web

# Apenas mobile
pnpm dev:mobile
```

## 📱 Testando o PWA Mobile

1. Acesse http://localhost:3031 no navegador móvel ou Chrome DevTools (Device Mode)
2. Abra o menu do navegador
3. Selecione "Instalar app" ou "Adicionar à tela inicial"
4. O app será instalado como aplicativo nativo

## 🏗️ Build de Produção

```bash
# Build de todos os apps
pnpm build

# Build apenas web
pnpm build:web

# Build apenas mobile
pnpm build:mobile
```

## 📚 Comandos Úteis

### Database (Prisma)

```bash
cd packages/database

# Gerar Prisma Client
pnpm db:generate

# Aplicar schema ao banco
pnpm db:push

# Criar migration
pnpm db:migrate

# Abrir Prisma Studio
pnpm db:studio
```

### Linting

```bash
# Lint de todos os apps
pnpm lint

# Limpar caches e builds
pnpm clean
```

## 🔄 Como Funciona o Monorepo

### Compartilhamento de Código

O mobile consome pacotes compartilhados:

```typescript
// Em apps/mobile/src/app/page.tsx
import { Button } from "@studesk/ui"
import { prisma, User } from "@studesk/database"
import type { ApiResponse } from "@studesk/types"
```

### Backend Compartilhado

O mobile consome as APIs do web via HTTP:

```typescript
// Mobile faz request para:
fetch('http://localhost:3030/api/disciplinas')

// Web serve a API em:
// apps/web/src/app/api/disciplinas/route.ts
```

### Banco de Dados Compartilhado

Ambos os apps usam o mesmo Prisma Client:

```typescript
import { prisma } from '@studesk/database'

// Funciona tanto no web quanto no mobile
const users = await prisma.user.findMany()
```

## 🎨 Customização do Mobile

### Interface Mobile-First

O mobile tem interface otimizada:

- Botões maiores (touch-friendly)
- Navegação mobile (bottom tabs, gestos)
- Performance otimizada
- Instalável como PWA

### Adicionando Páginas

```bash
# Criar nova página
touch apps/mobile/src/app/disciplinas/page.tsx
```

```typescript
// apps/mobile/src/app/disciplinas/page.tsx
export default function DisciplinasPage() {
  return <div>Minhas Disciplinas</div>
}
```

## 🐛 Troubleshooting

### Erro: "Cannot find module '@studesk/ui'"

```bash
# Reinstalar dependências
pnpm install
```

### Erro no Prisma

```bash
cd packages/database
pnpm db:generate
```

### PWA não está instalável

1. Verifique se está em HTTPS ou localhost
2. Verifique se `manifest.json` existe em `apps/mobile/public/`
3. Inspecione o console para erros do service worker

### Porta já em uso

```bash
# Alterar porta em apps/mobile/package.json
"dev": "next dev -p 3032 -H 0.0.0.0"
```

## 📖 Próximos Passos

1. **Autenticação Mobile**: Configurar NextAuth no mobile
2. **Cache Offline**: Implementar service worker para funcionar offline
3. **Push Notifications**: Adicionar notificações push
4. **Gestos Nativos**: Implementar swipe, pull-to-refresh, etc
5. **API Client**: Criar cliente HTTP compartilhado em `packages/api-client`

## 🔗 Links Úteis

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Next.js PWA](https://github.com/shadowwalker/next-pwa)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Prisma Docs](https://www.prisma.io/docs)

---

**Criado em**: 2025-12-21
**Versão**: 1.0.0
