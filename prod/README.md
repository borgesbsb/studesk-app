# Studesk - Configuração de Produção

## Visão Geral

O Studesk usa uma arquitetura dual com detecção automática de dispositivos:

- **Desktop**: Acessa a versão web completa (backend na porta 3030)
- **Mobile**: Acessa a versão PWA otimizada para celular (porta 3031)

O Nginx detecta automaticamente o dispositivo baseado no User-Agent e redireciona para a aplicação correta.

## Arquivos de Configuração

### `deploy-full.sh`
Script principal de deployment que:
- Faz push das alterações para o GitHub
- Atualiza o backend no servidor
- Faz build da versão web
- Copia e faz build do mobile PWA
- Reinicia ambos os serviços no PM2

### `nginx-studesk.conf`
Configuração do Nginx que:
- Detecta dispositivos mobile via User-Agent
- Redireciona desktop para porta 3030 (web)
- Redireciona mobile para porta 3031 (PWA)
- Força HTTPS em todas as conexões
- Configura SSL com Let's Encrypt
- Otimiza cache para arquivos estáticos

### `setup-nginx-ssl.sh`
Script de configuração inicial que:
- Instala Nginx e Certbot
- Configura o Nginx com detecção de mobile
- Obtém certificados SSL do Let's Encrypt
- Configura renovação automática de certificados

## Deployment

### Passo 1: Configurar DNS

Configure os registros DNS para apontar para o servidor:

```
A     studesk.pro     →  195.35.17.216
A     www.studesk.pro →  195.35.17.216
```

Aguarde a propagação do DNS (pode levar até 24 horas).

### Passo 2: Executar Setup do Nginx + SSL

Execute o script de setup **apenas uma vez**:

```bash
cd /home/borgesbsb/projetos/studesk-app/prod
./setup-nginx-ssl.sh
```

Este script irá:
1. Copiar a configuração do Nginx para o servidor
2. Instalar Nginx e Certbot
3. Solicitar confirmação de que o DNS está configurado
4. Obter certificados SSL do Let's Encrypt
5. Configurar renovação automática

### Passo 3: Deploy das Aplicações

Para fazer deploy do backend e mobile:

```bash
cd /home/borgesbsb/projetos/studesk-app/prod
./deploy-full.sh
```

Este comando deve ser executado sempre que você quiser atualizar a aplicação em produção.

## Estrutura de Diretórios no Servidor

```
/var/www/studesk/              # Backend (versão web)
├── .next/
├── node_modules/
├── src/
└── package.json

/var/www/studesk-mobile/       # Mobile PWA
├── apps/
│   └── mobile/
│       ├── .next/
│       └── src/
├── packages/
│   ├── database/
│   ├── types/
│   └── ui/
└── pnpm-workspace.yaml

/etc/nginx/sites-available/studesk    # Configuração do Nginx
/etc/letsencrypt/live/studesk.pro/    # Certificados SSL
```

## Processos PM2

```bash
# Ver status dos processos
ssh root@195.35.17.216 "pm2 status"

# Ver logs do backend
ssh root@195.35.17.216 "pm2 logs studesk"

# Ver logs do mobile
ssh root@195.35.17.216 "pm2 logs studesk-mobile"

# Reiniciar backend
ssh root@195.35.17.216 "pm2 restart studesk"

# Reiniciar mobile
ssh root@195.35.17.216 "pm2 restart studesk-mobile"
```

## URLs de Acesso

### Produção (com SSL)
- **https://studesk.pro** - Acesso principal (detecta automaticamente mobile/desktop)
- Backend direto (debug): http://195.35.17.216:3030
- Mobile direto (debug): http://195.35.17.216:3031

## Detecção de Mobile

O Nginx detecta os seguintes User-Agents como mobile:
- Android
- iPhone
- iPad
- iPod
- Mobile
- WebOS
- BlackBerry
- Opera Mini
- Opera Mobi
- Windows Phone

## Teste do PWA

Para testar a instalação do PWA:

1. Acesse https://studesk.pro pelo celular
2. No Chrome/Safari, clique em "Adicionar à tela inicial"
3. O app será instalado como um aplicativo nativo
4. Funciona offline após a primeira carga

## Renovação de Certificados SSL

Os certificados SSL são renovados automaticamente pelo Certbot.

Para verificar o status:
```bash
ssh root@195.35.17.216 "certbot certificates"
```

Para testar a renovação:
```bash
ssh root@195.35.17.216 "certbot renew --dry-run"
```

## Troubleshooting

### Nginx não está iniciando
```bash
ssh root@195.35.17.216 "nginx -t"  # Testar configuração
ssh root@195.35.17.216 "systemctl status nginx"
```

### PM2 não está rodando
```bash
ssh root@195.35.17.216 "pm2 resurrect"  # Restaurar processos salvos
ssh root@195.35.17.216 "pm2 save"       # Salvar estado atual
```

### Certificado SSL expirado
```bash
ssh root@195.35.17.216 "certbot renew --force-renewal"
```

### Ver logs do Nginx
```bash
ssh root@195.35.17.216 "tail -f /var/log/nginx/studesk-error.log"
ssh root@195.35.17.216 "tail -f /var/log/nginx/studesk-access.log"
```

## Segurança

- HTTPS obrigatório (redirecionamento automático de HTTP)
- Headers de segurança configurados (HSTS, X-Frame-Options, etc.)
- Certificados SSL renovados automaticamente
- Tamanho máximo de upload: 100MB (para PDFs)

## Performance

- Cache de arquivos estáticos: 1 ano
- Service workers não são cacheados (sempre atualizados)
- HTTP/2 habilitado
- Compressão gzip/brotli (padrão do Nginx)
