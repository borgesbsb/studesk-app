# Solução para Problema de Deleção de Materiais

## Problema

Ao tentar deletar um material de estudo, ocorria o erro:
```
Invalid `prisma.materialEstudo.delete()` invocation: Foreign key constraint violated on the constraint: `DisciplinaMaterial_materialId_fkey`
```

## Causa

O erro acontecia porque existiam registros relacionados na tabela `DisciplinaMaterial` que referenciam o material sendo deletado. Como essa relação não tem `onDelete: Cascade`, o Prisma não consegue deletar o material automaticamente.

## Solução Implementada

### 1. Função de Deleção Atualizada

A função `deletarMaterialEstudo` no `MaterialEstudoService` foi atualizada para:

1. **Verificar se o material existe** antes de tentar deletar
2. **Listar todas as relações** para debug e verificação
3. **Remover manualmente** as relações que não têm `onDelete: Cascade`:
   - `DisciplinaMaterial` (relação many-to-many com disciplinas)
   - `ChunkUtilizado` (chunks de texto utilizados)
4. **Deletar o material** (outras relações são removidas automaticamente por cascade)

### 2. Relações com Cascade

As seguintes relações são removidas automaticamente quando o material é deletado:
- `SessaoQuestoes` (sessões de questões)
- `HistoricoPontuacao` (histórico de pontuações)
- `ProgressoAdaptativo` (progresso adaptativo)
- `HistoricoLeitura` (histórico de leitura)
- `Anotacao` (anotações)

### 3. Script de Teste

Criado script `test-delete-material.js` para:
- Listar todos os materiais com suas relações
- Testar a deleção de forma segura
- Identificar problemas específicos

## Como Usar

### 1. Testar Deleção

```bash
cd studesk
npm run test-delete-material
```

### 2. Usar a Função Atualizada

A função `deletarMaterialEstudo` agora funciona corretamente e pode ser usada normalmente através da interface da aplicação.

### 3. Logs de Debug

A função agora inclui logs detalhados que mostram:
- Quais relações foram encontradas
- Quantos registros de cada tipo
- Status da operação de deleção

## Estrutura das Relações

```
MaterialEstudo
├── DisciplinaMaterial (❌ Sem cascade - removido manualmente)
├── ChunkUtilizado (❌ Sem cascade - removido manualmente)
├── SessaoQuestoes (✅ Com cascade)
├── HistoricoPontuacao (✅ Com cascade)
├── ProgressoAdaptativo (✅ Com cascade)
├── HistoricoLeitura (✅ Com cascade)
└── Anotacao (✅ Com cascade)
```

## Melhorias Futuras

Para evitar esse problema no futuro, considere:

1. **Adicionar `onDelete: Cascade`** nas relações `DisciplinaMaterial` e `ChunkUtilizado`
2. **Usar transações** para garantir atomicidade das operações
3. **Implementar soft delete** em vez de hard delete para preservar dados históricos

## Exemplo de Uso

```typescript
// A função agora funciona corretamente
const materialDeletado = await MaterialEstudoService.deletarMaterialEstudo(materialId)
console.log('Material deletado:', materialDeletado.nome)
```

## Troubleshooting

### Se ainda houver erros:

1. Execute o script de teste para identificar relações problemáticas
2. Verifique se há outras tabelas que referenciam o material
3. Considere usar transações para garantir consistência
4. Verifique os logs para identificar exatamente onde está falhando 