# TextReader - Visualizador de Texto Avançado

Sistema completo de leitura de texto com IA, inspirado em readers profissionais como Kindle, Apple Books e Google Play Books.

## 🚀 Processamento Incremental de PDFs (NOVO!)

O sistema agora suporta processamento incremental de PDFs grandes **sob demanda**:

- **Lazy Loading**: PDFs são processados conforme necessário
- **Lote inicial pequeno**: Primeiras 5 páginas processadas imediatamente (~1-2 segundos)
- **Leitura imediata**: Usuário começa a ler enquanto resto aguarda processamento
- **Processamento progressivo**: Novos lotes processados quando usuário se aproxima do final
- **Barra de progresso**: Indicador visual mostrando X de Y páginas processadas
- **Tratamento de erros**: Sistema robusto com retry em caso de falhas

### Fluxo de Processamento (Sob Demanda)

1. Usuário abre um PDF não processado (ex: 191 páginas)
2. Sistema processa **apenas primeiras 5 páginas** (muito rápido, ~1-2 segundos)
3. Usuário pode começar a ler imediatamente
4. Quando chega em **80% das páginas processadas** (página 4), sistema processa próximas 10
5. Processo se repete: ao chegar em 80% das 15 páginas (página 12), processa mais 10
6. Barra de progresso mostra: "Processando: 25/191 páginas (13%)"
7. Processamento continua até usuário parar de ler ou todas páginas serem processadas

## 🎨 Funcionalidades Implementadas

### 1. **Sistema de Temas**
- 🌞 **Claro**: Fundo branco para leitura diurna
- 🌙 **Escuro**: Fundo escuro para reduzir cansaço visual
- 📖 **Sépia**: Estilo papel envelhecido para leitura confortável
- ⚡ **Alto Contraste**: Amarelo em preto para acessibilidade

### 2. **Tipografia Avançada**
- **Famílias de Fonte**:
  - Sans-serif (moderna, limpa)
  - Serif (clássica, tradicional)
  - Monoespaçada (código, técnico)
- **Tamanho de Fonte**: 12px a 32px (ajuste via slider ou botões)
- **Largura da Coluna**: Estreita, Média, Larga, Total
- **Espaçamento entre Linhas**: Compacto, Normal, Relaxado, Espaçado

### 3. **Barra de Progresso de Leitura**
- Barra visual no topo mostrando progresso em tempo real
- **Estatísticas**:
  - Percentual de progresso
  - Palavras lidas vs total
  - Tempo estimado restante (baseado em 200 WPM)
  - Tempo decorrido de leitura

### 4. **Modo Foco**
- Esconde todos os controles e painéis
- Aumenta padding para leitura imersiva
- Ativa/desativa com botão de olho

### 5. **Sistema de Anotações**
- **Highlights com 5 cores**:
  - Amarelo, Verde, Rosa, Azul, Roxo
- **Painel lateral de anotações**:
  - Lista todas as anotações
  - Visualização com cor do highlight
  - Deletar anotações individuais
- **Detecção inteligente**: Selecione texto para destacar

### 6. **Marcadores Automáticos**
- Salva posição de leitura automaticamente no localStorage
- Alerta "Continuar de onde parou?" ao retornar
- Restauração suave com scroll animado

### 7. **Persistência de Preferências**
- Todas as configurações salvas no localStorage
- Preferências mantidas entre sessões
- Reset para padrões disponível

### 8. **Interface Responsiva**
- Design mobile-first
- Controles touch-friendly
- Adaptação automática ao tema escolhido
- Animações suaves de transição

## 📁 Estrutura de Arquivos

```
src/components/reader/
├── TextReader.tsx              # Componente principal
├── ReaderSettings.tsx          # Painel de configurações
├── ReaderProgressBar.tsx       # Barra de progresso e estatísticas de leitura
├── PageNavigator.tsx           # Navegação entre páginas
├── ProcessingProgressBar.tsx   # Barra de progresso de processamento (NOVO)
├── types.ts                    # Tipos TypeScript
└── README.md                   # Esta documentação

src/hooks/
├── useMobileText.ts            # Hook para buscar texto formatado
├── useReaderPreferences.ts     # Hook para gerenciar preferências
├── useReadingProgress.ts       # Hook para tracking de progresso
└── usePdfBatchProcessing.ts    # Hook para processamento incremental (NOVO)

src/app/api/pdf/
├── extract-text/route.ts       # Extração de texto com marcadores de página
├── process-batch/route.ts      # Processamento incremental em lotes (NOVO)
└── process-status/[materialId]/route.ts  # Status de processamento (NOVO)
```

