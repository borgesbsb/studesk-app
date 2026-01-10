# StudesDk

Plataforma completa de estudos para gerenciamento de materiais e planos de estudo personalizados.

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma generate
npx prisma db push

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📚 Documentação

**Para retomar sessão rapidamente**: Leia [PRD.md](./docs/PRD.md) ⭐

Documentação completa em [`/docs`](./docs/README.md):

- **[PRD](./docs/PRD.md)** - Contexto rápido (2-3min) ⭐
- **[Visão Geral](./docs/PROJECT_OVERVIEW.md)** - Funcionalidades e estrutura (5min)
- **[Arquitetura](./docs/ARCHITECTURE.md)** - Detalhes técnicos completos (15min)
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Problemas comuns e soluções

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 15.3.2 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **UI**: React 19, Tailwind CSS, Radix UI
- **PDF**: Syncfusion PDF Viewer
- **Auth**: NextAuth.js

## ✨ Principais Funcionalidades

- 📄 **Visualização de PDFs** - Upload, visualização e anotações em materiais
- 📊 **Planos de Estudo** - Organização por semanas, ciclos e disciplinas
- 📈 **Dashboard Analítico** - Acompanhamento de progresso e desempenho
- 🎯 **Gerenciamento de Disciplinas** - Organize suas matérias de estudo

## 📋 Comandos Principais

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor de desenvolvimento
npm run build            # Build de produção
npm run start            # Servidor de produção

# Banco de Dados
npx prisma generate      # Gerar Prisma Client
npx prisma db push       # Aplicar schema ao banco
npx prisma migrate dev   # Criar e aplicar migrations
npx prisma studio        # Interface visual do banco

# Utilitários
npm run lint             # Executar ESLint
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/studesk"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu-secret-aqui"
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY="sua-chave-syncfusion-aqui"
```

## 🏗️ Estrutura do Projeto

```
/src
  /app                    # Next.js App Router
    /(authenticated)      # Rotas protegidas
  /domain/entities        # Entidades de domínio
  /application/services   # Serviços de aplicação
  /interface/actions      # Server Actions
  /components            # Componentes React
/prisma                  # Schema e migrations
/public                  # Assets estáticos
/docs                    # Documentação completa
```

## 📖 Links Úteis

- [Documentação Completa](/docs/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## 📝 Licença

Este projeto é de uso privado.

---

**Desenvolvido por**: Benjamin Borges
**Última atualização**: 2025-01-11
