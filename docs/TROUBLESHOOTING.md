# Troubleshooting - Problemas Comuns e Soluções

## Setup e Build

### WebViewer não carrega / Arquivos não encontrados

**Sintomas**:
- Erro 404 ao carregar PDF
- WebViewer não inicializa
- "Failed to load WebViewer files"

**Causa**: Assets do PDFTron não foram copiados para `/public/lib/webviewer`

**Solução**:
```bash
npm run copy-webviewer
```

### Erro Prisma após mudança no schema

**Sintomas**:
- `Type 'PrismaClient' is not assignable...`
- Modelos não encontrados

**Solução**:
```bash
npx prisma generate
npx prisma db push
```

### Build falha

**Sintomas**: Erro durante `npm run build`

**Checklist**:
1. Rodar `npm run copy-webviewer` antes do build
2. Verificar variáveis de ambiente
3. Limpar cache: `rm -rf .next`

## PDFs e Upload

### PDF não aparece após upload

**Causa**: Arquivo não foi salvo corretamente

**Debug**:
```bash
ls -la public/uploads/
# Verificar se o arquivo existe com hash-nome.pdf
```

**Verificar**:
- Permissões da pasta `public/uploads/`
- Espaço em disco disponível
- Tamanho do arquivo (limite atual: 100MB)

### PDFs não carregam em produção

**Causa**: Next.js não serve arquivos de subpastas em `public/` automaticamente

**Solução implementada**:
- API Route `/api/static/uploads/[...path]` serve os arquivos
- URLs devem usar `/api/static/uploads/` ao invés de `/uploads/`

**Migração de URLs antigas**:
```bash
npm run migrate-pdf-urls
```

### WebViewer Trial Expired

**Sintomas**:
- Erro: "Your 7-day trial has expired"
- PDF não carrega

**Solução Automática**: Sistema detecta e recarrega automaticamente

**Solução Manual**:
1. Limpar cache do browser
2. Recarregar a página
3. Se persistir, obter trial key em https://dev.apryse.com/

## Planos de Estudo

### Erro ao criar plano

**Sintomas**: "Argument is missing" ou erro de validação

**Causas comuns**:
1. Campo `planoId` não informado ao criar `SemanaEstudo`
2. Disciplinas não selecionadas
3. Datas inválidas (fim antes de início)

**Solução**: Verificar payload no server action e validar dados antes de enviar

### Semanas vazias aparecem no plano

**Causa**: Lógica de filtro de semanas não aplicada

**Solução implementada**: Filtro automático remove semanas sem disciplinas

## Disciplinas e Materiais

### Erro ao deletar material

**Sintomas**: `Foreign key constraint violated: DisciplinaMaterial_materialId_fkey`

**Causa**: Relações N:M não são deletadas automaticamente

**Solução implementada**: Service deleta manualmente:
1. `DisciplinaMaterial` (relação com disciplinas)
2. `ChunkUtilizado` (chunks de texto)
3. Depois deleta o material (cascade remove o resto)

### Material vinculado a disciplina não aparece

**Causa**: Relação N:M não criada corretamente

**Debug**:
```sql
SELECT * FROM "DisciplinaMaterial"
WHERE "materialId" = 'material-id';
```

## Dashboard

### Materiais do dia não aparecem

**Checklist**:
1. Plano de estudo criado?
2. Semana atual existe no plano?
3. Disciplinas distribuídas na semana?
4. Materiais vinculados às disciplinas?

**Debug**: Verificar no Prisma Studio:
```bash
npx prisma studio
# Navegar: PlanoEstudo → SemanaEstudo → DisciplinaSemana
```

### Tempo não está sendo registrado

**Causas**:
1. `HistoricoLeitura` não sendo criado
2. Sessão PDF não registrou tempo
3. `tempoReal` vs `tempoSessao` não configurado

**Solução**: Usar "Transferir tempo de sessões" no dashboard

## Autenticação

### Login não funciona

**Checklist**:
1. `NEXTAUTH_SECRET` configurado no `.env`
2. `NEXTAUTH_URL` correto
3. Banco de dados acessível
4. Tabela `User` existe

**Debug**:
```bash
npx prisma studio
# Verificar se usuário existe na tabela User
```

### Sempre redireciona para login

**Causa**: Middleware de autenticação bloqueando rota

**Verificar**:
- `src/middleware.ts` - matcher está correto?
- Token JWT está sendo gerado?

## Performance

### Carregamento lento

**Otimizações implementadas**:
1. Server Components por padrão
2. Cache de chunks de texto (ChunkCache)
3. Lazy loading de componentes pesados

**Melhorias futuras**:
- Redis para cache de queries
- CDN para assets estáticos
- Lazy load de PDFs grandes

### Queries lentas

**Debug**:
```typescript
// Adicionar logging
console.time('query')
const result = await prisma.model.findMany()
console.timeEnd('query')
```

**Otimizações**:
- Adicionar índices no schema Prisma
- Usar `select` para buscar apenas campos necessários
- Fazer queries em paralelo com `Promise.all()`

## Database

### Conexão falha

**Sintomas**: "Can't reach database server"

**Checklist**:
1. PostgreSQL rodando?
2. `DATABASE_URL` correto?
3. Database existe?
4. Credenciais corretas?

**Testar conexão**:
```bash
npx prisma db pull
```

### Migration conflicts

**Sintomas**: "Migration failed" ou divergência de schema

**Solução conservadora** (desenvolvimento):
```bash
# Backup do banco primeiro!
npx prisma db push --force-reset
npx prisma generate
```

**Solução produção**:
```bash
npx prisma migrate deploy
```

## Erros Comuns no Console

### "Hydration error"

**Causa**: Server e Client renderizaram HTML diferente

**Soluções comuns**:
1. Usar `useEffect` para código que roda apenas no client
2. Adicionar `suppressHydrationWarning` onde apropriado
3. Verificar renderização condicional baseada em `window`

### "Module not found"

**Causa**: Import incorreto ou dependência não instalada

**Solução**:
```bash
npm install
# ou reinstalar
rm -rf node_modules package-lock.json
npm install
```

### "Cannot read property of undefined"

**Causa comum**: Dados não carregados antes de renderizar

**Solução**: Adicionar checks:
```typescript
if (!data) return <Loading />
```

## Scripts Úteis

### Verificar saúde do sistema

```bash
# Database
npx prisma db pull

# Build test
npm run build

# WebViewer files
ls -la public/lib/webviewer/

# Uploads
ls -la public/uploads/ | head -20
```

### Reset completo (desenvolvimento)

```bash
# ⚠️ CUIDADO: Apaga tudo!
rm -rf .next
rm -rf node_modules
npm install
npm run copy-webviewer
npx prisma generate
npx prisma db push
npm run dev
```

## Quando Pedir Ajuda

Se nenhuma solução acima funcionou, coletar:

1. **Erro completo**: Console do browser + terminal
2. **Contexto**: O que estava fazendo quando erro ocorreu?
3. **Ambiente**: Dev ou produção?
4. **Versão**: Node, npm, PostgreSQL
5. **Tentativas**: O que já tentou?

---

**Última atualização**: 2025-01-11
