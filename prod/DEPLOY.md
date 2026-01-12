# 🚀 Guia de Deploy - Studesk

Documentação simples e direta para fazer deploy do Studesk em produção.

## 📋 Índice

- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Deploy do Mobile](#deploy-do-mobile)
- [Deploy do Backend](#deploy-do-backend)
- [Verificação](#verificação)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Estrutura do Projeto

```
studesk-app/
├── studesk/                    # Backend (app web principal)
│   ├── studesk-monorepo/      # Monorepo do mobile
│   │   └── apps/mobile/       # Mobile PWA
│   └── src/                   # Código do backend
└── prod/                      # Scripts de deploy
    ├── deploy-mobile.sh       # ✅ Deploy do mobile
    └── deploy.sh              # Deploy do backend
```

## ⚙️ Pré-requisitos

- Git configurado com acesso ao repositório
- SSH configurado para `root@195.35.17.216`
- Scripts com permissão de execução (`chmod +x`)

---

## 📱 Deploy do Mobile

### Comando

```bash
cd /home/borgesbsb/projetos/studesk-app/prod
./deploy-mobile.sh
```

### O que o script faz

1. **Git Push**: Envia alterações para o GitHub
2. **SSH no servidor**: Conecta em `root@195.35.17.216`
3. **Git Pull**: Atualiza código no servidor
4. **Cria arquivos .env**: Configura variáveis de ambiente
5. **Instala dependências**: `pnpm install`
6. **Gera Prisma Client**: `pnpm exec prisma generate`
7. **Para aplicação**: `pm2 stop studesk-mobile` (evita conflitos)
8. **Limpa build anterior**: `rm -rf .next` (previne builds corrompidos)
9. **Build limpo**: `pnpm run build`
10. **Restart PM2**: Reinicia o processo `studesk-mobile`
11. **Salva config**: `pm2 save`

### Tempo estimado

~3-5 minutos

---

## 🖥️ Deploy do Backend

### Comando

```bash
cd /home/borgesbsb/projetos/studesk-app/prod
./deploy.sh
```

### O que o script faz

1. **Git Push**: Envia alterações para o GitHub
2. **SSH no servidor**: Conecta em `root@195.35.17.216`
3. **Git Pull**: Atualiza código no servidor
4. **Instala dependências**: `npm install`
5. **Para aplicação**: `pm2 stop studesk` (evita conflitos)
6. **Limpa build anterior**: `rm -rf .next` (previne builds corrompidos)
7. **Build limpo**: `npm run build`
8. **Restart PM2**: Reinicia o processo `studesk`
9. **Salva config**: `pm2 save`

### Tempo estimado

~2-3 minutos

---

## ✅ Verificação

### 1. Verificar status dos serviços

```bash
ssh root@195.35.17.216 "pm2 status"
```

**Saída esperada:**
```
┌────┬────────────────┬─────────┬────────┬───────────┐
│ id │ name           │ status  │ uptime │ mem       │
├────┼────────────────┼─────────┼────────┼───────────┤
│ 9  │ studesk        │ online  │ 1h     │ 3.4mb     │
│ 14 │ studesk-mobile │ online  │ 5m     │ 92.0mb    │
└────┴────────────────┴─────────┴────────┴───────────┘
```

### 2. Verificar logs

**Mobile:**
```bash
ssh root@195.35.17.216 "pm2 logs studesk-mobile --lines 20 --nostream"
```

**Backend:**
```bash
ssh root@195.35.17.216 "pm2 logs studesk --lines 20 --nostream"
```

### 3. Testar aplicação

- **Backend**: http://195.35.17.216:3030 (interno)
- **Mobile**: http://195.35.17.216:3031 (interno)
- **Produção**: https://studesk.pro (público)

---

## 🛡️ Prevenção de Problemas

### Build Corrompido (Erro 502)

Os scripts de deploy agora **previnem builds corrompidos** automaticamente:

**Como funcionava antes:**
- Build incremental sobre código antigo
- Conflitos entre versões
- Crashes em loop → Erro 502

**Como funciona agora:**
1. ✅ Para a aplicação
2. ✅ Remove `.next` completamente
3. ✅ Build limpo do zero
4. ✅ Reinicia com código novo
5. ✅ Salva configuração

**Resultado**: Zero problemas de build corrompido! 🎉

---

## 🔧 Troubleshooting

### Problema: Erro de permissão do Git

```bash
ssh root@195.35.17.216 "git config --global --add safe.directory /var/www/studesk-app"
```

### Problema: Processo não reinicia

```bash
ssh root@195.35.17.216 "pm2 restart studesk-mobile"
# ou
ssh root@195.35.17.216 "pm2 restart studesk"
```

### Problema: Erro de build

```bash
# Limpar e reinstalar dependências
ssh root@195.35.17.216 "cd /var/www/studesk-app/studesk-monorepo && rm -rf node_modules && pnpm install"
```

### Problema: Variáveis de ambiente

Verificar se os arquivos `.env` existem:

```bash
ssh root@195.35.17.216 "cat /var/www/studesk-app/studesk-monorepo/apps/mobile/.env"
```

Se não existir, o script `deploy-mobile.sh` cria automaticamente.

### Reiniciar completamente

```bash
ssh root@195.35.17.216 "pm2 restart all"
```

---

## 📍 Localizações no Servidor

### Diretórios

- **Repositório**: `/var/www/studesk-app/`
- **Backend**: `/var/www/studesk/`
- **Mobile**: `/var/www/studesk-app/studesk-monorepo/apps/mobile/`

### Arquivos de configuração

- **Backend .env**: `/var/www/studesk/.env`
- **Mobile .env**: `/var/www/studesk-app/studesk-monorepo/apps/mobile/.env`
- **Database .env**: `/var/www/studesk-app/studesk-monorepo/packages/database/.env`
- **Nginx**: `/etc/nginx/sites-available/studesk`

### Banco de dados

- **Host**: `localhost`
- **Porta**: `5432`
- **Database**: `studesk`
- **User**: `studesk`
- **Password**: `studesk2026`

---

## 🎯 Checklist Rápido

Antes de fazer deploy:

- [ ] Código commitado localmente
- [ ] Testes passando (se houver)
- [ ] SSH funcionando

Após o deploy:

- [ ] `pm2 status` mostra serviços online
- [ ] Logs sem erros críticos
- [ ] App acessível em https://studesk.pro
- [ ] Login funcionando
- [ ] Navegação entre páginas OK

---

## 📞 Contatos de Emergência

**Servidor**: 195.35.17.216
**SSH**: `root@195.35.17.216`
**Domínio**: https://studesk.pro

---

**Última atualização**: 2026-01-12
**Autor**: Claude Code
