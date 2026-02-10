#!/bin/bash

echo "🔍 Descobrindo IP da máquina..."
echo ""

# Linux/Mac
if command -v ip &> /dev/null; then
    IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -n1)
elif command -v ifconfig &> /dev/null; then
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
fi

if [ -z "$IP" ]; then
    echo "❌ Não foi possível descobrir o IP automaticamente"
    echo "Execute manualmente:"
    echo "  Linux/Mac: ifconfig | grep 'inet '"
    echo "  Windows: ipconfig"
    exit 1
fi

echo "✅ IP encontrado: $IP"
echo ""
echo "📱 Configure o app mobile com:"
echo "   http://$IP:3030/api"
echo ""
echo "🧪 Teste a conexão:"
echo "   curl http://$IP:3030/api/health"
