#!/bin/bash

# Script de deploy completo para Studesk
# Faz deploy do backend (studesk) e do mobile PWA

set -e  # Para na primeira falha

SERVER="root@195.35.17.216"
REPO_PATH="/var/www/studesk-app"
BACKEND_PATH="$REPO_PATH/studesk"
MOBILE_PATH="$REPO_PATH/studesk-monorepo"
BRANCH="main"

echo "🚀 Iniciando deploy completo do Studesk..."
echo ""

# ============================================
# 1. BACKEND (studesk)
# ============================================
echo "📤 Fazendo push das alterações..."
git push origin $BRANCH

echo ""
echo "📥 [BACKEND] Fazendo deploy no servidor..."

ssh $SERVER << 'BACKEND_SSH'
    set -e

    echo "🔄 [BACKEND] Atualizando repositório principal..."
    cd /var/www/studesk-app

    git fetch origin
    git reset --hard origin/main

    echo "🔄 [BACKEND] Navegando para backend..."
    cd studesk

    echo "📦 [BACKEND] Instalando dependências..."
    npm install

    echo "🛑 [BACKEND] Parando aplicação..."
    pm2 stop studesk 2>/dev/null || true

    echo "🧹 [BACKEND] Limpando build anterior..."
    rm -rf .next

    echo "🏗️ [BACKEND] Fazendo build..."
    npm run build

    echo "🔄 [BACKEND] Reiniciando backend..."
    pm2 delete studesk 2>/dev/null || true
    pm2 start npm --name "studesk" -- start

    echo "💾 [BACKEND] Salvando configuração PM2..."
    pm2 save

    echo "✅ [BACKEND] Deploy concluído!"
BACKEND_SSH

# ============================================
# 2. MOBILE PWA
# ============================================
echo ""
echo "📱 [MOBILE] Fazendo deploy do mobile PWA..."

ssh $SERVER << 'MOBILE_SSH'
    set -e

    echo "🔄 [MOBILE] Navegando para monorepo..."
    cd /var/www/studesk-app/studesk-monorepo

    echo "📝 [MOBILE] Configurando arquivos .env..."
    # .env no package database
    cat > packages/database/.env << 'ENVEOF'
DATABASE_URL="postgresql://studesk:studesk2026@localhost:5432/studesk"
ENVEOF

    # .env no mobile app
    cat > apps/mobile/.env.local << 'ENVEOF'
# Database
DATABASE_URL="postgresql://studesk:studesk2026@localhost:5432/studesk"

# NextAuth
NEXTAUTH_SECRET=PPT5Un1oRL+W5dNyWh0s9f5+oI3Gb0yuQy3H/QQDTA4=
NEXTAUTH_URL=http://localhost:3031

# Node
NODE_ENV=production
ENVEOF

    echo "📦 [MOBILE] Instalando dependências com pnpm..."
    pnpm install --shamefully-hoist

    echo "🔨 [MOBILE] Gerando Prisma client..."
    cd packages/database
    pnpm exec prisma generate
    cd ../..

    echo "🛑 [MOBILE] Parando mobile..."
    pm2 stop studesk-mobile 2>/dev/null || true

    echo "🧹 [MOBILE] Limpando build anterior..."
    cd apps/mobile
    rm -rf .next

    echo "🏗️ [MOBILE] Fazendo build..."
    pnpm run build

    echo "🔄 [MOBILE] Reiniciando mobile no PM2..."
    pm2 delete studesk-mobile 2>/dev/null || true
    pm2 start "pnpm start" --name "studesk-mobile"

    echo "💾 [MOBILE] Salvando configuração PM2..."
    pm2 save

    echo "✅ [MOBILE] Deploy concluído!"
MOBILE_SSH

echo ""
echo "✅ Deploy completo finalizado!"
echo ""
echo "🌐 URLs disponíveis:"
echo "   Backend:  https://studesk.pro (porta 3030)"
echo "   Mobile:   https://studesk.pro/mobile (porta 3031)"
echo ""
echo "💡 Acesse o backend ou mobile via Nginx!"
