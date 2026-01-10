#!/bin/bash

# Script de deploy simples para Studesk
# Faz push local e pull no servidor de produção

set -e  # Para na primeira falha

SERVER="root@195.35.17.216"
REPO_PATH="/var/www/studesk"
BRANCH="main"

echo "🚀 Iniciando deploy do Studesk..."
echo ""

# Navega para o diretório do studesk
cd ../studesk

# 1. Push das alterações
echo "📤 Fazendo push das alterações..."
git push origin $BRANCH

echo ""
echo "📥 Fazendo pull no servidor de produção..."

# 2. Conecta no servidor e faz pull + rebuild
ssh $SERVER << 'ENDSSH'
    set -e

    # Navega para o diretório do projeto
    cd /var/www/studesk || {
        echo "❌ Erro: Diretório /var/www/studesk não encontrado!"
        echo "Criando estrutura..."
        mkdir -p /var/www
        cd /var/www
        git clone git@github.com:borgesbsb/studesk-app.git studesk
        cd studesk
    }

    echo "🔄 Atualizando código..."
    git fetch origin
    git reset --hard origin/main

    echo "📦 Instalando dependências..."
    npm install

    echo "🏗️  Fazendo build da aplicação..."
    npm run build

    echo "🔄 Reiniciando aplicação..."
    pm2 restart studesk || pm2 start npm --name "studesk" -- start

    echo "✅ Deploy concluído com sucesso!"
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
echo "🌐 Aplicação disponível em: http://195.35.17.216:3030"
