#!/bin/bash

# Script para visualizar logs do app StudeskMobile
# Mostra logs do React Native, erros do app e mensagens do sistema

ADB="$HOME/Android/Sdk/platform-tools/adb"
DEVICE_ID="0C65523F3020013A"
PACKAGE_NAME="com.studeskmobile"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}📱 Logs do StudeskMobile${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# Verificar se o dispositivo está conectado
if ! $ADB -s $DEVICE_ID get-state &>/dev/null; then
    echo -e "${RED}❌ ERRO: Dispositivo $DEVICE_ID não encontrado!${NC}"
    echo ""
    echo "Dispositivos disponíveis:"
    $ADB devices
    exit 1
fi

echo -e "${GREEN}✅ Dispositivo conectado: $DEVICE_ID${NC}"
echo -e "${BLUE}📦 Package: $PACKAGE_NAME${NC}"
echo ""
echo -e "${YELLOW}🔍 Iniciando captura de logs...${NC}"
echo -e "${YELLOW}   (Ctrl+C para parar)${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# Limpar logs anteriores
$ADB -s $DEVICE_ID logcat -c

# Capturar logs filtrados
# Prioridades: V (Verbose), D (Debug), I (Info), W (Warning), E (Error), F (Fatal)
# Tags importantes:
#   - ReactNative: Logs do React Native
#   - ReactNativeJS: Logs do JavaScript (console.log)
#   - AndroidRuntime: Crashes e exceções não tratadas
#   - DEBUG: Logs de debug gerais
#   - System.err: Erros do sistema

$ADB -s $DEVICE_ID logcat \
  -v color \
  -v time \
  ReactNative:V \
  ReactNativeJS:V \
  AndroidRuntime:E \
  System.err:W \
  DEBUG:I \
  StudeskMobile:V \
  *:S
