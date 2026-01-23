# Sistema de Streaming de Vídeos do Google Drive

## Visão Geral

Este documento descreve a implementação completa do sistema de streaming de vídeos do Google Drive no Studesk. O sistema permite que vídeos armazenados no Google Drive sejam reproduzidos na aplicação com duas opções:

1. **Streaming Online**: Reprodução direta do Google Drive sem download (requer internet)
2. **Download e Cache**: Baixa o vídeo para o cache local (IndexedDB) para reprodução offline

## Arquitetura

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Material   │───────→ │ GoogleDrive  │───────→ │   HTML5      │
│   Estudo     │         │   Streaming  │         │   Player     │
│   (DB)       │         │   API        │         │   + Track    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                         │
       │                         │
       ├─ googleDriveFileId ─────┤
       ├─ googleDriveFileName     │
       └─ arquivoVideoUrl ────────┘
          (gdrive://fileId)
```

## Mudanças no Schema do Banco

### MaterialEstudo Model

Foram adicionados 2 novos campos:

```prisma
model MaterialEstudo {
  // ... campos existentes

  googleDriveFileId   String?   // FileId único do Google Drive
  googleDriveFileName String?   // Nome original do arquivo

  @@index([googleDriveFileId])  // Index para lookup rápido
}
```

### User Model (já existente)

Campos para OAuth do Google Drive:

```prisma
model User {
  // ... campos existentes

  googleDriveAccessToken  String?   @db.Text
  googleDriveRefreshToken String?   @db.Text
  googleDriveTokenExpiry  DateTime?
}
```

## Scripts de Seed

### 3-seed-prod-videos-fixed.mjs

Script corrigido para cadastrar vídeos do Google Drive:

**O que faz:**
1. Lista vídeos usando `rclone lsjson` (retorna fileId + metadata)
2. Extrai o `fileId` de cada vídeo
3. Cadastra no banco com:
   - `googleDriveFileId`: para streaming
   - `googleDriveFileName`: nome original
   - `arquivoVideoUrl`: marker `gdrive://fileId`
4. Estima duração baseada no tamanho do arquivo

**Comando para executar:**
```bash
# Modo teste (5 vídeos por disciplina)
node scripts/3-seed-prod-videos-fixed.mjs

# Modo full (todos os vídeos)
# Edite MODE = 'full' no script antes de executar
```

## Endpoints de API

### 1. Streaming Endpoint

**Rota:** `/api/video/google-drive-stream/[materialId]`

**Método:** `GET`

**O que faz:**
- Busca material no banco
- Obtém OAuth tokens do usuário
- Renova token se expirado
- Faz streaming do Google Drive com suporte a **Range requests**
- Retorna stream com headers adequados para HTML5 player

**Range Requests:**
Permite "seek" no player (avançar/voltar no vídeo) sem baixar tudo.

**Exemplo de uso:**
```javascript
const streamUrl = `/api/video/google-drive-stream/${materialId}`
videoElement.src = streamUrl
```

### 2. Download Endpoint

**Rota:** `/api/video/google-drive-download/[materialId]`

**Método:** `GET`

**O que faz:**
- Busca material no banco
- Obtém OAuth tokens do usuário
- Faz download completo do vídeo
- Retorna como blob para salvar no cache

**Exemplo de uso:**
```javascript
const response = await fetch(`/api/video/google-drive-download/${materialId}`)
const blob = await response.blob()
await videoCacheService.saveVideoFromBlob(materialId, blob, fileName, mimeType)
```

## Player de Vídeo Atualizado

### Detecção de Vídeos do Google Drive

O player detecta automaticamente vídeos do Google Drive verificando:
- `arquivoVideoUrl` inicia com `gdrive://`, ou
- `googleDriveFileId` não é null

```typescript
const isGDrive = materialResponse.data.arquivoVideoUrl?.startsWith('gdrive://') ||
                materialResponse.data.googleDriveFileId !== null
```

### Fluxo de Reprodução

```
1. Usuário abre vídeo
   ↓
2. Sistema detecta: é Google Drive?
   ↓
   ├─ SIM: Verifica cache
   │   ├─ Tem no cache? → Reproduzir do cache
   │   └─ Não tem? → Mostrar opções
   │       ├─ Streaming Online
   │       └─ Download e Cache
   │
   └─ NÃO: Busca do cache local (vídeos tradicionais)
```

### UI de Opções

Quando vídeo não está no cache, usuário vê modal com 2 opções:

**Opção 1: Streaming Online** (ícone: Wifi)
- Reproduz diretamente do Google Drive
- Não ocupa espaço no dispositivo
- Requer internet ativa

**Opção 2: Download e Cache** (ícone: Download)
- Baixa vídeo completo para IndexedDB
- Permite reprodução offline
- Limite de 2GB de cache total

### Tracking de Progresso

Ambas as opções usam o mesmo sistema de tracking:
- Cronômetro de tempo assistido
- Tempo atual do vídeo (`onTimeUpdate`)
- Salvamento de progresso
- Histórico de visualização

## Vantagens do Sistema

### 1. Economia de Armazenamento
- Vídeos permanecem no Google Drive
- Servidor não precisa armazenar ~150GB de vídeos
- Apenas metadados no banco

### 2. Flexibilidade
- Usuário escolhe: streaming ou cache
- Cache é opcional e gerenciado automaticamente
- Suporta reprodução offline (quando cacheado)

### 3. Performance
- Range requests permitem seek instantâneo
- Cache IndexedDB é rápido (acesso local)
- OAuth tokens são renovados automaticamente

### 4. Rastreamento Completo
- Mesmo streaming online é rastreado
- Tempo assistido, progresso, histórico
- Sistema de cronômetro funciona em ambos os modos

## Limitações e Considerações

### 1. Cache Limit (2GB)
- IndexedDB tem limite de ~2GB no navegador
- ~20 vídeos de 100MB cada
- LRU eviction automático pelo VideoCacheService

### 2. Requer OAuth
- Usuário precisa autorizar acesso ao Google Drive
- Tokens são renovados automaticamente
- Se tokens inválidos, streaming falha

### 3. Streaming requer internet
- Opção "Streaming Online" não funciona offline
- "Download e Cache" permite offline após download

## Testes

### Checklist de Testes

- [ ] Abrir vídeo do Google Drive (primeira vez)
- [ ] Ver modal com 2 opções
- [ ] Testar "Streaming Online"
  - [ ] Vídeo reproduz?
  - [ ] Seek funciona (avançar/voltar)?
  - [ ] Cronômetro está rodando?
  - [ ] Progresso é salvo?
- [ ] Testar "Download e Cache"
  - [ ] Toast de "baixando" aparece?
  - [ ] Download completa?
  - [ ] Vídeo reproduz após download?
  - [ ] Progresso é salvo?
- [ ] Reabrir mesmo vídeo
  - [ ] Vídeo carrega do cache diretamente?
  - [ ] Não mostra modal de opções?
- [ ] Testar renovação de token
  - [ ] Aguardar expiração do token
  - [ ] Abrir vídeo
  - [ ] Token é renovado automaticamente?

## Deploy em Produção

### Passo 1: Aplicar Schema

```bash
ssh root@195.35.17.216
cd /var/www/studesk-app
npx prisma db push
```

### Passo 2: Copiar Scripts

```bash
# Do computador local
scp scripts/3-seed-prod-videos-fixed.mjs root@195.35.17.216:/var/www/studesk-app/scripts/
scp scripts/delete-incorrect-videos.mjs root@195.35.17.216:/var/www/studesk-app/scripts/
```

### Passo 3: Limpar Vídeos Incorretos (se houver)

```bash
ssh root@195.35.17.216
cd /var/www/studesk-app
node scripts/delete-incorrect-videos.mjs
```

### Passo 4: Cadastrar Vídeos

```bash
# Modo teste primeiro (5 vídeos por disciplina)
node scripts/3-seed-prod-videos-fixed.mjs

# Se teste OK, editar MODE = 'full' e executar novamente
```

### Passo 5: Deploy da Aplicação

```bash
# Do computador local
git add .
git commit -m "feat: adiciona sistema de streaming de vídeos do Google Drive"
git push

# Deploy via PM2
ssh root@195.35.17.216
cd /var/www/studesk-app
git pull
npm run build
pm2 restart studesk
```

## Monitoramento

### Logs importantes

```bash
# Ver logs do streaming
pm2 logs studesk | grep "streaming"

# Ver logs de OAuth
pm2 logs studesk | grep "Token"

# Ver logs de cache
# (no navegador, console do desenvolvedor)
```

### Métricas de uso

```sql
-- Vídeos cadastrados
SELECT COUNT(*) FROM "MaterialEstudo" WHERE "googleDriveFileId" IS NOT NULL;

-- Vídeos por disciplina
SELECT d.nome, COUNT(dm."materialId")
FROM "Disciplina" d
LEFT JOIN "DisciplinaMaterial" dm ON d.id = dm."disciplinaId"
LEFT JOIN "MaterialEstudo" m ON dm."materialId" = m.id
WHERE m."googleDriveFileId" IS NOT NULL
GROUP BY d.nome;

-- Histórico de visualização de vídeos
SELECT COUNT(*) FROM "HistoricoLeitura" hl
JOIN "MaterialEstudo" m ON hl."materialId" = m.id
WHERE m."tipo" = 'VIDEO';
```

## Troubleshooting

### Erro: "Usuário não autorizou acesso ao Google Drive"

**Causa:** Usuário não tem tokens OAuth no banco

**Solução:**
1. Implementar fluxo de autorização Google Drive
2. Ou adicionar tokens manualmente no Prisma Studio

### Erro: "Token expirado"

**Causa:** Token OAuth expirou e renovação falhou

**Solução:**
- Verificar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no .env
- Verificar se refresh_token está salvo no banco
- Reautorizar usuário no Google Drive

### Vídeo não reproduz

**Causa:** Range requests não suportados ou erro no streaming

**Solução:**
1. Verificar logs: `pm2 logs studesk`
2. Testar endpoint diretamente: `/api/video/google-drive-stream/[materialId]`
3. Verificar se fileId é válido
4. Tentar opção "Download e Cache"

### Cache não funciona

**Causa:** IndexedDB desabilitado ou cheio

**Solução:**
1. Verificar permissões do navegador
2. Limpar cache antigo: `videoCacheService.clearAll()`
3. Verificar espaço disponível: `videoCacheService.getTotalSize()`

---

## Referências Técnicas

- Google Drive API v3: https://developers.google.com/drive/api/v3
- Range Requests (RFC 7233): https://tools.ietf.org/html/rfc7233
- IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- OAuth 2.0: https://oauth.net/2/
- rclone lsjson: https://rclone.org/commands/rclone_lsjson/
