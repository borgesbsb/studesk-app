#!/bin/bash

# Script para configurar ADB reverse para o app StudeskMobile
# Permite que o app Android acesse servidores locais do computador

ADB="$HOME/Android/Sdk/platform-tools/adb"
DEVICE_ID="0C65523F3020013A"

echo "🔧 Configurando ADB reverse..."
echo ""

# Verificar se o dispositivo está conectado
echo "📱 Verificando dispositivo conectado..."
if ! $ADB -s $DEVICE_ID get-state &>/dev/null; then
    echo "❌ ERRO: Dispositivo $DEVICE_ID não encontrado!"
    echo ""
    echo "Dispositivos disponíveis:"
    $ADB devices
    exit 1
fi

echo "✅ Dispositivo $DEVICE_ID conectado"
echo ""

# Configurar reverse para o backend Next.js (porta 3030)
echo "🔀 Configurando reverse para backend (porta 3030)..."
if $ADB -s $DEVICE_ID reverse tcp:3030 tcp:3030; then
    echo "✅ Backend reverse configurado: tcp:3030 -> tcp:3030"
else
    echo "❌ Erro ao configurar backend reverse"
    exit 1
fi

# Configurar reverse para o Metro bundler (porta 8081)
echo "🔀 Configurando reverse para Metro bundler (porta 8081)..."
if $ADB -s $DEVICE_ID reverse tcp:8081 tcp:8081; then
    echo "✅ Metro bundler reverse configurado: tcp:8081 -> tcp:8081"
else
    echo "❌ Erro ao configurar Metro bundler reverse"
    exit 1
fi

echo ""
echo "✅ ADB reverse configurado com sucesso!"
echo ""
echo "Portas mapeadas:"
echo "  - localhost:3030 (backend Next.js)"
echo "  - localhost:8081 (Metro bundler)"
echo ""
