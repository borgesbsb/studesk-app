#!/bin/bash

# Script para depurar logs da aplicação StudeskMobile no emulador
# Detecta dispositivo automaticamente e mostra logs JS com cores

ADB="$HOME/Android/Sdk/platform-tools/adb"
PACKAGE_NAME="com.studeskmobile"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}📱 Debug StudeskMobile${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"

# Detectar dispositivo automaticamente
DEVICE_ID=$($ADB devices | grep -v "List" | grep "device$" | head -1 | awk '{print $1}')

if [ -z "$DEVICE_ID" ]; then
    echo -e "${RED}❌ Nenhum dispositivo/emulador encontrado!${NC}"
    $ADB devices
    exit 1
fi

echo -e "${GREEN}✅ Dispositivo: $DEVICE_ID${NC}"
echo -e "${YELLOW}   Ctrl+C para parar${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# Limpar logs anteriores
$ADB -s $DEVICE_ID logcat -c

# Capturar logs JS e erros, colorir por severidade
$ADB -s $DEVICE_ID logcat -v time ReactNativeJS:V ReactNative:E AndroidRuntime:E *:S | while IFS= read -r line; do
    if echo "$line" | grep -qiE "error|erro|fail|❌|exception"; then
        echo -e "${RED}${line}${NC}"
    elif echo "$line" | grep -qiE "warn|⚠"; then
        echo -e "${YELLOW}${line}${NC}"
    elif echo "$line" | grep -qiE "✅|sucesso|success"; then
        echo -e "${GREEN}${line}${NC}"
    else
        echo "$line"
    fi
done
