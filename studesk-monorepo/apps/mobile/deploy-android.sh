#!/bin/bash

# Script para sincronizar Capacitor e instalar app no dispositivo Android via ADB

echo "🔄 Sincronizando Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Erro ao sincronizar Capacitor"
    exit 1
fi

echo "✅ Capacitor sincronizado com sucesso"

echo ""
echo "🔌 Configurando ADB reverse para portas 3030 e 3031..."
adb reverse tcp:3030 tcp:3030
adb reverse tcp:3031 tcp:3031

if [ $? -ne 0 ]; then
    echo "⚠️  Aviso: Erro ao configurar ADB reverse"
    echo "Verifique se o dispositivo está conectado com: adb devices"
fi

echo "✅ ADB reverse configurado"
adb reverse --list

echo ""
echo "🏗️  Compilando e instalando APK no dispositivo..."
cd android && JAVA_HOME=/opt/android-studio/jbr ./gradlew installDebug

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar APK"
    exit 1
fi

echo ""
echo "✅ App instalado com sucesso no dispositivo!"
echo "📱 O app está pronto para uso"
echo ""
echo "⚠️  IMPORTANTE: Certifique-se de que o dev server está rodando em localhost:3031"
echo "   Execute: npm run dev (na pasta mobile)"
