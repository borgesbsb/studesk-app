# Troubleshooting - Problemas Comuns e Soluções

## Setup e Build

### Syncfusion PDF Viewer não carrega

**Sintomas**:
- Erro "License key not registered"
- Viewer não inicializa
- Mensagem de trial expirado

**Causa**: Licença do Syncfusion não configurada ou expirada

**Solução**:
1. Obter nova chave em https://www.syncfusion.com/account/manage-trials/start-trials
2. Adicionar ao `.env.local`:
```env
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY="sua-chave-aqui"
```
3. Reiniciar o servidor de desenvolvimento

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
1. Verificar variáveis de ambiente (incluindo `NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY`)
2. Limpar cache: `rm -rf .next`
3. Reinstalar dependências se necessário

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

### Syncfusion Trial Expired

**Sintomas**:
- Mensagem de trial expirado
- Viewer exibe marca d'água
- PDF não carrega completamente

**Solução**:
1. Obter nova chave trial em https://www.syncfusion.com/account/manage-trials/start-trials
2. Atualizar variável de ambiente `NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY`
3. Reiniciar servidor de desenvolvimento
4. Limpar cache do browser

### Controles de visualização não aparecem

**Sintomas**:
- Botão de Settings (⚙️) não visível no header
- Modal de ajustes não abre
- Toolbar do Syncfusion oculta no mobile

**Causa**: Toolbar padrão do Syncfusion pode estar oculta em telas pequenas

**Solução implementada**:
- Controles customizados no **header da página** (não na toolbar do Syncfusion)
- Botão Settings (⚙️) sempre visível entre cronômetro e botão Salvar
- Modal flutuante com todas as opções de visualização

**Verificar**:
```typescript
// apps/mobile/src/app/material/[id]/page.tsx
<button onClick={() => setShowDisplaySettings(!showDisplaySettings)}>
  <Settings className="h-4 w-4 text-gray-600" />
</button>
```

### Controles de zoom nativos (Magnification) não aparecem

**Sintomas**:
- Toolbar do Syncfusion não mostra controles de zoom
- Não é possível ajustar zoom manualmente (zoom in/out)
- `enableMagnification={true}` definido mas controles invisíveis

**Causa**: Toolbar com muitos itens pode colapsar/ocultar alguns controles em telas mobile pequenas

**Solução implementada**:
1. Simplificar toolbar focando em itens essenciais para mobile
2. Posicionar MagnificationTool no início da toolbar para maior visibilidade
3. Adicionar `enableToolbar={true}` explicitamente

**Verificar**:
```typescript
// apps/mobile/src/components/pdf/SyncfusionPdfViewer.tsx
const toolbarSettings: ToolbarSettingsModel = {
  showTooltip: true,
  toolbarItems: [
    'PageNavigationTool',
    'MagnificationTool',  // ← Posicionado no início para visibilidade
    'SearchOption',
    'AnnotationEditTool',
    // ... outros controles customizados
  ]
};

<PdfViewerComponent
  enableToolbar={true}  // ← Explicitamente habilitado
  enableMagnification={true}
  toolbarSettings={toolbarSettings}
  // ...
/>
```

**Controles de zoom disponíveis**:
- **Zoom In (+)**: Aumentar zoom
- **Zoom Out (-)**: Diminuir zoom
- **Zoom %**: Dropdown com percentuais predefinidos
- **Fit to Page**: Ajustar página inteira à tela
- **Fit to Width**: Ajustar largura à tela

### Modo Reflow não funciona

**Sintomas**:
- Ativar "Modo Reflow" não muda visualização
- Ainda precisa scroll horizontal
- Erro no console sobre TextReflow

**Causa**: Syncfusion TextReflow pode não estar disponível ou configurado incorretamente

**Solução implementada**:
Usar API de `Magnification` ao invés de `TextReflow`:
```typescript
// Simula "reflow" com zoom otimizado
viewerRef.current.magnification.fitToWidth();
const currentZoom = viewerRef.current.magnification.zoomFactor;
viewerRef.current.magnification.zoomTo(currentZoom * 1.2);
```

**Alternativa**:
Use controles de **Modo de Ajuste**:
- **Largura**: `fitToWidth` - melhor para leitura mobile
- **Página**: `fitToPage` - visualiza página completa
- **Auto**: zoom 100%

### Preferências não são salvas

**Sintomas**:
- Ao reabrir PDF, configurações voltam ao padrão
- Brilho/Contraste resetam
- Modo de leitura não persiste

**Causa**: LocalStorage não está salvando ou sendo limpado

**Debug**:
```javascript
// No console do browser
localStorage.getItem('syncfusion-pdf-brightness')
localStorage.getItem('syncfusion-pdf-contrast')
localStorage.getItem('syncfusion-pdf-reading-mode')
localStorage.getItem('syncfusion-pdf-fit-mode')
localStorage.getItem('syncfusion-pdf-reflow-mode')
```

**Solução**:
- Verificar se browser permite localStorage
- Não usar "Private/Incognito Mode"
- Verificar se o domínio/porta não mudou

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

# WASM files
ls -la public/wasm/

# Uploads
ls -la public/uploads/ | head -20

