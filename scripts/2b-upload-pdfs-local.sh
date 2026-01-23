#!/bin/bash

# Script Alternativo: Upload de PDFs do Local para Servidor
#
# Este script:
# 1. Copia PDFs do Google Drive (local) para um diretório temporário
# 2. Faz upload via rsync para o servidor
# 3. Executa script no servidor para cadastrar no banco
#
# Execute este script DO SEU COMPUTADOR LOCAL!

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║   📤  Upload PDFs - Local → Servidor                 ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Configurações
GOOGLE_DRIVE_REMOTE="Google-Drive:"
AREA_FISCAL_PATH="Área Fiscal"
TEMP_DIR="/tmp/studesk-pdfs-upload"
SERVER="root@195.35.17.216"
SERVER_UPLOAD_DIR="/var/www/studesk-app/public/uploads/cmk8x1gpt0001kxqifdq7r6tg"
USER_ID="cmk8x1gpt0001kxqifdq7r6tg"

# Modo: test (5 PDFs por disciplina) ou full (todos)
MODE="test"

echo -e "${YELLOW}Modo: ${MODE}${NC}"
echo -e "${YELLOW}Servidor: ${SERVER}${NC}"
echo -e "${YELLOW}Destino: ${SERVER_UPLOAD_DIR}${NC}"
echo ""

# Criar diretório temporário
echo -e "${CYAN}1/4 - Criando diretório temporário...${NC}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
echo -e "${GREEN}✅ Criado: $TEMP_DIR${NC}"
echo ""

# Copiar PDFs do Google Drive (apenas Auditoria como teste)
echo -e "${CYAN}2/4 - Copiando PDFs do Google Drive (teste: Auditoria)...${NC}"

# Auditoria
echo "  📄 Auditoria..."
rclone copy "${GOOGLE_DRIVE_REMOTE}${AREA_FISCAL_PATH}/Auditoria" "$TEMP_DIR/Auditoria" \
  --include "*.pdf" \
  --max-depth 10 \
  --progress

TOTAL_PDFS=$(find "$TEMP_DIR" -name "*.pdf" | wc -l)
echo -e "${GREEN}✅ ${TOTAL_PDFS} PDFs copiados para diretório temporário${NC}"
echo ""

# Upload para servidor
echo -e "${CYAN}3/4 - Fazendo upload para servidor...${NC}"
ssh $SERVER "mkdir -p $SERVER_UPLOAD_DIR"

rsync -avz --progress "$TEMP_DIR/" "$SERVER:$SERVER_UPLOAD_DIR/"

echo -e "${GREEN}✅ Upload concluído${NC}"
echo ""

# Cadastrar no banco
echo -e "${CYAN}4/4 - Cadastrando PDFs no banco de dados...${NC}"
ssh $SERVER "cd /var/www/studesk-app && node scripts/4-register-uploaded-pdfs.mjs"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║      ✅  Upload e cadastro concluídos!              ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Limpar temporário
rm -rf "$TEMP_DIR"

exit 0
