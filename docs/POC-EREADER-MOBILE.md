# POC - E-Reader Mobile com IA

## 📋 Resumo Executivo

Sistema de leitura mobile otimizado que usa IA (OpenAI GPT-4o-mini) para reformatar textos de PDFs, tornando-os perfeitamente legíveis em dispositivos móveis com funcionalidades de e-reader (tipo Kindle).

### Objetivos
- ✅ Extrair texto de PDFs
- ✅ Reformatar texto usando IA para mobile
- ✅ Implementar controle de tamanho de fonte
- ✅ Texto com reflow automático (sem scroll horizontal)
- ✅ Sistema de anotações e highlights
- ✅ Cache para zero custo após primeira formatação

### Resultados dos Testes
- ⏱️ **Tempo**: 4.5s para reformatar
- 📊 **Tokens**: 538 tokens (2 páginas)
- 💰 **Custo**: $0.000081 USD (2 páginas)
- 💰 **Custo Estimado**: ~$0.023 USD (196 páginas)
- 🎯 **Custo Recorrente**: $0 (cache no banco)

---

## 🏗️ Arquitetura

### Stack Tecnológica

**Backend (Next.js):**
- Next.js 15.3.2 API Routes
- Prisma ORM (PostgreSQL)
- OpenAI SDK v5.1.0
- pdf-parse para extração de texto

**Mobile (React Native):**
- React Native + Expo
- react-native-markdown-display
- Axios para chamadas HTTP
- AsyncStorage para preferências

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD DO PDF (Uma única vez)                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────┐
    │  MaterialEstudo (PDF armazenado)                 │
    └──────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PROCESSAMENTO (Primeira vez que usuário abre "Modo Leitura") │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────┐
    │  Extrair Texto com pdf-parse                     │
    └──────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────┐
    │  Enviar para OpenAI GPT-4o-mini                  │
    │  - Remover quebras de linha ruins               │
    │  - Criar estrutura markdown                      │
    │  - Preservar conteúdo original                   │
    └──────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────┐
    │  Salvar em PdfMobileText (CACHE)                 │
    │  - formattedText (markdown)                      │
    │  - rawText (backup)                              │
    │  - tokensUsed                                    │
    └──────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. LEITURA (Todas as outras vezes - SEM CUSTO)                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────┐
    │  Buscar texto do cache (PdfMobileText)           │
    │  Custo: $0 (apenas query no DB)                 │
    └──────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────┐
    │  Renderizar no Mobile                            │
    │  - Markdown → Componentes React Native           │
    │  - Controle de fonte (12-24px)                   │
    │  - Reflow automático                             │
    └──────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────┐
    │  Anotações do Usuário                            │
    │  - Highlights com cores                          │
    │  - Notas de texto                                │
    │  - Salvo em Anotacao (startOffset, endOffset)   │
    └──────────────────────────────────────────────────┘