# Verificar variáveis de ambiente
echo $NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY
```

### Reset completo (desenvolvimento)

```bash
# ⚠️ CUIDADO: Apaga tudo!
rm -rf .next
rm -rf node_modules
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Mobile/PWA (studesk-monorepo)

### App mobile não funciona no celular (rede local)

**Sintomas**:
- Funciona em `http://localhost:3031` no PC
- Falha ao acessar via `http://192.168.15.8:3031` no celular
- Erro: `ERR_CONNECTION_REFUSED` ou `Failed to fetch`

**Causa**: URLs hardcoded para `localhost:3030` no código

**Solução**:
Usar utilitário de detecção dinâmica de URL. **Arquivos já corrigidos**:
```typescript
import { getBackendBaseUrl, getApiBaseUrl } from '@/lib/api-base-url'

// Para PDFs e recursos
const backendUrl = getBackendBaseUrl() // http://192.168.15.8:3030

// Para chamadas API
const apiUrl = getApiBaseUrl() // http://192.168.15.8:3030/api
```

**Arquivos corrigidos**:
- `apps/mobile/src/app/disciplinas/[disciplinaId]/materiais/page.tsx`
- `apps/mobile/src/app/materiais/page.tsx`
- `apps/mobile/src/app/material/[id]/page.tsx`
- `apps/mobile/src/components/materiais/google-drive-picker-mobile.tsx`

### Erro CORS: "wildcard '*' when credentials mode is 'include'"

**Sintoma completo**:
```
Access to fetch at 'http://192.168.15.8:3030/api/disciplinas' from origin
'http://192.168.15.8:3031' has been blocked by CORS policy:
The value of the 'Access-Control-Allow-Origin' header in the response must not
be the wildcard '*' when the request's credentials mode is 'include'.
```

**Causa**:
- Mobile app usa `credentials: 'include'` para enviar cookies de autenticação
- Backend retorna `Access-Control-Allow-Origin: *` (wildcard)
- CORS não permite wildcard quando credentials são usados

**Solução**:
Configurar origem específica no `next.config.ts` do backend (`/studesk/next.config.ts`):

```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        // ✅ Origem específica ao invés de '*'
        { key: 'Access-Control-Allow-Origin', value: 'http://192.168.15.8:3031' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin' },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Max-Age', value: '86400' },
      ],
    },
  ]
}
```

**Verificar**: Após mudança, reiniciar servidor backend (`npm run dev` na porta 3030).

### PDF não baixa para cache offline

**Sintomas**:
- Clica em "Baixar" mas nada acontece
- Console mostra erro de fetch
- Badge permanece "Online" (não muda para "Offline")

**Debug via Chrome DevTools**:
```bash
# No PC, conectar celular via USB
# Abrir Chrome → chrome://inspect
# Selecionar dispositivo e inspecionar
```

**Verificar no console do celular**:
1. URL gerada está correta? (deve usar IP da rede, não localhost)
2. Erro de CORS?
3. Erro 404? (backend não está servindo o arquivo)

**Checklist**:
- ✅ Backend rodando na porta 3030
- ✅ Arquivo existe em `public/uploads/` no backend
- ✅ CORS configurado corretamente
- ✅ Firewall permite conexões na porta 3030

### IndexedDB quota exceeded

**Sintomas**:
- Erro ao baixar PDF grande
- "QuotaExceededError"

**Causa**: Cache atingiu limite de 500MB

**Solução**: Service faz cleanup automático (LRU), mas pode forçar:
```typescript
// No console do celular (Chrome DevTools)
await pdfCacheService.cleanupOldPdfs(100 * 1024 * 1024) // Remove até atingir 100MB livre
```

**Ou**: Remover PDFs manualmente da lista de materiais (botão 🗑️).

### Google Drive não conecta no mobile

**Sintomas**:
- Botão "Conectar Google Drive" não funciona
- Popup OAuth não abre

**Causa**: OAuth flow precisa redirecionar para o backend (porta 3030)

**Importante**:
- Autenticação OAuth acontece no **backend** (porta 3030)
- Tokens são salvos no banco de dados
- Mobile apenas consome a API para listar/importar arquivos

**Solução**: Conectar Google Drive pelo app **web** primeiro (localhost:3030 ou IP:3030), depois usar no mobile.

### Logs de debug mobile

**Como ver logs do celular**:

1. **Chrome DevTools** (recomendado):
   ```bash
   # Conectar celular via USB
   # Ativar "Depuração USB" no celular
   # Chrome → chrome://inspect → selecionar dispositivo
   ```

2. **Console.log estratégicos**:
   ```typescript
   console.log('🟠 [api-base-url] Detectando URL:', { hostname, protocol })
   console.log('🔵 [api-client] Fazendo requisição:', { url, method })
   console.log('🟢 [api-client] Resposta recebida:', { status, ok })
   console.log('🔴 [api-client] Erro:', error)
   ```

## Quando Pedir Ajuda

Se nenhuma solução acima funcionou, coletar:

1. **Erro completo**: Console do browser + terminal
2. **Contexto**: O que estava fazendo quando erro ocorreu?
3. **Ambiente**: Dev ou produção? PC ou celular?
4. **Versão**: Node, npm, PostgreSQL
5. **Tentativas**: O que já tentou?
6. **Para mobile**: Logs do Chrome DevTools do celular

---

**Última atualização**: 2025-12-28
