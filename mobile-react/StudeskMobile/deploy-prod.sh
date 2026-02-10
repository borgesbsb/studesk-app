#!/bin/bash

# Script de Deploy para Produção - Studesk
# Server: studesk.pro (195.35.17.216)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║      🚀  Deploy Produção - Studesk                   ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

SERVER="root@195.35.17.216"
APP_DIR="/var/www/studesk"

echo -e "${YELLOW}1/6 - Fazendo backup do código atual...${NC}"
ssh $SERVER "cd $APP_DIR && tar -czf backup-\$(date +%Y%m%d-%H%M%S).tar.gz src prisma public package.json"
echo -e "${GREEN}✅ Backup criado${NC}"
echo ""

echo -e "${YELLOW}2/6 - Enviando código atualizado...${NC}"
rsync -avz --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude public/uploads \
  . $SERVER:$APP_DIR/
echo -e "${GREEN}✅ Código enviado${NC}"
echo ""

echo -e "${YELLOW}3/6 - Instalando dependências...${NC}"
ssh $SERVER "cd $APP_DIR && npm install"
echo -e "${GREEN}✅ Dependências instaladas${NC}"
echo ""

echo -e "${YELLOW}4/6 - Gerando Prisma Client...${NC}"
ssh $SERVER "cd $APP_DIR && npx prisma generate"
echo -e "${GREEN}✅ Prisma Client gerado${NC}"
echo ""

echo -e "${YELLOW}5/6 - Build da aplicação...${NC}"
ssh $SERVER "cd $APP_DIR && npm run build"
echo -e "${GREEN}✅ Build concluído${NC}"
echo ""

echo -e "${YELLOW}6/6 - Reiniciando aplicação...${NC}"
ssh $SERVER "cd $APP_DIR && pm2 restart studesk"
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

exit 0
