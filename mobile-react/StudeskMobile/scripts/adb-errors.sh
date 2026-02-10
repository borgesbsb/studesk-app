#!/bin/bash

# Script para visualizar APENAS ERROS do app StudeskMobile
# Útil para debugging rápido

ADB="$HOME/Android/Sdk/platform-tools/adb"
DEVICE_ID="0C65523F3020013A"
PACKAGE_NAME="com.studeskmobile"

# Cores
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${RED}🚨 APENAS ERROS - StudeskMobile${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# Verificar dispositivo
if ! $ADB -s $DEVICE_ID get-state &>/dev/null; then
    echo -e "${RED}❌ ERRO: Dispositivo $DEVICE_ID não encontrado!${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Capturando apenas erros e crashes...${NC}"
echo -e "${YELLOW}   (Ctrl+C para parar)${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# Limpar logs
$ADB -s $DEVICE_ID logcat -c

# Capturar APENAS erros e fatais
$ADB -s $DEVICE_ID logcat \
  -v color \
  -v time \
  ReactNative:E \
  ReactNativeJS:E \
  AndroidRuntime:E \
  System.err:E \
  *:F
