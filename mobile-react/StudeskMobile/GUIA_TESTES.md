# Guia de Testes - Studesk Mobile

Este guia explica como testar o app em diferentes cenários: emulador, celular físico e produção.

## Pré-requisitos

1. **Backend rodando** (se testar localmente)
2. **Android Studio** ou **Xcode** instalado
3. **Node.js 18+** instalado

---

## 1. Testar no Emulador Android

### Passo 1: Iniciar o backend local
```bash
cd /home/borgesbsb/projetos/studesk-app/studesk
npm run dev
```

### Passo 2: Verificar se o backend está acessível
```bash
curl http://localhost:3030/api/health
# Deve retornar: {"status":"ok",...}
```

### Passo 3: Iniciar o app no emulador
```bash
cd mobile-react/StudeskMobile

# Terminal 1: Metro bundler
npm start

# Terminal 2: Rodar app
npm run android
```

### Passo 4: Configurar servidor no app
- O app já vem configurado para usar `http://10.0.2.2:3030/api` (emulador Android)
- Se precisar alterar, clique em "⚙️ Configurar Servidor" na tela de login

### Passo 5: Fazer login
```
Email: borges.bnjamin@gmail.com
Senha: 123456
```

---

## 2. Testar em Celular Físico via ADB

### Passo 1: Descobrir o IP da sua máquina

**Linux/Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Procure por algo como: inet 192.168.0.100
```

**Windows:**
```powershell
ipconfig
# Procure por "Endereço IPv4" na interface de rede ativa
```

Exemplo de saída: `192.168.0.100`

### Passo 2: Conectar celular via USB
```bash
# Verificar se o celular está conectado
adb devices
# Deve aparecer: <serial>  device
```

### Passo 3: Iniciar o backend
```bash
cd /home/borgesbsb/projetos/studesk-app/studesk
npm run dev
```

### Passo 4: Testar se o celular acessa o backend
```bash
# Substitua 192.168.0.100 pelo SEU IP
curl http://192.168.0.100:3030/api/health
```

**Se não funcionar:**
- Verifique o firewall da sua máquina
- Certifique-se de que celular e PC estão na mesma rede WiFi

### Passo 5: Rodar o app no celular
```bash
cd mobile-react/StudeskMobile
npm run android
```

### Passo 6: Configurar servidor no app
1. Na tela de login, clique em "⚙️ Configurar Servidor"
2. No campo "URL Personalizada", digite:
   ```
   http://192.168.0.100:3030/api
   ```
   (Substitua pelo SEU IP)
3. Clique em "Testar Conexão"
4. Se sucesso, clique em "Salvar e Usar"

### Passo 7: Fazer login
```
Email: borges.bnjamin@gmail.com
Senha: 123456
```

---

## 3. Testar em Produção (studesk.pro)

### Passo 1: Rodar o app
```bash
cd mobile-react/StudeskMobile

# Emulador
npm run android

# Ou celular físico
adb devices && npm run android
```

### Passo 2: Configurar para produção
1. Na tela de login, clique em "⚙️ Configurar Servidor"
2. Clique no botão "Produção"
3. A URL será automaticamente preenchida com: `https://studesk.pro/api`
4. Clique em "Testar Conexão"
5. Se sucesso, clique em "Salvar e Usar"

### Passo 3: Fazer login
Use as credenciais de produção:
```
Email: borges.bnjamin@gmail.com
Senha: 123456
```

---

## Troubleshooting

### ❌ Erro: "Network Error" ou "Timeout"

**Emulador Android:**
```bash
# Verificar se o backend está rodando
curl http://localhost:3030/api/health

# Se funcionar, o problema é a URL no app
# Use: http://10.0.2.2:3030/api (não localhost!)
```

**Celular Físico:**
```bash
# 1. Verificar IP da máquina
ifconfig | grep "inet " | grep -v 127.0.0.1

# 2. Testar do próprio celular (navegador)
# Abra: http://SEU_IP:3030/api/health

# 3. Se não funcionar, verificar firewall
sudo ufw allow 3030  # Linux
```

### ❌ App não instala no celular

```bash
# Limpar cache e rebuildar
cd android
./gradlew clean
cd ..
npm run android
```

### ❌ Metro bundler com erro

```bash
# Limpar cache
npm start -- --reset-cache

# Se usar watchman
watchman watch-del-all
```

### ❌ Erro de conexão no iOS Simulator

iOS Simulator pode usar `localhost` diretamente:
```
http://localhost:3030/api
```

---

## Comandos Úteis

### Descobrir IP local
```bash
# Linux/Mac
ip addr show | grep "inet " | grep -v 127.0.0.1
# ou
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

### Testar backend
```bash
# Health check
curl http://localhost:3030/api/health

# Com IP local (para celular)
curl http://192.168.0.100:3030/api/health

# Produção
curl https://studesk.pro/api/health
```

### ADB úteis
```bash
# Listar dispositivos
adb devices

# Ver logs do app
adb logcat | grep ReactNativeJS

# Reverter porta (emulador acessa localhost)
adb reverse tcp:3030 tcp:3030
```

### Limpar tudo
```bash
# Limpar cache do React Native
cd mobile-react/StudeskMobile
rm -rf node_modules
npm install
npm start -- --reset-cache

# Limpar build Android
cd android
./gradlew clean
cd ..
```

---

## Resumo das URLs

| Cenário | URL da API |
|---------|-----------|
| **Emulador Android** | `http://10.0.2.2:3030/api` |
| **iOS Simulator** | `http://localhost:3030/api` |
| **Celular Físico** | `http://SEU_IP:3030/api` (ex: `http://192.168.0.100:3030/api`) |
| **Produção** | `https://studesk.pro/api` |

---

## Checklist de Teste

- [ ] Backend rodando em `localhost:3030`
- [ ] Health check respondendo: `/api/health`
- [ ] Emulador: URL configurada para `http://10.0.2.2:3030/api`
- [ ] Celular físico: IP local descoberto
- [ ] Celular físico: Firewall liberado na porta 3030
- [ ] Celular físico: URL configurada para `http://IP:3030/api`
- [ ] Login funcionando com credenciais de teste
- [ ] Produção: URL configurada para `https://studesk.pro/api`
- [ ] Produção: Login funcionando

---

## Suporte

Se encontrar problemas:
1. Verifique os logs do Metro bundler
2. Verifique os logs do backend
3. Use `adb logcat` para ver logs do Android
4. Teste a conexão com `curl` antes de usar o app
