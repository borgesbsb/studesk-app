# PRD - StudesDk (Contexto Rápido)

## O que é

Plataforma web de gerenciamento de estudos para estudantes de concursos. Upload de PDFs, criação de planos de estudo, tracking de progresso.

**Tech Stack**: Next.js 15 + PostgreSQL + Prisma + PDFTron WebViewer

## Estado Atual

### ✅ Funcionalidades Implementadas

1. **Materiais de Estudo (PDFs)**
   - Upload local (public/uploads)
   - Visualização com PDFTron WebViewer
   - Sistema de anotações
   - Tracking de progresso (página atual)
   - Histórico de sessões de leitura

2. **Disciplinas**
   - CRUD completo
   - Customização (nome, cor, ícone)
   - Vinculação com materiais

3. **Planos de Estudo**
   - 4 modos de criação (Simples, Rápido, Ágil, Disciplinas)
   - Organização por ciclos/semanas
   - Distribuição de horas
   - Tracking de progresso

4. **Dashboard**
   - Materiais do dia
   - Controle de tempo (manual + automático)
   - Transferência de tempo entre sessões
   - Calendário semanal

5. **Autenticação**
   - NextAuth.js
   - Login/registro
   - Proteção de rotas

### ❌ Removido Recentemente

- **Sistema de Questões**: Removido por baixo uso/complexidade excessiva

## Decisões Importantes

### Arquitetura

- **Camadas**: Interface (App Router) → Services → Entities → Prisma
- **Data Fetching**: Server Actions (não API Routes para CRUD)
- **Components**: Server Components por padrão, Client apenas quando necessário
- **File Upload**: Local storage (public/uploads), não cloud

### Padrões de Código

```typescript
// Server Actions em /src/interface/actions/[domain]/
'use server'
export async function actionName(data: Schema) {
  const validated = schema.parse(data)
  return await service.method(validated)
}

// Services em /src/application/services/
export class EntityService {
  async method(data: Dto) {
    // Lógica de negócio aqui
    return await prisma.entity.create({ data })
  }
}
```

### Modelo de Dados (Core)

```
User
  → Disciplina (1:N)
  → MaterialEstudo (1:N)
  → PlanoEstudo (1:N)

PlanoEstudo
  → SemanaEstudo (1:N, ciclos)
    → DisciplinaSemana (1:N, distribuição)

MaterialEstudo
  → HistoricoLeitura (1:N, sessões)
  → DisciplinaMaterial (N:M com Disciplina)
```

### Convenções

- **Naming**: kebab-case para arquivos, PascalCase para componentes
- **Commit**: Sem emojis ou assinatura "Generated with Claude Code"
- **Paths**: Sempre absolutos, não usar `cd`

## O que NÃO fazer

1. ❌ Não criar sistema de questões
2. ❌ Não usar API Routes para CRUD (usar Server Actions)
3. ❌ Não implementar upload em cloud ainda
4. ❌ Não criar features de "teams" ou multi-user
5. ❌ Não adicionar OpenAI/IA sem discutir primeiro

## Prioridades Atuais

1. **Estabilidade**: Corrigir bugs existentes
2. **Performance**: Otimizar queries e carregamento
3. **UX**: Melhorar fluxos de usuário
4. **Mobile**: Responsividade (futuro próximo)

## Comandos Úteis

```bash
# Dev
npm run dev                 # Inicia dev server
npm run copy-webviewer     # Copia assets PDFTron

# Database
npx prisma generate        # Gera Prisma Client
npx prisma db push         # Aplica schema
npx prisma studio          # UI do banco

# Build
npm run build              # Build produção
```

## Variáveis de Ambiente

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
```

## Troubleshooting Comum

- **WebViewer não carrega**: Rodar `npm run copy-webviewer`
- **Erro Prisma**: Rodar `npx prisma generate`
- **PDF não aparece**: Verificar se existe em `public/uploads/`

---

**Para Claude**: Este é o contexto mínimo necessário. Consulte ARCHITECTURE.md para detalhes técnicos.
