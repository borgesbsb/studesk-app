#!/bin/bash

# Script completo: Build + Install + Start
# Detecta dispositivos automaticamente

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║      🚀  Deploy Completo - StudeskMobile             ║${NC}"
echo -e "${CYAN}║      (Build + Install + Start)                        ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Executar build
echo -e "${YELLOW}Etapa 1/3: Build do APK${NC}"
./scripts/build-android.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build falhou. Abortando deploy.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Etapa 2/3: Instalação do APK${NC}"
./scripts/install-apk.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Instalação falhou.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║          ✅  Deploy concluído com sucesso!           ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

exit 0
