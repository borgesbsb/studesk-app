# StudesDk Mobile PWA

Progressive Web App mobile-optimized para o StudesDk.

## Features Implementadas

✅ **Offline-First**: Cache de PDFs no IndexedDB (500MB)
✅ **Google Drive Integration**: Download direto do Drive
✅ **AI Text Reader**: Leitor de texto com IA
✅ **Autenticação Persistente**: Não pede autorização repetida
✅ **UI Mobile-Optimized**: Interface para telas pequenas

## Stack

- Next.js 15.3.2 + React 19
- IndexedDB (idb library)
- OpenAI API para leitura de PDFs
- NextAuth.js + Prisma

## Desenvolvimento

```bash
# Instalar dependências (na raiz do monorepo)
pnpm install

# Rodar mobile app
pnpm --filter mobile dev
```

**Portas**: Web (3030) | Mobile (3031)

## Documentação Completa

Ver `/docs/ARCHITECTURE.md` para detalhes completos da arquitetura.

---

**Última atualização**: 2025-12-27
