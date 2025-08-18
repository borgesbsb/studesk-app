# Solução para Servir PDFs Localmente

## Problema Resolvido

O problema era que no modo de produção (`npm run start`), os PDFs não carregavam porque o Next.js não serve automaticamente arquivos estáticos de subpastas dentro de `public/` da mesma forma que no modo de desenvolvimento.

## Solução Implementada

### 1. Rota API para Servir Arquivos

Criada a rota `/api/uploads/[...path]/route.ts` que:
- Serve arquivos da pasta `public/uploads/`
- Detecta automaticamente o tipo MIME baseado na extensão
- Adiciona headers de cache apropriados
- Suporta CORS para requisições do frontend

### 2. Função Utilitária para Conversão de URLs

Adicionada função `getFileApiUrl()` em `src/lib/utils.ts` que:
- Converte URLs antigas (`/uploads/arquivo.pdf`) para o novo formato (`/api/uploads/arquivo.pdf`)
- Mantém compatibilidade com URLs já no formato correto
- Suporta diferentes formatos de entrada

### 3. Atualização dos Componentes

Atualizados os componentes que usam PDFs:
- `PdfBackgroundRenderer`: Usa a função de conversão para carregar PDFs
- `PdfViewer`: Usa a função de conversão no componente Viewer

### 4. Script de Migração

Criado script `scripts/migrate-pdf-urls.js` para:
- Migrar URLs existentes no banco de dados
- Converter de `/uploads/` para `/api/uploads/`
- Manter registro das mudanças

## Como Usar

### 1. Executar Migração (se necessário)

```bash
npm run migrate-pdf-urls
```

### 2. Build e Start

```bash
npm run build
npm run start
```

### 3. Upload de Novos Arquivos

Novos uploads automaticamente usam a nova URL da API (`/api/uploads/`).

## Estrutura de Arquivos

```
studesk/
├── public/
│   └── uploads/           # Arquivos PDF salvos localmente
├── src/
│   ├── app/
│   │   └── api/
│   │       └── uploads/
│   │           └── [...path]/
│   │               └── route.ts  # Rota para servir arquivos
│   ├── components/
│   │   └── material-estudo/
│   │       ├── pdf-background-renderer.tsx  # Atualizado
│   │       └── pdf-viewer.tsx               # Atualizado
│   └── lib/
│       └── utils.ts       # Função getFileApiUrl()
└── scripts/
    └── migrate-pdf-urls.js  # Script de migração
```

## Vantagens da Solução

1. **Compatibilidade**: Funciona tanto em desenvolvimento quanto produção
2. **Performance**: Headers de cache otimizados
3. **Segurança**: Controle de acesso via API
4. **Flexibilidade**: Suporte a diferentes tipos de arquivo
5. **Migração Automática**: Script para atualizar dados existentes

## Troubleshooting

### Se PDFs ainda não carregam:

1. Verifique se a rota API está funcionando: `http://localhost:3000/api/uploads/nome-do-arquivo.pdf`
2. Execute o script de migração: `npm run migrate-pdf-urls`
3. Verifique se os arquivos existem em `public/uploads/`
4. Verifique os logs do console para erros específicos

### Se houver problemas de CORS:

A rota API já inclui headers CORS apropriados. Se ainda houver problemas, verifique se não há configurações conflitantes no `next.config.ts`. 