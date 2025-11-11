# StudesDk - Visão Geral

## O que é

Plataforma web para gerenciamento de estudos focada em estudantes de concursos públicos. Permite organizar PDFs, criar planos de estudo estruturados e acompanhar progresso.

## Funcionalidades Principais

### 📄 Materiais de Estudo
- Upload e visualização de PDFs (PDFTron WebViewer)
- Sistema de anotações e highlights
- Tracking automático de progresso (página atual)
- Histórico de sessões de leitura com tempo

### 🎯 Disciplinas
- Organização por matérias
- Customização visual (cor, ícone)
- Vinculação com materiais

### 📊 Planos de Estudo
- Criação via wizard (4 modos)
- Organização por ciclos/semanas
- Distribuição de horas por disciplina
- Tracking de progresso real vs planejado

### 📈 Dashboard
- Visão do dia (disciplinas agendadas)
- Controle de tempo (manual + automático)
- Calendário semanal
- Estatísticas de progresso

### 🔐 Autenticação
- NextAuth.js
- Login/registro
- Dados isolados por usuário

## Tech Stack

- **Framework**: Next.js 15.3.2 (App Router, React 19)
- **Database**: PostgreSQL + Prisma ORM
- **UI**: Tailwind CSS + Radix UI
- **PDF**: PDFTron WebViewer + PDF.js
- **Auth**: NextAuth.js

## Estrutura de Dados

```
User
  ├─ Disciplina[]
  ├─ MaterialEstudo[]
  └─ PlanoEstudo[]
       └─ SemanaEstudo[] (ciclos)
            └─ DisciplinaSemana[] (distribuição)

MaterialEstudo
  ├─ HistoricoLeitura[] (sessões)
  └─ DisciplinaMaterial[] (N:M com Disciplina)
```

## Comandos Rápidos

```bash
# Setup inicial
npm install
npm run copy-webviewer
npx prisma generate
npx prisma db push

# Desenvolvimento
npm run dev

# Build produção
npm run build
npm start

# Database
npx prisma studio
```

## Variáveis de Ambiente

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
```

## Estrutura do Projeto

```
/src
  /app
    /(authenticated)     # Rotas protegidas
      /dashboard
      /disciplinas
      /material/[id]
      /plano-estudos
  /components
    /ui                  # Radix UI components
    /[domain]           # Domain components
  /interface/actions    # Server Actions
  /application/services # Business logic
  /domain/entities      # Domain models
/prisma
  schema.prisma
/public
  /uploads             # PDFs enviados
  /lib/webviewer      # PDFTron assets
/docs                  # Documentação
```

## Fluxos Principais

### Upload → Visualização
1. User faz upload via form
2. Arquivo salvo em `public/uploads/`
3. Registro criado no banco (`MaterialEstudo`)
4. Navega para `/material/[id]`
5. WebViewer carrega PDF
6. Progresso trackado automaticamente

### Criar Plano
1. User inicia wizard
2. Escolhe modo (Simples/Rápido/Ágil/Disciplinas)
3. Define título, período, disciplinas, horas
4. Submit → Server Action cria:
   - `PlanoEstudo`
   - `SemanaEstudo[]` (N semanas)
   - `DisciplinaSemana[]` (distribuição)
5. Redirect para `/plano-estudos`

### Dashboard - Dia Atual
1. Query busca `SemanaEstudo` da data atual
2. Carrega `DisciplinaSemana[]` da semana
3. Busca `MaterialEstudo` de cada disciplina
4. Renderiza cards com:
   - Disciplina, tempo planejado/realizado
   - Materiais vinculados
   - Progresso

## Padrões

### Server Actions (não API Routes)
```typescript
// /src/interface/actions/[domain]/action.ts
'use server'

export async function create(data: Schema) {
  return await service.create(data)
}
```

### Componentes
- Server Components por padrão
- Client Components apenas quando necessário (`'use client'`)
- Radix UI para componentes base

### Naming
- Arquivos: `kebab-case.tsx`
- Componentes: `PascalCase`
- Actions: `camelCase`

## Decisões Importantes

✅ **O que NÃO fazer**:
- Sistema de questões (removido)
- API Routes para CRUD (usar Server Actions)
- Upload em cloud (usar local)
- Features de teams/multi-user
- IA/OpenAI sem discutir

## Documentação Adicional

- **[PRD.md](./PRD.md)** - Contexto rápido para retomar sessões
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detalhes técnicos e arquitetura
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Problemas comuns e soluções
- **[CLAUDE.md](./CLAUDE.md)** - Guia para Claude Code

---

**Para retomar uma sessão**: Leia PRD.md primeiro, depois consulte esta visão geral.
