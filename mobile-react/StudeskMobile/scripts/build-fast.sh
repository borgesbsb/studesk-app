#!/bin/bash

# Script de Build Rápido para React Native
# Escolha o tipo de build baseado nas mudanças feitas

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║      ⚡ Build Rápido - StudeskMobile                 ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Escolha o tipo de build:${NC}"
echo ""
echo -e "${CYAN}1)${NC} ${GREEN}SUPER RÁPIDO${NC} - Apenas bundle JS (30 seg)"
echo -e "   ${YELLOW}Use quando:${NC} Mudou apenas código React/TypeScript"
echo ""
echo -e "${CYAN}2)${NC} ${GREEN}RÁPIDO${NC} - Build incremental (1-2 min)"
echo -e "   ${YELLOW}Use quando:${NC} Mudou código React + algumas configs"
echo ""
echo -e "${CYAN}3)${NC} ${YELLOW}NORMAL${NC} - Build completo sem clean (3-4 min)"
echo -e "   ${YELLOW}Use quando:${NC} Mudou código nativo ou bibliotecas"
echo ""
echo -e "${CYAN}4)${NC} ${RED}COMPLETO${NC} - Clean + Build total (8-10 min)"
echo -e "   ${YELLOW}Use quando:${NC} Problemas no build ou mudanças grandes"
echo ""
echo -e "${CYAN}5)${NC} ${MAGENTA}ARM64 APENAS${NC} - Build otimizado (2-3 min)"
echo -e "   ${YELLOW}Use quando:${NC} Celulares modernos (2018+)"
echo ""

read -p "$(echo -e ${CYAN}Digite a opção [1-5]: ${NC})" option

export JAVA_HOME=/opt/android-studio/jbr

case $option in
  1)
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ⚡⚡⚡ BUILD SUPER RÁPIDO ⚡⚡⚡              ║${NC}"
    echo -e "${GREEN}║            (Apenas Bundle JS)                        ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Criar diretório assets
    mkdir -p android/app/src/main/assets
    
    echo -e "${YELLOW}📦 Gerando bundle JavaScript...${NC}"
    npx react-native bundle \
      --platform android \
      --dev false \
      --entry-file index.js \
      --bundle-output android/app/src/main/assets/index.android.bundle \
      --assets-dest android/app/src/main/res/
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro ao gerar bundle JS${NC}"
      exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}🔨 Build incremental rápido...${NC}"
    cd android
    ./gradlew assembleRelease --no-daemon
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro no build${NC}"
      exit 1
    fi
    
    cd ..
    echo ""
    echo -e "${GREEN}✅ Build SUPER RÁPIDO concluído!${NC}"
    ;;
    
  2)
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ⚡ BUILD RÁPIDO ⚡                      ║${NC}"
    echo -e "${GREEN}║           (Build Incremental)                        ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    mkdir -p android/app/src/main/assets
    
    echo -e "${YELLOW}📦 Gerando bundle JavaScript...${NC}"
    npx react-native bundle \
      --platform android \
      --dev false \
      --entry-file index.js \
      --bundle-output android/app/src/main/assets/index.android.bundle \
      --assets-dest android/app/src/main/res/
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro ao gerar bundle JS${NC}"
      exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}🔨 Build incremental...${NC}"
    cd android
    ./gradlew assembleRelease
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro no build${NC}"
      exit 1
    fi
    
    cd ..
    echo ""
    echo -e "${GREEN}✅ Build RÁPIDO concluído!${NC}"
    ;;
    
  3)
    echo ""
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║              📦 BUILD NORMAL 📦                      ║${NC}"
    echo -e "${YELLOW}║          (Sem clean, completo)                       ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    mkdir -p android/app/src/main/assets
    
    echo -e "${YELLOW}📦 Gerando bundle JavaScript...${NC}"
    npx react-native bundle \
      --platform android \
      --dev false \
      --entry-file index.js \
      --bundle-output android/app/src/main/assets/index.android.bundle \
      --assets-dest android/app/src/main/res/
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro ao gerar bundle JS${NC}"
      exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}🔨 Build completo...${NC}"
    cd android
    ./gradlew assembleRelease --rerun-tasks
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro no build${NC}"
      exit 1
    fi
    
    cd ..
    echo ""
    echo -e "${GREEN}✅ Build NORMAL concluído!${NC}"
    ;;
    
  4)
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║            🔥 BUILD COMPLETO 🔥                      ║${NC}"
    echo -e "${RED}║          (Clean + Build Total)                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    mkdir -p android/app/src/main/assets
    
    echo -e "${YELLOW}📦 Gerando bundle JavaScript...${NC}"
    npx react-native bundle \
      --platform android \
      --dev false \
      --entry-file index.js \
      --bundle-output android/app/src/main/assets/index.android.bundle \
      --assets-dest android/app/src/main/res/
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro ao gerar bundle JS${NC}"
      exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}🧹 Limpando build anterior...${NC}"
    cd android
    ./gradlew clean
    
    echo ""
    echo -e "${YELLOW}🔨 Build completo...${NC}"
    ./gradlew assembleRelease
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro no build${NC}"
      exit 1
    fi
    
    cd ..
    echo ""
    echo -e "${GREEN}✅ Build COMPLETO concluído!${NC}"
    ;;
    
  5)
    echo ""
    echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║         🎯 BUILD ARM64 APENAS 🎯                    ║${NC}"
    echo -e "${MAGENTA}║      (Celulares modernos - APK menor)               ║${NC}"
    echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    mkdir -p android/app/src/main/assets
    
    echo -e "${YELLOW}📦 Gerando bundle JavaScript...${NC}"
    npx react-native bundle \
      --platform android \
      --dev false \
      --entry-file index.js \
      --bundle-output android/app/src/main/assets/index.android.bundle \
      --assets-dest android/app/src/main/res/
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro ao gerar bundle JS${NC}"
      exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}🔨 Build ARM64...${NC}"
    cd android
    ./gradlew assembleRelease \
      -Preactandroid.enableSeparateBuildPerCPUArchitecture=true
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Erro no build${NC}"
      exit 1
    fi
    
    cd ..
    echo ""
    echo -e "${GREEN}✅ Build ARM64 concluído!${NC}"
    echo -e "${YELLOW}📦 APK ARM64: android/app/build/outputs/apk/release/app-arm64-v8a-release.apk${NC}"
    ;;
    
  *)
    echo -e "${RED}❌ Opção inválida!${NC}"
    exit 1
    ;;
esac

# Informações finais
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║                  📊 RESULTADO                        ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}✅ APK gerado com sucesso${NC}"
  echo -e "${CYAN}📦 Local:${NC} ${YELLOW}$APK_PATH${NC}"
  echo -e "${CYAN}📏 Tamanho:${NC} ${YELLOW}$APK_SIZE${NC}"
  echo ""
  echo -e "${CYAN}💡 Para instalar:${NC}"
  echo -e "   ${YELLOW}./scripts/install-release.sh${NC}"
  echo ""
fi

exit 0
