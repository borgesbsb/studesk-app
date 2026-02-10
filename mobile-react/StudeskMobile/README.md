# Studesk Mobile

Aplicativo mobile do Studesk desenvolvido com React Native.

## Funcionalidades

- Autenticação integrada com backend Next.js
- Suporte a áudio em background com react-native-track-player
- Navegação com React Navigation
- Armazenamento local com AsyncStorage

## Requisitos

- Node.js 18+
- React Native CLI
- Android Studio (para Android)
- Xcode (para iOS)
- Java 17+ (para Android)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar backend

O app se conecta ao backend Next.js do Studesk:
- **Desenvolvimento**: `http://localhost:3030/api`
- **Produção**: `https://studesk.pro/api`

As URLs são configuradas automaticamente em `src/services/api.ts` baseado em `__DEV__`.

### 3. Rodar o app

#### Android

```bash
# Iniciar o bundler Metro
npm start

# Em outro terminal, rodar o Android
npm run android
```

#### iOS

```bash
# Instalar pods
cd ios && pod install && cd ..

# Rodar o iOS
npm run ios
```

## Estrutura do Projeto

```
src/
├── screens/          # Telas do app
│   ├── LoginScreen.tsx
│   └── HomeScreen.tsx
├── services/         # Serviços de API
│   ├── api.ts
│   └── auth.service.ts
├── contexts/         # Contextos React
│   └── AuthContext.tsx
├── navigation/       # Configuração de navegação
│   └── AppNavigator.tsx
├── types/           # Tipos TypeScript
│   └── auth.ts
├── components/      # Componentes reutilizáveis
└── utils/          # Utilitários
```

## Autenticação

O app usa o mesmo sistema de autenticação do web:
- NextAuth com JWT
- Sessão de 24 horas
- Armazenamento local com AsyncStorage

## Credenciais de Teste

```
Email: borges.bnjamin@gmail.com
Senha: 123456
```

## Comandos Úteis

```bash
# Limpar cache
npm start -- --reset-cache

# Build Android
cd android && ./gradlew clean && cd ..

# Verificar problemas no Android
cd android && ./gradlew --info

# Limpar pods do iOS
cd ios && pod deintegrate && pod install && cd ..
```

## Próximos Passos

- [ ] Implementar tela de registro
- [ ] Adicionar funcionalidade de áudio em background
- [ ] Implementar listagem de materiais de estudo
- [ ] Adicionar leitor de PDF integrado
- [ ] Implementar sistema de questões
- [ ] Adicionar sincronização offline

## Problemas Comuns

### Android não conecta ao localhost

Se o app Android não conseguir conectar ao backend local:

```bash
# Redirecionar porta do emulador
adb reverse tcp:3030 tcp:3030
```

### Metro bundler com erro de cache

```bash
# Limpar cache do Metro
npm start -- --reset-cache

# Limpar cache do watchman (se instalado)
watchman watch-del-all
```