```

---

## 🗄️ Schema do Banco de Dados

### Novos Modelos

#### PdfMobileText
```prisma
model PdfMobileText {
  id              String         @id @default(cuid())
  materialId      String         @unique
  formattedText   String         @db.Text
  rawText         String         @db.Text
  processedAt     DateTime       @default(now())
  aiModel         String?        @default("gpt-4o-mini")
  tokensUsed      Int?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  material        MaterialEstudo @relation(fields: [materialId], references: [id], onDelete: Cascade)

  @@index([materialId])
  @@index([processedAt])
}
```

#### Anotacao (Estendido)
```prisma
model Anotacao {
  id         String         @id @default(cuid())
  materialId String
  pagina     Int
  texto      String
  posicaoX   Float?
  posicaoY   Float?
  largura    Float?
  altura     Float?
  cor        String?        @default("#ffff00")
  tipo       String         @default("highlight")
  // NOVOS CAMPOS para modo leitura mobile
  startOffset Int?          // Posição inicial no texto (char index)
  endOffset   Int?          // Posição final no texto (char index)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  material   MaterialEstudo @relation(fields: [materialId], references: [id], onDelete: Cascade)

  @@index([materialId])
  @@index([pagina])
  @@index([tipo])
  @@index([createdAt])
}
```

---

## 📡 APIs Backend

### 1. POST /api/pdf/format-for-reader

**Descrição**: Processa um PDF e gera texto formatado para mobile

**Request:**
```typescript
{
  materialId: string
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    id: string
    materialId: string
    formattedText: string
    tokensUsed: number
    processedAt: string
  }
  error?: string
}
```

**Fluxo:**
1. Verificar se já existe cache (PdfMobileText)
2. Se existir, retornar cache
3. Se não existir:
   - Extrair texto do PDF
   - Enviar para OpenAI
   - Salvar resultado no DB
   - Retornar texto formatado

---

### 2. GET /api/pdf/[materialId]/mobile-text

**Descrição**: Busca texto formatado do cache

**Response:**
```typescript
{
  success: boolean
  data?: {
    formattedText: string
    processedAt: string
    tokensUsed: number
  }
  cached: boolean
  error?: string
}
```

---

### 3. POST /api/annotations/create

**Descrição**: Cria uma anotação/highlight

**Request:**
```typescript
{
  materialId: string
  texto: string           // Texto selecionado
  startOffset: number     // Posição inicial
  endOffset: number       // Posição final
  cor?: string           // Cor do highlight
  tipo: "highlight" | "note"
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    id: string
    materialId: string
    texto: string
    startOffset: number
    endOffset: number
    cor: string
    createdAt: string
  }
  error?: string
}
```

---

### 4. GET /api/annotations/[materialId]

**Descrição**: Busca todas anotações de um material

**Response:**
```typescript
{
  success: boolean
  data?: Array<{
    id: string
    texto: string
    startOffset: number
    endOffset: number
    cor: string
    tipo: string
    createdAt: string
  }>
  error?: string
}
```

---

## 📱 Componentes Mobile

### 1. TextReader Component

**Local:** `apps/mobile/src/components/material-estudo/TextReader.tsx`

**Props:**
```typescript
interface TextReaderProps {
  materialId: string
  formattedText: string
  annotations: Annotation[]
  onAnnotate: (selection: TextSelection) => void
}
```

**Features:**
- Renderiza markdown com react-native-markdown-display
- Controles de fonte (+/-)
- Salva preferências de fonte no AsyncStorage
- Sistema de seleção de texto
- Highlights visuais baseados em annotations

---

### 2. FontControls Component

**Local:** `apps/mobile/src/components/material-estudo/FontControls.tsx`

```typescript
interface FontControlsProps {
  fontSize: number
  onIncrease: () => void
  onDecrease: () => void
}
```

**Range:** 12px - 24px (step: 2px)

---

### 3. AnnotationMenu Component

**Local:** `apps/mobile/src/components/material-estudo/AnnotationMenu.tsx`

```typescript
interface AnnotationMenuProps {
  visible: boolean
  selection: TextSelection
  onHighlight: (color: string) => void
  onNote: () => void
  onClose: () => void
}
```

**Cores de Highlight:**
- 🟡 Amarelo (#FFFF00)
- 🟢 Verde (#00FF00)
- 🔵 Azul (#00BFFF)
- 🟠 Laranja (#FFA500)
- 🔴 Rosa (#FF69B4)

---

## 🔧 Serviços

### OpenAI Service

**Local:** `src/application/services/openai-format.service.ts`

```typescript
export class OpenAIFormatService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async formatTextForMobile(rawText: string): Promise<{
    formattedText: string
    tokensUsed: number
  }> {
    // Implementação do prompt de formatação
  }
}
```

**Prompt Template:**
```
Você é um assistente especializado em reformatar textos de PDFs para leitura em dispositivos móveis.

TAREFA: Reformatar o texto abaixo para leitura em celular, seguindo estas regras:

1. REMOVER quebras de linha desnecessárias (causadas por PDFs em colunas)
2. MANTER a estrutura lógica (títulos, subtítulos, parágrafos, listas)
3. CONVERTER para markdown limpo e bem formatado
4. PRESERVAR todo o conteúdo e significado original
5. Usar formatação adequada: # para títulos, ## para subtítulos, - para listas
6. Parágrafos devem ser contínuos (sem quebras no meio)

IMPORTANTE:
- NÃO adicione conteúdo extra
- NÃO resuma ou omita informações
- APENAS reformate o layout para mobile

Texto original:
---
{rawText}
---

