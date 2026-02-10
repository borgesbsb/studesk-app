#!/bin/bash

# Script para limpar e fazer build completo do Android
# Este script NÃO instala automaticamente - apenas gera o APK

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║          🔨  Build Android - StudeskMobile           ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "android" ]; then
    echo -e "${RED}❌ ERRO: Diretório 'android' não encontrado!${NC}"
    echo -e "${YELLOW}Execute este script da raiz do projeto React Native${NC}"
    exit 1
fi

# Forçar JAVA_HOME correto para Android Studio
echo -e "${YELLOW}⚙️  Configurando JAVA_HOME para Android Studio...${NC}"
export JAVA_HOME=/opt/android-studio/jbr
echo -e "${GREEN}✅ JAVA_HOME configurado: $JAVA_HOME${NC}"
echo ""

# Passo 1: Clean
echo -e "${YELLOW}🧹 Passo 1/2: Limpando build anterior...${NC}"
cd android
if ./gradlew clean; then
    echo -e "${GREEN}✅ Clean concluído com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao executar clean${NC}"
    cd ..
    exit 1
fi
echo ""

# Passo 2: Build Debug APK
echo -e "${YELLOW}🔨 Passo 2/2: Compilando APK Debug...${NC}"
echo -e "${CYAN}   (Isso pode levar alguns minutos...)${NC}"
echo ""

if ./gradlew assembleDebug; then
    cd ..
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}║          ✅  Build concluído com sucesso!            ║${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📦 APK gerado em:${NC}"
    echo -e "   ${YELLOW}android/app/build/outputs/apk/debug/app-debug.apk${NC}"
    echo ""
    echo -e "${CYAN}💡 Dica: Use o script de instalação:${NC}"
    echo -e "   ${YELLOW}./scripts/install-apk.sh${NC}"
    echo ""
else
    cd ..
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                       ║${NC}"
    echo -e "${RED}║          ❌  Build falhou!                           ║${NC}"
    echo -e "${RED}║                                                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Verifique os erros acima e tente novamente.${NC}"
    exit 1
fi
