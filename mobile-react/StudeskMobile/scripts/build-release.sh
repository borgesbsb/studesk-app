#!/bin/bash

# Script para build RELEASE standalone + Instalação automática
# APK funciona sem Metro, sem cabo USB, totalmente offline

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

ADB="$HOME/Android/Sdk/platform-tools/adb"

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║      🚀  Build Release - StudeskMobile               ║${NC}"
echo -e "${CYAN}║      (Standalone - Funciona sem Metro/USB)            ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "android" ]; then
    echo -e "${RED}❌ ERRO: Diretório 'android' não encontrado!${NC}"
    echo -e "${YELLOW}Execute este script da raiz do projeto React Native${NC}"
    exit 1
fi

# Configurar JAVA_HOME
echo -e "${YELLOW}⚙️  Configurando JAVA_HOME...${NC}"
export JAVA_HOME=/opt/android-studio/jbr
echo -e "${GREEN}✅ JAVA_HOME: $JAVA_HOME${NC}"
echo ""

# Passo 1: Criar diretório assets
echo -e "${YELLOW}📁 Passo 1/5: Criando diretório assets...${NC}"
mkdir -p android/app/src/main/assets
echo -e "${GREEN}✅ Diretório criado${NC}"
echo ""

# Passo 2: Gerar bundle JS
echo -e "${YELLOW}📦 Passo 2/5: Gerando bundle JavaScript...${NC}"
echo -e "${CYAN}   (Isso empacota todo código JS no APK)${NC}"
echo ""

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

echo -e "${GREEN}✅ Bundle JS gerado com sucesso${NC}"
echo ""

# Passo 3: Clean
echo -e "${YELLOW}🧹 Passo 3/5: Limpando build anterior...${NC}"
cd android
./gradlew clean

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao executar clean${NC}"
    cd ..
    exit 1
fi

echo -e "${GREEN}✅ Clean concluído${NC}"
echo ""

# Passo 4: Build Release APK
echo -e "${YELLOW}🔨 Passo 4/5: Compilando APK Release...${NC}"
echo -e "${CYAN}   (Isso pode levar alguns minutos...)${NC}"
echo ""

./gradlew assembleRelease

if [ $? -ne 0 ]; then
    cd ..
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                       ║${NC}"
    echo -e "${RED}║          ❌  Build falhou!                           ║${NC}"
    echo -e "${RED}║                                                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║      ✅  Build Release concluído com sucesso!        ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
PACKAGE_NAME="com.studeskmobile"

echo -e "${CYAN}📦 APK Release gerado em:${NC}"
echo -e "   ${YELLOW}$APK_PATH${NC}"
echo ""

# Passo 5: Instalar no dispositivo
echo -e "${YELLOW}📱 Passo 5/5: Instalando no dispositivo...${NC}"
echo ""

# Verificar dispositivos conectados
devices=$($ADB devices | grep -v "List" | grep "device$" | awk '{print $1}')

if [ -z "$devices" ]; then
    echo -e "${YELLOW}⚠️  Nenhum dispositivo conectado via USB${NC}"
    echo ""
    echo -e "${CYAN}💡 Você pode:${NC}"
    echo -e "   1. Conectar um dispositivo USB e executar novamente"
    echo -e "   2. Copiar o APK manualmente para o celular:"
    echo -e "      ${YELLOW}$APK_PATH${NC}"
    echo ""
    exit 0
fi

# Contar dispositivos
device_count=$(echo "$devices" | wc -l)
echo -e "${GREEN}✅ Encontrado(s) $device_count dispositivo(s)${NC}"
echo ""

# Instalar em cada dispositivo
install_count=0
error_count=0

while IFS= read -r device_id; do
    # Identificar tipo de dispositivo
    if [[ $device_id == emulator-* ]]; then
        device_type="${MAGENTA}🖥️  Emulador${NC}"
        device_name="Emulador ($device_id)"
    else
        device_type="${GREEN}📱 Dispositivo Físico${NC}"
        model=$($ADB -s $device_id shell getprop ro.product.model 2>/dev/null | tr -d '\r')
        if [ -n "$model" ]; then
            device_name="$model ($device_id)"
        else
            device_name="Dispositivo ($device_id)"
        fi
    fi

    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "$device_type"
    echo -e "${YELLOW}ID:${NC} $device_id"
    echo -e "${YELLOW}Nome:${NC} $device_name"
    echo ""

    # Desinstalar versão anterior se existir
    echo -e "${YELLOW}🗑️  Desinstalando versão anterior...${NC}"
    $ADB -s $device_id uninstall $PACKAGE_NAME 2>/dev/null
    echo ""

    # Instalar APK
    echo -e "${YELLOW}📦 Instalando APK Release...${NC}"
    if $ADB -s $device_id install $APK_PATH 2>&1 | grep -q "Success"; then
        echo -e "${GREEN}✅ Instalação concluída com sucesso!${NC}"
        ((install_count++))

        # Perguntar se quer iniciar o app
        echo ""
        echo -e "${CYAN}🚀 Deseja iniciar o app agora? (s/N)${NC}"
        read -t 5 -n 1 start_app
        echo ""

        if [[ $start_app =~ ^[Ss]$ ]]; then
            echo -e "${YELLOW}🚀 Iniciando app...${NC}"
            $ADB -s $device_id shell am start -n $PACKAGE_NAME/.MainActivity &>/dev/null
            echo -e "${GREEN}✅ App iniciado!${NC}"
        else
            echo -e "${YELLOW}⏭️  App não iniciado automaticamente${NC}"
        fi
    else
        echo -e "${RED}❌ Erro na instalação!${NC}"
        ((error_count++))
    fi

    echo ""
done <<< "$devices"

# Resumo final
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║                    📊 RESUMO FINAL                   ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ APK Release gerado com sucesso${NC}"
echo -e "${GREEN}✅ Instalações bem-sucedidas: $install_count${NC}"

if [ $error_count -gt 0 ]; then
    echo -e "${RED}❌ Instalações com erro: $error_count${NC}"
fi

echo ""
echo -e "${CYAN}🎉 APK STANDALONE:${NC}"
echo -e "   ✅ Não precisa de Metro Bundler (porta 8081)"
echo -e "   ✅ Não precisa de cabo USB"
echo -e "   ✅ Funciona totalmente offline"
echo -e "   ✅ Pronto para produção"
echo ""

exit 0