## 🎯 Como Usar

### Componente TextReader
```tsx
import { TextReader } from '@/components/reader/TextReader'

function MaterialPage() {
  return <TextReader materialId="abc123" />
}
```

### Hooks Individuais
```tsx
// Preferências de leitura
const { preferences, updatePreference } = useReaderPreferences()

// Progresso de leitura
const { stats, timeSpent, restorePosition } = useReadingProgress({
  materialId: 'abc123',
  textLength: text.length,
})

// Texto formatado
const { text, loading, error } = useMobileText(materialId)
```

## ⚙️ Configurações Padrão

```typescript
{
  theme: 'light',
  fontFamily: 'sans-serif',
  fontSize: 18,
  columnWidth: 'medium',
  lineHeight: 'relaxed',
}
```

## 🔧 APIs Utilizadas

### APIs de Texto e Processamento
- `GET /api/pdf/[id]/mobile-text` - Buscar texto formatado
- `POST /api/pdf/extract-text` - Extrair texto do PDF com marcadores de página
- `POST /api/pdf/format-for-reader` - Processar PDF com IA (legado)
- `POST /api/pdf/process-batch` - Processar lote de páginas (NOVO)
- `GET /api/pdf/process-status/[materialId]` - Verificar status de processamento (NOVO)

### APIs de Anotações
- `GET /api/annotations/[materialId]` - Buscar anotações
- `POST /api/annotations/create` - Criar anotação
- `DELETE /api/annotations/[id]` - Deletar anotação

### Parâmetros da API de Processamento em Lotes

**POST /api/pdf/process-batch**
```json
{
  "materialId": "abc123",
  "startPage": 1,      // Opcional - primeira página do lote
  "endPage": 10,       // Opcional - última página do lote
  "batchSize": 10      // Opcional - tamanho do lote (padrão: 10)
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "complete": false,
  "batch": {
    "startPage": 1,
    "endPage": 10,
    "pagesProcessed": 10,
    "text": "[PAGE_1]\n\n..."
  },
  "status": {
    "totalPages": 191,
    "processedPages": 10,
    "lastProcessedPage": 10,
    "processingStatus": "partial",
    "progress": 5
  }
}
```

## 💾 LocalStorage

### Chaves utilizadas:
- `reader-preferences` - Configurações do leitor
- `reading-position-{materialId}` - Posição de leitura por material

## 🎨 Temas e Cores

### Configuração de Temas
```typescript
THEME_CONFIGS = {
  light: { bg: '#ffffff', text: '#1a1a1a' },
  dark: { bg: '#1a1a1a', text: '#e5e7eb' },
  sepia: { bg: '#f4ecd8', text: '#5f4b32' },
  'high-contrast': { bg: '#000000', text: '#ffff00' },
}
```

### Cores de Highlight
- Amarelo: `#ffff00`
- Verde: `#90EE90`
- Rosa: `#FFB6C1`
- Azul: `#87CEEB`
- Roxo: `#DDA0DD`

## 🚀 Melhorias Futuras Possíveis

- [ ] Atalhos de teclado (setas, F11 para foco)
- [ ] Busca no texto
- [ ] Modo de duas colunas para telas grandes
- [ ] Exportar anotações
- [ ] Notas além de highlights
- [ ] Compartilhar trechos
- [ ] Text-to-Speech
- [ ] Modo leitura rápida (Spritz)
- [ ] Dicionário integrado
- [ ] Tradução de trechos

## 📊 Estatísticas de Leitura

O sistema calcula automaticamente:
- **Velocidade**: Baseado em 200 palavras por minuto (padrão adulto)
- **Progresso**: Calculado por scroll vertical
- **Tempo**: Contador em tempo real desde início da sessão

## 🎭 Acessibilidade

- ARIA labels em todos os botões
- Suporte a teclado (navegação)
- Alto contraste disponível
- Tamanhos de fonte ajustáveis
- Contraste adequado em todos os temas

---

**Versão**: 1.0.0
**Data**: 2025-12-28
**Autor**: Claude Code
