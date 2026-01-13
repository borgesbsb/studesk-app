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
echo "🔄 Sincronizando Capacitor..."
npx cap sync android

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
echo "💡 Dica: O emulador usa localhost diretamente, não precisa ADB reverse"
