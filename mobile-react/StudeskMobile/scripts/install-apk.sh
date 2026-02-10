#!/bin/bash

# Script para instalar APK no celular físico e/ou emulador
# Detecta automaticamente dispositivos conectados e instala em todos

ADB="$HOME/Android/Sdk/platform-tools/adb"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE_NAME="com.studeskmobile"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║          📱  Instalar APK - StudeskMobile            ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se o APK existe
if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}❌ ERRO: APK não encontrado!${NC}"
    echo -e "${YELLOW}Caminho esperado: $APK_PATH${NC}"
    echo ""
    echo -e "${CYAN}Execute primeiro:${NC}"
    echo -e "   ${YELLOW}./scripts/build-android.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ APK encontrado: $APK_PATH${NC}"
echo ""

# Listar dispositivos conectados
echo -e "${CYAN}🔍 Detectando dispositivos...${NC}"
devices=$($ADB devices | grep -v "List" | grep "device$" | awk '{print $1}')

if [ -z "$devices" ]; then
    echo -e "${RED}❌ Nenhum dispositivo conectado!${NC}"
    echo ""
    echo -e "${YELLOW}Conecte um dispositivo USB ou inicie um emulador.${NC}"
    exit 1
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
        # Tentar pegar o modelo
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

    # Instalar APK
    echo -e "${YELLOW}📦 Instalando APK...${NC}"
    if $ADB -s $device_id install -r $APK_PATH 2>&1 | grep -q "Success"; then
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
echo -e "${CYAN}║                    📊 RESUMO                         ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Instalações bem-sucedidas: $install_count${NC}"
if [ $error_count -gt 0 ]; then
    echo -e "${RED}❌ Instalações com erro: $error_count${NC}"
fi
echo ""

if [ $install_count -gt 0 ]; then
    echo -e "${CYAN}💡 Dica:${NC} Para ver os logs do app, execute:"
    echo -e "   ${YELLOW}./scripts/adb-logs.sh${NC}"
    echo ""
fi

exit 0
