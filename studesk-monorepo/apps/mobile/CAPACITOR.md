# Capacitor - App Nativo com TTS de Fundo

Este projeto agora suporta Capacitor para gerar apps nativos iOS e Android com suporte completo a Text-to-Speech em segundo plano, mesmo com a tela bloqueada.

## 🎯 O Que Muda

- **PWA (Web)**: Usa Web Speech API (limitações com tela bloqueada)
- **Capacitor (Nativo)**: Usa TTS nativo do SO (funciona com tela bloqueada!)

O código detecta automaticamente qual ambiente está rodando e usa a API apropriada.

## 📦 Configuração Inicial

### 1. Adicionar Plataformas

```bash
# Android
cd apps/mobile
npm run cap:add:android

# iOS (requer macOS com Xcode)
npm run cap:add:ios
```

### 2. Sincronizar Código Web com Apps Nativos

```bash
npm run cap:sync
```

Isso copia o build do Next.js para as pastas android/ e ios/.

## 🚀 Desenvolvimento

### Modo PWA (atual - sem Capacitor)

```bash
npm run dev
# Acesse: http://localhost:3031
```

### Modo Nativo (com Capacitor)

#### Android

```bash
# 1. Build do Next.js
npm run build

# 2. Sync com Capacitor
npm run cap:sync

# 3. Abrir no Android Studio
npm run cap:open:android

# OU rodar direto no device/emulador
npm run cap:run:android
```

#### iOS

```bash
# 1. Build do Next.js
npm run build

# 2. Sync com Capacitor
npm run cap:sync

# 3. Abrir no Xcode
npm run cap:open:ios

# OU rodar direto no device/simulator
npm run cap:run:ios
```

## 🔊 Como Funciona o TTS

### Hook useTextToSpeech

```tsx
import { useTextToSpeech } from '@/hooks/useTextToSpeech'

function MyComponent() {
  const tts = useTextToSpeech()

  const handleSpeak = () => {
    tts.speak({
      text: 'Texto para falar',
      lang: 'pt-BR',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    })
  }

  return (
    <div>
      <p>Plataforma: {tts.isNative ? 'Nativo' : 'Web'}</p>
      <button onClick={handleSpeak}>Falar</button>
      <button onClick={tts.pause}>Pausar</button>
      <button onClick={tts.resume}>Retomar</button>
      <button onClick={tts.stop}>Parar</button>
    </div>
  )
}
```

### Detecção de Plataforma

```tsx
import { useCapacitor } from '@/hooks/useCapacitor'

function MyComponent() {
  const { isNative, platform, isIOS, isAndroid, isWeb } = useCapacitor()

  return <p>Rodando em: {platform}</p>
}
```

## 🔧 Configuração Adicional

### Android

1. Abra `android/app/src/main/AndroidManifest.xml`
2. Adicione permissões se necessário

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### iOS

1. Abra `ios/App/App/Info.plist`
2. Configure categorias de áudio para background:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

## 📱 Build para Produção

### Android APK/AAB

```bash
cd android
./gradlew assembleRelease  # APK
./gradlew bundleRelease    # AAB (Google Play)
```

### iOS IPA

1. Abra o Xcode
2. Product → Archive
3. Distribute App

## 🐛 Troubleshooting

### "TTS não funciona no emulador"

- Android: Instale vozes PT-BR nas configurações do emulador
- iOS: Configure idioma do simulator para pt-BR

### "Sincronização falha"

```bash
# Limpe e reconstrua
rm -rf android ios
npm run cap:add:android
npm run cap:add:ios
npm run build
npm run cap:sync
```

### "Next.js não exporta"

O projeto usa `output: 'export'` no next.config quando detecta build para Capacitor.
Se falhar, verifique se não há rotas dinâmicas ou API routes que precisam de server-side.

## 📚 Recursos

- [Documentação do Capacitor](https://capacitorjs.com/docs)
- [Plugin TTS](https://github.com/capacitor-community/text-to-speech)
- [Capacitor + Next.js](https://capacitorjs.com/docs/guides/nextjs)
