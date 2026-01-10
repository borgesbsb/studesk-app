# 📱 Guia PWA Offline - Studesk Mobile

## ✅ Implementações Completas

### 1. **Manifest.json Melhorado**
- ✅ Descrição detalhada do app
- ✅ Shortcuts para acesso rápido (Dashboard, Materiais, Disciplinas)
- ✅ Ícones otimizados (192x192, 512x512)
- ✅ Configuração standalone (aparece como app nativo)
- ✅ Orientação portrait-primary

### 2. **Estratégias de Cache Avançadas**
Configuradas no `next.config.ts`:

- **NetworkFirst**: Tenta rede primeiro, fallback para cache (timeout 10s)
- **CacheFirst**: Imagens servidas do cache
- **StaleWhileRevalidate**: JS/CSS serve cache enquanto atualiza em background
- **API Cache**: APIs com cache de 5 minutos e timeout de 5s

### 3. **Hook useOnline**
- Detecta mudanças no status de conexão
- Rastreia se usuário já esteve offline
- Permite mostrar mensagens contextuais

### 4. **Página Offline Melhorada** (`/offline`)
- ✅ Botão "Tentar novamente" com loading state
- ✅ Auto-redirect quando reconectar
- ✅ Tela de sucesso ao reconectar
- ✅ Dicas úteis para o usuário
- ✅ Design responsivo e animado

### 5. **Banner de Status Offline**
- ✅ Aparece no topo quando offline
- ✅ Banner verde quando reconecta
- ✅ Auto-oculta após 3 segundos
- ✅ Animações suaves

---

## 🧪 Como Testar o PWA Offline

### Pré-requisitos
1. Build de produção (PWA não funciona em dev):
```bash
cd /home/borgesbsb/projetos/studesk-app/studesk-monorepo
pnpm build:mobile
pnpm start:mobile
```

2. Acesse http://localhost:3031

### Teste 1: Instalação do PWA

**Chrome Desktop:**
1. Acesse http://localhost:3031
2. Clique no ícone de instalação na barra de endereços (➕)
3. Clique em "Instalar"
4. O app abrirá em janela standalone

**Chrome Android:**
1. Acesse http://localhost:3031
2. Menu (⋮) → "Instalar app" ou "Adicionar à tela inicial"
3. Confirme a instalação
4. O ícone aparecerá na tela inicial

**iOS Safari:**
1. Acesse http://localhost:3031
2. Toque no botão de compartilhar (quadrado com seta)
3. Role e toque em "Adicionar à Tela de Início"
4. Confirme

### Teste 2: Funcionamento Offline

**Método 1 - DevTools (Chrome):**
1. Abra DevTools (F12)
2. Vá para a aba "Application"
3. Na lateral esquerda, clique em "Service Workers"
4. Marque a checkbox "Offline"
5. Recarregue a página
6. ✅ Deve mostrar o banner amarelo "Você está offline"

**Método 2 - Network Tab:**
1. Abra DevTools (F12)
2. Vá para a aba "Network"
3. Clique no dropdown "No throttling"
4. Selecione "Offline"
5. Recarregue a página

**Método 3 - Modo Avião (Mobile Real):**
1. Ative o modo avião
2. Abra o PWA instalado
3. Navegue pelas páginas em cache
4. ✅ Deve funcionar com dados em cache

### Teste 3: Cache de Páginas

1. Acesse algumas páginas enquanto ONLINE:
   - http://localhost:3031/dashboard
   - http://localhost:3031/login

2. Ative o modo offline (qualquer método acima)

3. Tente acessar as páginas visitadas:
   - ✅ Devem carregar do cache
   - ✅ Imagens devem aparecer
   - ✅ CSS e JS funcionam

4. Tente acessar uma página NÃO visitada:
   - ✅ Deve redirecionar para `/offline`

### Teste 4: Reconexão

1. Com o app offline, observe o banner amarelo

2. Desative o modo offline:
   - DevTools: desmarque "Offline"
   - Mobile: desative modo avião

3. Resultados esperados:
   - ✅ Banner amarelo desaparece
   - ✅ Banner verde "Conexão restabelecida!" aparece por 3s
   - ✅ Console mostra "✅ Conexão restabelecida"

### Teste 5: Página Offline Interativa

1. Ative modo offline

2. Tente acessar uma página não cacheada:
   ```
   http://localhost:3031/pagina-nao-visitada
   ```

