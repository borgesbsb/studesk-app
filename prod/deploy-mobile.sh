#!/bin/bash

# Script de deploy do Mobile PWA
# Faz commit, push local e pull no servidor

set -e  # Para na primeira falha

SERVER="root@195.35.17.216"
REPO_PATH="/var/www/studesk-app"
MOBILE_PATH="$REPO_PATH/studesk/studesk-monorepo"
BRANCH="main"

echo "🚀 Iniciando deploy do Mobile PWA..."
echo ""

# 1. Commit e Push local (assume que já foi feito manualmente)
echo "📤 Fazendo push das alterações..."
cd "$(dirname "$0")/../studesk"
git push origin $BRANCH 2>&1 || echo "⚠️  Nada para fazer push ou já está atualizado"

echo ""
echo "📥 Fazendo deploy no servidor..."

# 2. SSH no servidor e atualiza
ssh $SERVER << 'ENDSSH'
    set -e

    # Verificar se o repositório existe
    if [ ! -d "/var/www/studesk-app" ]; then
        echo "📦 Clonando repositório pela primeira vez..."
        cd /var/www
        git clone https://github.com/borgesbsb/studesk-app.git
    fi

    # Navegar para o repositório
    cd /var/www/studesk-app

    echo "🔄 Atualizando código..."
    git fetch origin
    git reset --hard origin/main

    # Navegar para o monorepo
    cd studesk-monorepo

    echo "📝 Criando arquivos .env..."
    # .env no package database
    cat > packages/database/.env << 'ENVEOF'
DATABASE_URL="postgresql://studesk:studesk2026@localhost:5432/studesk"
ENVEOF

    # .env no mobile app
    cat > apps/mobile/.env << 'ENVEOF'
# Database
DATABASE_URL="postgresql://studesk:studesk2026@localhost:5432/studesk"

# NextAuth
NEXTAUTH_SECRET=PPT5Un1oRL+W5dNyWh0s9f5+oI3Gb0yuQy3H/QQDTA4=
NEXTAUTH_URL=http://localhost:3031

# Node
NODE_ENV=production
ENVEOF

    echo "📦 Instalando dependências com pnpm..."
    pnpm install --shamefully-hoist

    echo "🔨 Gerando Prisma client..."
    cd packages/database
    pnpm exec prisma generate
    cd ../..

    echo "🛑 Parando mobile..."
    pm2 stop studesk-mobile 2>/dev/null || true

    echo "🧹 Limpando build anterior do mobile..."
    cd apps/mobile
    rm -rf .next

    echo "🏗️ Fazendo build limpo do mobile..."
    pnpm run build

    echo "🔄 Reiniciando mobile no PM2..."
    cd /var/www/studesk-app/studesk-monorepo/apps/mobile
    pm2 delete studesk-mobile 2>/dev/null || true
    cd /var/www/studesk-app/studesk-monorepo/apps/mobile
    pm2 start "pnpm start" --name "studesk-mobile"

    echo "💾 Salvando configuração do PM2..."
    pm2 save

    echo "✅ Deploy do mobile concluído!"
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
echo "🌐 Mobile PWA disponível em: https://studesk.pro (mobile)"
