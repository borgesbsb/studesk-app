#!/bin/bash

# Script para build, instalação e monitoramento do app StudeskMobile
# com controles de mídia na tela de bloqueio

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

set -e  # Parar se houver erro

DEVICE_ID="0C65523F3020013A"
PACKAGE_NAME="com.studeskmobile"
ADB=~/Android/Sdk/platform-tools/adb

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║    📱  Build, Deploy e Test - TTS Controls           ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "android" ]; then
    echo -e "${RED}❌ ERRO: Diretório 'android' não encontrado!${NC}"
    echo -e "${YELLOW}Execute este script da raiz do projeto: ./scripts/build-and-test-tts.sh${NC}"
    exit 1
fi

# Verificar se dispositivo está conectado
if ! $ADB devices | grep -q $DEVICE_ID; then
    echo -e "${RED}❌ ERRO: Dispositivo $DEVICE_ID não encontrado!${NC}"
    echo -e "${YELLOW}Dispositivos conectados:${NC}"
    $ADB devices
    exit 1
fi

# Forçar JAVA_HOME correto para Android Studio
echo -e "${YELLOW}⚙️  Configurando JAVA_HOME para Android Studio...${NC}"
export JAVA_HOME=/opt/android-studio/jbr
echo -e "${GREEN}✅ JAVA_HOME configurado: $JAVA_HOME${NC}"
echo ""

# 1. Limpar build anterior
echo -e "${YELLOW}🧹 Passo 1/6: Limpando build anterior...${NC}"
cd android
if ./gradlew clean; then
    echo -e "${GREEN}✅ Build limpo${NC}"
else
    echo -e "${RED}❌ Erro ao limpar build${NC}"
    cd ..
    exit 1
fi
cd ..
echo ""

# 2. Compilar APK Debug
echo -e "${YELLOW}🔨 Passo 2/6: Compilando APK Debug...${NC}"
echo -e "${CYAN}   (Isso pode levar alguns minutos...)${NC}"
cd android
if ./gradlew assembleDebug; then
    echo -e "${GREEN}✅ APK compilado${NC}"
else
    echo -e "${RED}❌ Erro ao compilar APK${NC}"
    cd ..
    exit 1
fi
cd ..
echo ""

# 3. Parar app se estiver rodando
echo -e "${YELLOW}⏹  Passo 3/6: Parando app (se estiver rodando)...${NC}"
$ADB -s $DEVICE_ID shell am force-stop $PACKAGE_NAME 2>/dev/null || true
echo -e "${GREEN}✅ App parado${NC}"
echo ""

# 4. Instalar APK
echo -e "${YELLOW}📲 Passo 4/6: Instalando APK no dispositivo...${NC}"
if $ADB -s $DEVICE_ID install -r android/app/build/outputs/apk/debug/app-debug.apk; then
    echo -e "${GREEN}✅ APK instalado${NC}"
else
    echo -e "${RED}❌ Erro ao instalar APK${NC}"
    exit 1
fi
echo ""

# 5. Limpar logs
echo -e "${YELLOW}🗑️  Passo 5/6: Limpando logs anteriores...${NC}"
$ADB -s $DEVICE_ID logcat -c
echo -e "${GREEN}✅ Logs limpos${NC}"
echo ""

# 6. Iniciar app
echo -e "${YELLOW}🚀 Passo 6/6: Iniciando app...${NC}"
if $ADB -s $DEVICE_ID shell am start -n $PACKAGE_NAME/.MainActivity; then
    echo -e "${GREEN}✅ App iniciado${NC}"
else
    echo -e "${RED}❌ Erro ao iniciar app${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║          ✅  Build e Deploy Completos!               ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos para testar:${NC}"
echo -e "   ${CYAN}1.${NC} No app, vá até um material e inicie a leitura (botão 🔊)"
echo -e "   ${CYAN}2.${NC} Bloqueie a tela do celular"
echo -e "   ${CYAN}3.${NC} Teste os controles na tela de bloqueio:"
echo -e "      ${YELLOW}▶️  Play/Pause${NC} - deve pausar/retomar a leitura"
echo -e "      ${YELLOW}⏹  Stop${NC} - deve parar completamente"
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║          📊  Monitorando logs em tempo real...       ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Procurando por eventos:${NC}"
echo -e "  • ${GREEN}TTSForegroundService${NC} - Eventos do serviço de foreground"
echo -e "  • ${GREEN}TTSServiceModule${NC} - Eventos do módulo nativo"
echo -e "  • ${GREEN}🎮${NC} - Controles recebidos"
echo -e "  • ${GREEN}▶️ ⏸ ⏹${NC} - Play, Pause, Stop"
echo -e "  • ${GREEN}📡${NC} - Registro de listeners"
echo -e "  • ${GREEN}EVENTO RECEBIDO${NC} - Eventos chegando no React Native"
echo ""
echo -e "${CYAN}Pressione Ctrl+C para parar o monitoramento${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 7. Monitorar logs relevantes
$ADB -s $DEVICE_ID logcat | grep --line-buffered -E "(TTSForegroundService|TTSServiceModule|🎮|▶️|⏸|⏹|📡|EVENTO RECEBIDO|Controle recebido|Evento enviado)"
