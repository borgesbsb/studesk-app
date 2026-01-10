#!/bin/bash

# Script de deploy completo para Studesk
# Faz deploy do backend (studesk) e do mobile PWA

set -e  # Para na primeira falha

SERVER="root@195.35.17.216"
BACKEND_REPO_PATH="/var/www/studesk"
MOBILE_PATH="/var/www/studesk-mobile"
BRANCH="main"

echo "🚀 Iniciando deploy completo do Studesk..."
echo ""

# ============================================
# 1. BACKEND (studesk)
# ============================================
echo "📦 Preparando deploy..."
cd ../studesk

echo "📤 Fazendo push das alterações..."
git push origin $BRANCH

echo ""
echo "📥 [BACKEND] Fazendo deploy no servidor..."

ssh $SERVER << 'BACKEND_SSH'
    set -e

    echo "🔄 [BACKEND] Atualizando backend..."
    cd /var/www/studesk || {
        echo "❌ Erro: Diretório /var/www/studesk não encontrado!"
        echo "Criando estrutura..."
        mkdir -p /var/www
        cd /var/www
        git clone https://github.com/borgesbsb/studesk-app.git studesk
        cd studesk
    }

    git fetch origin
    git reset --hard origin/main

    echo "📦 [BACKEND] Instalando dependências..."
    npm install

    echo "🏗️ [BACKEND] Fazendo build..."
    npm run build

    echo "🔄 [BACKEND] Reiniciando backend..."
    pm2 restart studesk || pm2 start npm --name "studesk" -- start

    echo "✅ [BACKEND] Deploy concluído!"
BACKEND_SSH

# ============================================
# 2. MOBILE PWA
# ============================================
echo ""
echo "📱 [MOBILE] Preparando deploy do mobile PWA..."

# Criar tarball do monorepo completo (agora dentro do repo studesk)
cd studesk-monorepo
echo "📦 [MOBILE] Criando pacote do monorepo..."
tar -czf /tmp/studesk-mobile.tar.gz \
    --exclude=node_modules \
    --exclude='apps/mobile/node_modules' \
    --exclude='packages/*/node_modules' \
    --exclude='apps/mobile/.next' \
    --exclude='.next' \
    --exclude='.certificates' \
    --exclude='.turbo' \
    .

# Copiar para o servidor
echo "📤 [MOBILE] Enviando mobile para servidor..."
scp /tmp/studesk-mobile.tar.gz $SERVER:/tmp/

# Deploy no servidor
echo "📥 [MOBILE] Fazendo deploy no servidor..."
ssh $SERVER << 'MOBILE_SSH'
    set -e

    echo "🔄 [MOBILE] Preparando diretório..."
    rm -rf /var/www/studesk-mobile
    mkdir -p /var/www/studesk-mobile
    cd /var/www/studesk-mobile

    echo "📦 [MOBILE] Extraindo arquivos..."
    tar -xzf /tmp/studesk-mobile.tar.gz
    rm /tmp/studesk-mobile.tar.gz

    echo "📦 [MOBILE] Instalando dependências do monorepo com pnpm..."
    pnpm install --shamefully-hoist

    echo "📦 [MOBILE] Gerando Prisma client..."
    cd packages/database
    pnpm exec prisma generate
    cd ../..

    echo "🏗️ [MOBILE] Fazendo build do mobile app..."
    cd apps/mobile
    pnpm run build

    echo "🔄 [MOBILE] Reiniciando mobile..."
    pm2 delete studesk-mobile 2>/dev/null || true
    pm2 start "pnpm start" --name "studesk-mobile"

    echo "✅ [MOBILE] Deploy concluído!"
MOBILE_SSH

# Limpar arquivo local
rm /tmp/studesk-mobile.tar.gz

echo ""
echo "✅ Deploy completo finalizado!"
echo ""
echo "🌐 URLs disponíveis:"
echo "   Backend:  http://195.35.17.216:3030"
echo "   Mobile:   http://195.35.17.216:3031"
echo ""
echo "💡 Configure HTTPS com Nginx + Let's Encrypt para habilitar PWA!"
