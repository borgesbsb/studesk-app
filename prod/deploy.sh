#!/bin/bash

# Script de deploy simples para Studesk
# Faz push local e pull no servidor de produção

set -e  # Para na primeira falha

SERVER="root@195.35.17.216"
REPO_PATH="/var/www/studesk-app"
BRANCH="main"

echo "🚀 Iniciando deploy do Studesk..."
echo ""

# 1. Push das alterações
echo "📤 Fazendo push das alterações..."
git push origin $BRANCH

echo ""
echo "📥 Fazendo pull no servidor de produção..."

# 2. Conecta no servidor e faz pull + rebuild
ssh $SERVER << 'ENDSSH'
    set -e

    # Atualiza repositório git e instala dependências
    echo "🔄 Atualizando código no repositório..."
    cd /var/www/studesk-app
    git pull origin main

    echo "📦 Instalando dependências..."
    npm install

    echo "🛑 Parando aplicação..."
    pm2 stop studesk 2>/dev/null || true

    echo "🧹 Limpando build anterior..."
    rm -rf .next

    echo "🏗️  Fazendo build limpo da aplicação..."
    npm run build

    echo "🔄 Reiniciando aplicação..."
    pm2 delete studesk 2>/dev/null || true
    pm2 start npm --name "studesk" -- start

    echo "💾 Salvando configuração do PM2..."
    pm2 save

    echo "✅ Deploy concluído com sucesso!"
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
echo "🌐 Aplicação disponível em: http://195.35.17.216:3030"