3. Deve mostrar a página `/offline` com:
   - ✅ Ícone de Wi-Fi desconectado
   - ✅ Mensagem "Você está offline"
   - ✅ Botão "Tentar novamente"
   - ✅ Dicas úteis

4. Clique em "Tentar novamente":
   - ✅ Mostra loading
   - ✅ Verifica conexão
   - Se offline: volta ao estado inicial
   - Se online: redireciona para dashboard

5. Desative modo offline enquanto na página:
   - ✅ Detecta automaticamente
   - ✅ Mostra tela "Conectado!"
   - ✅ Redireciona para dashboard após 1s

---

## 🔍 Inspeção do Service Worker

### Ver Service Worker Ativo

**Chrome DevTools:**
1. F12 → Application → Service Workers
2. Deve mostrar:
   - ✅ Status: activated
   - ✅ Source: sw.js
   - ✅ Escopo: /

### Ver Caches

**Chrome DevTools:**
1. F12 → Application → Cache Storage
2. Deve ter vários caches:
   - `offlineCache`
   - `next-image`
   - `static-image-assets`
   - `static-js-css-assets`
   - `api-cache`

3. Clique em cada cache para ver conteúdo

### Limpar Cache (Reset Completo)

**Chrome DevTools:**
1. F12 → Application
2. Clique em "Clear storage"
3. Marque todas as opções
4. Clique em "Clear site data"
5. Recarregue a página

---

## 📊 Checklist de Funcionalidades Offline

### Básico
- [ ] PWA instalável no dispositivo
- [ ] Service Worker registrado
- [ ] Manifest.json carregado corretamente
- [ ] Ícones aparecem na instalação

### Cache
- [ ] Páginas visitadas funcionam offline
- [ ] Imagens carregam do cache
- [ ] CSS e JS funcionam offline
- [ ] APIs retornam dados cacheados (quando disponível)

### UX Offline
- [ ] Banner amarelo aparece quando offline
- [ ] Banner verde aparece quando reconecta
- [ ] Página `/offline` aparece para recursos não cacheados
- [ ] Botão "Tentar novamente" funciona
- [ ] Auto-redirect ao reconectar

### Performance
- [ ] First load rápido
- [ ] Páginas cacheadas carregam instantaneamente offline
- [ ] Transições suaves entre online/offline

---

## 🐛 Troubleshooting

### Service Worker não está registrando
```bash
# Verifique se está em produção
echo $NODE_ENV  # deve ser "production"

# Rebuilde
pnpm build:mobile
pnpm start:mobile
```

### Cache não está funcionando
1. Limpe o cache do navegador
2. Desregistre o SW antigo:
   - DevTools → Application → Service Workers → Unregister
3. Recarregue a página

### PWA não instalável
- Verifique se está em HTTPS ou localhost
- Verifique console para erros no manifest
- Confirme que manifest.json está acessível

### Página offline não aparece
- Confirme que `fallbacks.document` está em next.config.ts
- Verifique que `/offline` existe e funciona
- Rebuilde o app

---

## 📈 Melhorias Futuras

### Background Sync
- Sincronizar dados quando voltar online
- Queue de ações offline (criar disciplina, etc)

### IndexedDB
- Armazenar dados do usuário localmente
- Permitir CRUD completo offline

### Push Notifications
- Notificar quando voltar online
- Lembretes de estudo

### Update Prompt
- Avisar quando houver nova versão
- Permitir atualização manual

---

## 🎯 Configurações Importantes

### next.config.ts
```typescript
{
  disable: process.env.NODE_ENV === 'development', // PWA só em produção
  register: true,                                   // Auto-registra SW
  skipWaiting: true,                                // Ativa novo SW imediatamente
  fallbacks: { document: '/offline' },              // Fallback offline
  runtimeCaching: [...]                             // Estratégias de cache
}
```

### manifest.json
- `display: "standalone"` - Aparece como app nativo
- `start_url: "/"` - URL inicial
- `scope: "/"` - Escopo do SW
- `shortcuts` - Atalhos para páginas importantes

---

## 📝 Comandos Úteis

```bash
# Build e start produção
pnpm build:mobile && pnpm start:mobile

# Ver logs do service worker (Chrome)
chrome://serviceworker-internals/

# Inspecionar manifest
http://localhost:3031/manifest.json

# Lighthouse audit (PWA score)
# DevTools → Lighthouse → Generate report
```

---

**Criado em**: 2025-12-22
**Status**: ✅ Implementação completa
**Próximo**: Testes e ajustes finais
