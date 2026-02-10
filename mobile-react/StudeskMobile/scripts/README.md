# 📱 Scripts de Build - StudeskMobile

Scripts para facilitar o desenvolvimento e build do aplicativo React Native.

---

## 🚀 Scripts Disponíveis

### 1. `build-fast.sh` ⚡
Script de build otimizado com múltiplas opções de velocidade.

**Como usar:**
```bash
./scripts/build-fast.sh
```

**Opções disponíveis:**

| Opção | Tempo | Quando usar |
|-------|-------|-------------|
| **1 - SUPER RÁPIDO** | ~30 seg | Mudou apenas arquivos `.tsx`, `.ts`, `.js` (código React) |
| **2 - RÁPIDO** | 1-2 min | Mudou código React + algumas configurações |
| **3 - NORMAL** | 3-4 min | Mudou código nativo (Java/Kotlin) ou adicionou bibliotecas |
| **4 - COMPLETO** | 8-10 min | Problemas no build ou mudanças estruturais grandes |
| **5 - ARM64 APENAS** | 2-3 min | APK otimizado para celulares modernos (2018+) |

**Exemplos de uso:**

```bash
# Você mudou apenas SettingsScreen.tsx
./scripts/build-fast.sh
# Escolha opção 1 (SUPER RÁPIDO) ⚡⚡⚡

# Você adicionou uma nova biblioteca React Native
./scripts/build-fast.sh
# Escolha opção 3 (NORMAL) 📦

# O build está dando erro estranho
./scripts/build-fast.sh
# Escolha opção 4 (COMPLETO) 🔥
```

---

### 2. `build-release.sh` 🔨
Build completo tradicional com clean.

**Como usar:**
```bash
./scripts/build-release.sh
```

**O que faz:**
1. Cria diretório assets
2. Gera bundle JavaScript
3. Executa `gradlew clean`
4. Compila APK Release
5. Opcionalmente instala no dispositivo conectado

**Tempo:** ~8-10 minutos

**Quando usar:**
- Primeiro build do projeto
- Quando `build-fast.sh` não funcionar
- Quando precisar de um build "limpo" garantido

---

### 3. `install-release.sh` 📲
Instala o APK Release já compilado no dispositivo.

**Como usar:**
```bash
./scripts/install-release.sh
```

**O que faz:**
- Detecta dispositivos conectados (USB ou WiFi)
- Desinstala versão anterior
- Instala o APK Release
- Opcionalmente inicia o app

**Requer:**
- APK Release já compilado em `android/app/build/outputs/apk/release/app-release.apk`
- Dispositivo conectado via USB ou WiFi

---

### 4. `install-apk.sh` 📱
Instala o APK Debug no dispositivo.

**Como usar:**
```bash
./scripts/install-apk.sh
```

**Diferença para install-release.sh:**
- Instala versão DEBUG (modo desenvolvimento)
- APK em `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📖 Fluxo de Trabalho Recomendado

### Desenvolvimento Rápido (Mudanças React)
```bash
# 1. Faça suas mudanças em arquivos .tsx/.ts
# 2. Build super rápido
./scripts/build-fast.sh
# Escolha opção 1

# 3. Instale
./scripts/install-release.sh
```

**Tempo total:** ~1 minuto ⚡

---

### Primeira vez / Build completo
```bash
# 1. Build completo
./scripts/build-release.sh

# 2. Instale
./scripts/install-release.sh
```

**Tempo total:** ~10 minutos

---

### Adicionou biblioteca nativa
```bash
# 1. Instale a dependência
npm install react-native-xyz

# 2. Build normal (sem clean)
./scripts/build-fast.sh
# Escolha opção 3

# 3. Instale
./scripts/install-release.sh
```

**Tempo total:** ~5 minutos

---

## 🐛 Troubleshooting

### APK não instala
```bash
# Verifique se o dispositivo está conectado
adb devices

# Verifique se o APK existe
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

### Build dando erro
```bash
# Tente um build completo
./scripts/build-fast.sh
# Escolha opção 4 (COMPLETO)

# Se ainda der erro, limpe tudo
cd android
./gradlew clean
cd ..
rm -rf android/app/build
rm -rf android/app/src/main/assets/index.android.bundle
```

### Conexão USB não funciona
```bash
# Reinicie o ADB
adb kill-server
adb start-server
adb devices
```

### App não conecta ao backend
O app tem tela de configurações com 4 opções de URL:

1. **🔌 Localhost** - `http://localhost:3030/api`
   - Requer: `adb reverse tcp:3030 tcp:3030`

2. **📱 Rede Local** - `http://192.168.15.8:3030/api`
   - Celular e PC na mesma rede WiFi

3. **🖥️ Emulador** - `http://10.0.2.2:3030/api`
   - Para Android Emulator (AVD)

4. **🌐 Produção** - `https://studesk.pro/api`
   - Servidor online

**Acesse Settings no app e escolha a URL correta!**

---

## 💡 Dicas

### Build mais rápido sempre
- Use **opção 1** quando possível
- Só use clean quando necessário
- Mantenha o Gradle daemon rodando

### APK menor
- Use **opção 5** (ARM64) para celulares modernos
- APK fica ~40% menor

### Instalação via WiFi
```bash
# Configure uma vez (com USB conectado)
adb tcpip 5555

# Desconecte o cabo e conecte via WiFi
adb connect 192.168.15.XXX:5555

# Agora pode usar os scripts normalmente
./scripts/install-release.sh
```

---

## 📊 Comparação de Performance

| Script | Tempo | Clean | Uso |
|--------|-------|-------|-----|
| `build-fast.sh` opção 1 | 30 seg | ❌ | Mudanças React |
| `build-fast.sh` opção 2 | 1-2 min | ❌ | Mudanças React + configs |
| `build-fast.sh` opção 3 | 3-4 min | ❌ | Código nativo |
| `build-fast.sh` opção 4 | 8-10 min | ✅ | Build problemático |
| `build-release.sh` | 8-10 min | ✅ | Build tradicional |

---

## 🔧 Requisitos

- **Java**: JDK 17 (configurado em `/opt/android-studio/jbr`)
- **Android SDK**: Platform-tools instalado
- **Node.js**: v16+ com npm
- **React Native**: 0.76+
- **ADB**: Configurado no PATH

---

## 📝 Notas

- Todos os scripts devem ser executados da raiz do projeto React Native
- APK Release é gerado em: `android/app/build/outputs/apk/release/app-release.apk`
- APK Debug é gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`
- Logs do build são exibidos no terminal

---

## 🆘 Precisa de Ajuda?

1. Verifique os logs de erro no terminal
2. Tente um build completo (opção 4)
3. Limpe cache: `rm -rf node_modules && npm install`
4. Verifique se todas as dependências estão instaladas
