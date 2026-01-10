# Autenticação Compartilhada entre Web e Mobile

## 📋 Visão Geral

O Studesk utiliza **autenticação compartilhada** entre o app web e o app mobile (PWA). Isso significa que quando um usuário faz login em um dos apps, ele fica automaticamente autenticado no outro.

## 🔐 Como Funciona

### Desenvolvimento (localhost)
- **Web App**: `http://localhost:3030`
- **Mobile App**: `http://localhost:3031`
- **Cookie**: `next-auth.session-token` (HTTP only, não seguro)
- **Secret**: `NEXTAUTH_SECRET` **DEVE SER IDÊNTICO** em ambos os apps

### Produção
- **Web App**: `https://web.studesk.com`
- **Mobile App**: `https://mobile.studesk.com`
- **Cookie**: `__Secure-next-auth.session-token` (HTTP only, secure)
- **Domain**: `.studesk.com` (permite compartilhar entre subdomínios)
- **Secret**: `NEXTAUTH_SECRET` **DEVE SER IDÊNTICO** em ambos os apps

## ⚙️ Configuração

### 1. NEXTAUTH_SECRET (CRÍTICO)

**IMPORTANTE**: Os dois apps DEVEM usar o MESMO secret!

```bash
# Web App: studesk/.env ou .env.local
NEXTAUTH_SECRET=PPT5Un1oRL+W5dNyWh0s9f5+oI3Gb0yuQy3H/QQDTA4=

# Mobile App: studesk-monorepo/apps/mobile/.env.local
NEXTAUTH_SECRET=PPT5Un1oRL+W5dNyWh0s9f5+oI3Gb0yuQy3H/QQDTA4=
```

**⚠️ Se os secrets forem diferentes, a autenticação não funcionará!**

### 2. Cookies Configurados

Ambos os apps possuem a mesma configuração de cookies em `lib/auth.ts`:

```typescript
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      // Em produção, permite compartilhar entre web.studesk.com e mobile.studesk.com
      domain: process.env.NODE_ENV === 'production' ? '.studesk.com' : undefined,
    }
  }
}
```

### 3. CORS Configurado

O backend web permite requisições do mobile via CORS:

```typescript
// studesk/src/app/api/dashboard/*/route.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
    ? 'https://mobile.studesk.com'
    : 'http://localhost:3031',
  'Access-Control-Allow-Credentials': 'true',
  // ...
}
```

## 🚀 Deploy em Produção

### Requisitos

1. ✅ **Subdomínios configurados**:
   - `web.studesk.com` → Web App
   - `mobile.studesk.com` → Mobile App

2. ✅ **HTTPS obrigatório** em ambos os apps

3. ✅ **Variáveis de ambiente configuradas**:

```bash
# Web App
NEXTAUTH_URL=https://web.studesk.com
NEXTAUTH_SECRET=seu-secret-aqui  # MESMO em ambos
NODE_ENV=production

# Mobile App
NEXTAUTH_URL=https://mobile.studesk.com
NEXT_PUBLIC_API_URL=https://web.studesk.com/api
NEXTAUTH_SECRET=seu-secret-aqui  # MESMO em ambos
NODE_ENV=production
```

## 🔍 Verificação

### Como testar se está funcionando:

1. Faça login no **web app** (localhost:3030 ou web.studesk.com)
2. Abra o **mobile app** (localhost:3031 ou mobile.studesk.com)
3. Você deve estar automaticamente autenticado

### Se não funcionar:

1. **Verifique os secrets**: Eles DEVEM ser idênticos
2. **Verifique os cookies**: Abra DevTools → Application → Cookies
   - Dev: Deve ter `next-auth.session-token` em localhost
   - Prod: Deve ter `__Secure-next-auth.session-token` em .studesk.com
3. **Verifique o CORS**: Não deve haver erros de CORS no console
4. **Limpe os cookies**: Às vezes é necessário limpar e fazer login novamente

## 📚 Referências

- [NextAuth.js - Cookies](https://next-auth.js.org/configuration/options#cookies)
- [MDN - Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
