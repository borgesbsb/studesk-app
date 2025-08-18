# Sistema de Questões Integrado

Este sistema permite gerar questões usando a OpenAI e salvá-las automaticamente no banco de dados para posterior consulta e estatísticas.

## 🏗️ Arquitetura

### Modelos de Banco de Dados

1. **SessaoQuestoes**: Agrupa questões geradas em uma sessão
   - Pode estar associada a um Material de Estudo ou Disciplina
   - Armazena o prompt usado para gerar as questões
   - Mantém estatísticas básicas

2. **Questao**: Questões individuais com múltiplas alternativas
   - Formato padronizado (A, B, C, D, E)
   - Inclui explicação e metadados
   - Ordem definida dentro da sessão

3. **RespostaUsuario**: Registra as respostas dos usuários
   - Rastreia tempo gasto e acurácia
   - Permite análise de desempenho

### Serviços

1. **SessaoQuestoesService**: CRUD completo para sessões
2. **QuestoesOpenAIService**: Integração OpenAI + persistência
3. **APIs REST**: Endpoints para todas as operações

## 🚀 Como Usar

### 1. Gerar Questões e Salvar Automaticamente

```typescript
// Via API
POST /api/questoes/gerar-e-salvar
{
  "materialId": "material_123", // Opcional
  "disciplinaId": "disciplina_456", // Opcional
  "paragrafo": "Texto base para gerar questões...",
  "quantidade": 5,
  "contexto": "Direito Constitucional",
  "tituloSessao": "Questões sobre Direitos Fundamentais",
  "descricaoSessao": "Sessão de estudo focada em direitos fundamentais"
}

// Headers
x-openai-key: sua_chave_openai_aqui
```

### 2. Via Serviço (Programático)

```typescript
import { QuestoesOpenAIService } from '@/services/questoes-openai.service'

const resultado = await QuestoesOpenAIService.gerarQuestoes({
  materialId: 'material_123',
  paragrafo: 'Texto do material...',
  quantidade: 5,
  salvarBanco: true, // Salva automaticamente
  tituloSessao: 'Questões Geradas',
  apiKey: 'sua_chave_openai'
})

console.log('Sessão criada:', resultado.sessaoId)
console.log('Questões:', resultado.questoes)
```

### 3. Gerenciar Sessões

```typescript
// Listar sessões por material
const sessoes = await SessaoQuestoesService.listarSessoes('material_123')

// Buscar sessão específica
const sessao = await SessaoQuestoesService.buscarSessao('sessao_id')

// Gerar estatísticas
const stats = await SessaoQuestoesService.gerarEstatisticas('sessao_id')
```

### 4. Registrar Respostas

```typescript
// Salvar resposta do usuário
await SessaoQuestoesService.salvarResposta({
  questaoId: 'questao_123',
  resposta: 'A', // A, B, C, D ou E
  tempoGasto: 30 // em segundos
})
```

## 📊 Estatísticas Disponíveis

O sistema gera automaticamente:
- Total de questões na sessão
- Questões respondidas
- Número de acertos e erros
- Percentual de acerto
- Tempo total gasto
- Tempo médio por questão

## 🔌 Endpoints da API

### Sessões
- `GET /api/sessoes-questoes` - Listar sessões
- `POST /api/sessoes-questoes` - Criar sessão
- `GET /api/sessoes-questoes/[id]` - Buscar sessão
- `DELETE /api/sessoes-questoes/[id]` - Deletar sessão
- `GET /api/sessoes-questoes/[id]/estatisticas` - Estatísticas

### Questões
- `POST /api/questoes/gerar-e-salvar` - Gerar e salvar
- `POST /api/questoes/responder` - Registrar resposta

## 🎯 Fluxo Recomendado

1. **Geração**: Use `/api/questoes/gerar-e-salvar` para gerar questões de um texto
2. **Resolução**: Apresente as questões ao usuário
3. **Registro**: Use `/api/questoes/responder` para cada resposta
4. **Análise**: Use `/api/sessoes-questoes/[id]/estatisticas` para feedback

## ⚙️ Configurações

### Limites
- Máximo 20 questões por sessão
- Resposta obrigatória entre A-E
- Tempo opcional (em segundos)

### Relacionamentos
- Sessões podem estar vinculadas a Materials OU Disciplinas
- Relacionamentos opcionais para flexibilidade
- Cascade delete para integridade

## 🔧 Personalização

### Prompts Customizados
```typescript
const resultado = await QuestoesOpenAIService.gerarQuestoes({
  paragrafo: 'Texto...',
  quantidade: 3,
  promptPersonalizado: 'Foque em aspectos práticos e jurisprudência',
  nivel: 'Avançado',
  contexto: 'Concurso Público - Magistratura'
})
```

### Metadados
- **Nível**: Fácil, Médio, Difícil
- **Tópico**: Categoria da questão
- **Explicação**: Justificativa da resposta correta

Este sistema oferece uma solução completa para geração, armazenamento e análise de questões educacionais integrada com IA. 