#!/bin/bash

# Script para configurar Nginx + SSL para studesk.pro
# Detecta automaticamente mobile vs desktop e redireciona para a aplicação correta

set -e

SERVER="root@195.35.17.216"
DOMAIN="studesk.pro"

echo "🌐 Configurando Nginx + SSL para studesk.pro..."
echo ""

# Copiar arquivo de configuração para o servidor
echo "📤 Copiando configuração do Nginx para o servidor..."
scp nginx-studesk.conf $SERVER:/tmp/studesk.conf

# Executar comandos no servidor
ssh $SERVER << 'ENDSSH'
    set -e

    echo "📦 Instalando Nginx e Certbot..."
    apt-get update
    apt-get install -y nginx certbot python3-certbot-nginx

    echo "🔧 Configurando Nginx..."

    # Criar configuração temporária sem SSL (para validação do Certbot)
    cat > /etc/nginx/sites-available/studesk << 'EOF'
# Configuração temporária para validação SSL
server {
    listen 80;
    listen [::]:80;
    server_name studesk.pro www.studesk.pro;

    # Localização para validação do Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Upstream temporário
    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    # Ativar site
    ln -sf /etc/nginx/sites-available/studesk /etc/nginx/sites-enabled/studesk

    # Remover configuração padrão se existir
    rm -f /etc/nginx/sites-enabled/default

    # Testar configuração
    echo "✅ Testando configuração do Nginx..."
    nginx -t

    # Reiniciar Nginx
    echo "🔄 Reiniciando Nginx..."
    systemctl restart nginx
    systemctl enable nginx

    echo ""
    echo "📜 Agora vamos obter o certificado SSL..."
    echo ""
    echo "⚠️  IMPORTANTE: Certifique-se de que o DNS de studesk.pro e www.studesk.pro"
    echo "    está apontando para este servidor (195.35.17.216) antes de continuar!"
    echo ""
    read -p "DNS configurado? Pressione ENTER para continuar ou CTRL+C para cancelar..."

    # Obter certificado SSL
    echo "🔐 Obtendo certificado SSL do Let's Encrypt..."
    certbot certonly --nginx -d studesk.pro -d www.studesk.pro --non-interactive --agree-tos --email borges.bnjamin@gmail.com

    # Agora copiar a configuração completa com SSL
    echo "🔧 Aplicando configuração completa com SSL..."
    cp /tmp/studesk.conf /etc/nginx/sites-available/studesk

    # Testar configuração novamente
    echo "✅ Testando configuração final..."
    nginx -t

    # Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    systemctl reload nginx

    # Configurar renovação automática
    echo "⏰ Configurando renovação automática de SSL..."
    systemctl enable certbot.timer
    systemctl start certbot.timer

    echo ""
    echo "✅ Configuração concluída!"
    echo ""
    echo "🌐 Seu site está disponível em:"
    echo "   https://studesk.pro"
    echo ""
    echo "📱 Detecção automática:"
    echo "   - Desktop: Redireciona para versão web (porta 3030)"
    echo "   - Mobile: Redireciona para PWA (porta 3031)"
    echo ""
    echo "🔐 Certificado SSL:"
    certbot certificates
ENDSSH

echo ""
echo "✅ Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configurar DNS de studesk.pro para apontar para 195.35.17.216"
echo "2. Aguardar propagação do DNS (pode levar até 24h)"
echo "3. Acessar https://studesk.pro pelo celular para testar o PWA"
echo ""
