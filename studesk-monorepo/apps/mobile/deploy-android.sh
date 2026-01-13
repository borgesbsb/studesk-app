#!/bin/bash

# Script para compilar Next.js, sincronizar Capacitor e instalar app no dispositivo Android

echo "🔨 Compilando Next.js (build estático)..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro ao compilar Next.js"
    exit 1
fi

echo "✅ Next.js compilado com sucesso"

echo ""
echo "🔄 Sincronizando Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Erro ao sincronizar Capacitor"
    exit 1
fi

echo "✅ Capacitor sincronizado com sucesso"

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
echo "💡 Dica: O app agora usa build estático compilado (muito mais rápido!)"
