#!/bin/bash

# Script para sincronizar Capacitor e instalar app no emulador Android

EMULATOR_NAME="Medium_Phone_API_36.1"
EMULATOR_PATH="/home/borgesbsb/Android/Sdk/emulator/emulator"

echo "🔍 Verificando se o emulador está rodando..."
RUNNING=$(adb devices | grep emulator | wc -l)

if [ $RUNNING -eq 0 ]; then
    echo "🚀 Iniciando emulador $EMULATOR_NAME..."
    echo "   (Isso pode levar alguns minutos na primeira vez)"
    $EMULATOR_PATH -avd $EMULATOR_NAME -no-snapshot-load &

    echo "⏳ Aguardando emulador inicializar..."
    adb wait-for-device
    sleep 10  # Aguarda sistema operacional carregar completamente
    echo "✅ Emulador iniciado"
else
    echo "✅ Emulador já está rodando"
fi

echo ""
echo "🔄 Usando configuração para emulador..."
# Fazer backup da config atual
if [ -f capacitor.config.ts ]; then
    cp capacitor.config.ts capacitor.config.device.ts.bak
fi

# Copiar config do emulador
cp capacitor.config.emulator.ts capacitor.config.ts

echo "🔄 Sincronizando Capacitor..."
npx cap sync android

# Restaurar config original
if [ -f capacitor.config.device.ts.bak ]; then
    mv capacitor.config.device.ts.bak capacitor.config.ts
fi

if [ $? -ne 0 ]; then
    echo "❌ Erro ao sincronizar Capacitor"
    exit 1
fi

echo "✅ Capacitor sincronizado com sucesso"

echo ""
echo "🏗️  Compilando e instalando APK no emulador..."
cd android && JAVA_HOME=/opt/android-studio/jbr ./gradlew installDebug

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar APK"
    exit 1
fi

echo ""
echo "✅ App instalado com sucesso no emulador!"
echo "📱 O app está pronto para uso"
echo ""
echo "⚠️  IMPORTANTE: Certifique-se de que o dev server está rodando em localhost:3031"
echo "   Execute: npm run dev (na pasta mobile)"
echo "💡 Dica: O emulador usa 10.0.2.2 para acessar o host"
