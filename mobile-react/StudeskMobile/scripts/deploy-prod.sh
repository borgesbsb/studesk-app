#!/bin/bash

# Script de Deploy para Produção - Studesk Backend
# Server: studesk.pro (195.35.17.216)
#
# IMPORTANTE: Execute este script APÓS fazer commit e push do código!
#
# Este script:
# 1. SSH no servidor
# 2. Faz git pull
# 3. Instala dependências
# 4. Gera Prisma Client
# 5. Faz build
# 6. Reinicia aplicação com PM2

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║      🚀  Deploy Produção - Studesk Backend           ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

SERVER="root@195.35.17.216"
APP_DIR="/var/www/studesk-app"

echo -e "${YELLOW}⚠️  Certifique-se de ter feito commit e push antes!${NC}"
echo ""
read -p "Deseja continuar? (s/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo -e "${RED}❌ Deploy cancelado${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}1/5 - Conectando ao servidor e fazendo pull...${NC}"
ssh $SERVER << 'ENDSSH'
    set -e

    cd /var/www/studesk-app

    echo "🔄 Atualizando código..."
    git fetch origin
    git reset --hard origin/main

    echo "✅ Pull concluído!"
ENDSSH
echo -e "${GREEN}✅ Pull concluído${NC}"
echo ""

echo -e "${YELLOW}2/5 - Instalando dependências...${NC}"
ssh $SERVER "cd /var/www/studesk-app && npm install"
echo -e "${GREEN}✅ Dependências instaladas${NC}"
echo ""

echo -e "${YELLOW}3/5 - Gerando Prisma Client...${NC}"
ssh $SERVER "cd /var/www/studesk-app && npx prisma generate"
echo -e "${GREEN}✅ Prisma Client gerado${NC}"
echo ""

echo -e "${YELLOW}4/5 - Fazendo build da aplicação...${NC}"
ssh $SERVER "cd /var/www/studesk-app && npm run build"
echo -e "${GREEN}✅ Build concluído${NC}"
echo ""

echo -e "${YELLOW}5/5 - Reiniciando aplicação...${NC}"
ssh $SERVER "pm2 restart studesk"
echo -e "${GREEN}✅ Aplicação reiniciada${NC}"
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║      ✅  Deploy concluído com sucesso!              ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}🌐 Aplicação disponível em: ${YELLOW}https://studesk.pro${NC}"
echo ""

echo -e "${CYAN}💡 Para ver os logs:${NC}"
echo -e "   ${YELLOW}ssh $SERVER 'pm2 logs studesk --lines 50'${NC}"
echo ""

echo -e "${CYAN}💡 Para testar o health check:${NC}"
echo -e "   ${YELLOW}curl https://studesk.pro/api/health${NC}"
echo ""

exit 0