Retorne APENAS o texto reformatado em markdown, sem explicações adicionais.
```

---

## 📅 Plano de Implementação

### Fase 1: Backend (2-3 horas)
- [ ] **1.1** Adicionar relação PdfMobileText ao MaterialEstudo no schema ✅
- [ ] **1.2** Rodar migration do Prisma
- [ ] **1.3** Criar `openai-format.service.ts`
- [ ] **1.4** Criar API `/api/pdf/format-for-reader`
- [ ] **1.5** Criar API `/api/pdf/[materialId]/mobile-text`
- [ ] **1.6** Criar API `/api/annotations/create`
- [ ] **1.7** Criar API `/api/annotations/[materialId]`
- [ ] **1.8** Testar APIs com Postman/Thunder Client

### Fase 2: Mobile - Base (2-3 horas)
- [ ] **2.1** Instalar react-native-markdown-display
- [ ] **2.2** Criar componente `TextReader.tsx` base
- [ ] **2.3** Criar componente `FontControls.tsx`
- [ ] **2.4** Implementar persistência de preferências (AsyncStorage)
- [ ] **2.5** Criar hook `useMobileText` para buscar texto formatado
- [ ] **2.6** Testar renderização de markdown

### Fase 3: Mobile - Anotações (3-4 horas)
- [ ] **3.1** Implementar seleção de texto
- [ ] **3.2** Criar componente `AnnotationMenu.tsx`
- [ ] **3.3** Implementar highlights visuais
- [ ] **3.4** Criar hook `useAnnotations` para CRUD
- [ ] **3.5** Sincronização com backend
- [ ] **3.6** Testar criação/edição/exclusão de anotações

### Fase 4: Integração (1-2 horas)
- [ ] **4.1** Criar tela `MaterialReaderScreen.tsx`
- [ ] **4.2** Adicionar botão "Modo Leitura" na tela de materiais
- [ ] **4.3** Implementar indicador de loading durante processamento
- [ ] **4.4** Tratamento de erros
- [ ] **4.5** Testes end-to-end

### Fase 5: Polimento (1-2 horas)
- [ ] **5.1** Animações de transição
- [ ] **5.2** Feedback visual ao usuário
- [ ] **5.3** Otimização de performance
- [ ] **5.4** Documentação final
- [ ] **5.5** Deploy e testes em produção

**Tempo Total Estimado:** 9-14 horas

---

## 💰 Análise de Custos

### Custo por Processamento

| Páginas | Tokens | Custo (USD) | Custo (BRL) |
|---------|--------|-------------|-------------|
| 1-10 | ~2,700 | $0.0012 | R$ 0.006 |
| 50 | ~13,500 | $0.006 | R$ 0.03 |
| 100 | ~27,000 | $0.012 | R$ 0.06 |
| 196 | ~68,800 | $0.023 | R$ 0.12 |

**Observação:** Custo é ONE-TIME. Após processar uma vez, todas as leituras são do cache (custo $0).

### Estimativa para Produção

**Cenário 1 - MVP (100 usuários):**
- PDFs únicos: ~500
- Páginas médias: 100
- Custo total: **$6 USD** (uma vez)
- Custo mensal recorrente: **$0**

**Cenário 2 - Escala (1000 usuários):**
- PDFs únicos: ~5,000
- Páginas médias: 100
- Custo total: **$60 USD** (uma vez)
- Custo mensal recorrente: **$0**

### Otimizações de Custo

1. **Deduplicação por Hash**: Mesmo PDF = 1 processamento
2. **Processamento sob demanda**: Só processa quando usuário clica em "Modo Leitura"
3. **Background jobs**: Processar PDFs em horários de baixo uso
4. **Cache compartilhado**: PDFs públicos/comuns processados 1 vez para todos

---

## 🧪 Testes

### Backend Tests

```bash
# Testar extração de texto
npm run test:pdf-extract

# Testar formatação OpenAI
npm run test:openai-format

# Testar APIs
npm run test:api
```

### Mobile Tests

```bash
# Testar componentes
npm run test:components

# Testar hooks
npm run test:hooks

# E2E
npm run test:e2e
```

---

## 🚀 Deploy

### Variáveis de Ambiente

```env
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Database
DATABASE_URL=postgresql://...
```

### Migrations

```bash
# Gerar migration
npx prisma migrate dev --name add_mobile_text_support

# Aplicar em produção
npx prisma migrate deploy
```

---

## 📊 Métricas de Sucesso

### KPIs

1. **Performance**
   - Tempo de processamento < 60s (PDF 100 páginas)
   - Tempo de carregamento < 2s (cache)

2. **Qualidade**
   - Taxa de erro de formatação < 5%
   - Satisfação do usuário > 80%

3. **Custos**
   - Custo médio por usuário/mês < $0.10
   - Taxa de cache hit > 95%

4. **Uso**
   - % de usuários usando modo leitura > 30%
   - Média de anotações por material > 5

---

## 🔒 Segurança

### Considerações

1. **Validação de Input**
   - Validar materialId
   - Verificar permissões do usuário
   - Sanitizar texto antes de enviar para IA

2. **Rate Limiting**
   - Máximo 10 processamentos/hora por usuário
   - Prevenir abuso da API OpenAI

3. **Autenticação**
   - Todas as rotas protegidas com NextAuth
   - Verificar userId em todas as operações

---

## 📚 Referências

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [react-native-markdown-display](https://github.com/iamacup/react-native-markdown-display)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)

---

## ✅ Checklist de Entrega

- [ ] Schema Prisma atualizado e migrado
- [ ] APIs backend implementadas e testadas
- [ ] Componentes mobile criados
- [ ] Sistema de anotações funcionando
- [ ] Testes end-to-end passando
- [ ] Documentação atualizada
- [ ] Deploy em staging
- [ ] Aprovação do cliente
- [ ] Deploy em produção

---

**Documento criado em:** 2025-12-28
**Versão:** 1.0
**Autor:** Claude Code + Benjamin Borges
**Status:** 🚧 Em Implementação
