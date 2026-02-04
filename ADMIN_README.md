# Sistema de Administração - Studesk

Sistema completo de administração para gerenciamento de usuários e visualização de estatísticas do Studesk.

## Funcionalidades

### Autenticação
- Login seguro com JWT
- Sessão persistente com cookies httpOnly
- Middleware de proteção de rotas

### Dashboard
- Visão geral do sistema com estatísticas em tempo real
- Total de usuários, disciplinas, materiais, planos de estudo e simulados
- Usuários cadastrados nos últimos 30 dias
- Lista dos 5 usuários mais recentes
- Gráfico de atividade de leitura dos últimos 7 dias

### Gerenciamento de Usuários
- Listagem completa com paginação
- Busca por nome ou email
- Visualização de detalhes do usuário
- Estatísticas de uso individual
- Exclusão de usuários (com confirmação)
- Status de conexão com Google Drive

### Sidebar de Navegação
- Dashboard
- Usuários
- Disciplinas
- Materiais
- Estatísticas
- Configurações
- Logout

## Instalação e Configuração

### 1. Criar o primeiro administrador

Execute o comando:

```bash
npm run create-admin
```

Isso criará um administrador padrão com as credenciais:
- **Email**: admin@studesk.com
- **Senha**: admin123

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

### 2. Configurar variável de ambiente (opcional)

Adicione ao seu `.env`:

```env
ADMIN_JWT_SECRET=sua-chave-secreta-aqui
```

Se não configurada, será usada uma chave padrão (não recomendado para produção).

### 3. Acessar o painel

Acesse: `http://localhost:3030/admin/login`

## Rotas

### Públicas
- `/admin` - Redireciona para login ou dashboard
- `/admin/login` - Página de login

### Protegidas (requer autenticação)
- `/admin/dashboard` - Dashboard principal
- `/admin/users` - Listagem de usuários
- `/admin/users/[id]` - Detalhes do usuário
- `/admin/disciplinas` - Gestão de disciplinas (em desenvolvimento)
- `/admin/materiais` - Gestão de materiais (em desenvolvimento)
- `/admin/stats` - Estatísticas avançadas (em desenvolvimento)
- `/admin/settings` - Configurações (em desenvolvimento)

## Estrutura de Arquivos

```
src/
├── app/
│   └── admin/
│       ├── (protected)/          # Layout com autenticação
│       │   ├── dashboard/
│       │   └── users/
│       ├── login/
│       └── page.tsx
├── components/
│   └── admin/
│       ├── admin-sidebar.tsx
│       └── users-table.tsx
├── interface/
│   └── actions/
│       └── admin/
│           ├── auth.ts           # Autenticação
│           └── users.ts          # Gerenciamento de usuários
└── lib/
    └── admin-auth.ts             # Helper de autenticação

prisma/
└── schema.prisma                 # Modelo Admin

scripts/
└── create-first-admin.ts         # Script de criação do primeiro admin
```

## Modelo de Dados

### Admin

```prisma
model Admin {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      String   @default("admin") // admin, super_admin
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([active])
}
```

## Server Actions

### Autenticação (`src/interface/actions/admin/auth.ts`)

- `loginAdmin(email, password)` - Faz login e cria sessão
- `logoutAdmin()` - Encerra sessão
- `getAdminSession()` - Retorna sessão atual
- `createFirstAdmin()` - Cria primeiro administrador

### Usuários (`src/interface/actions/admin/users.ts`)

- `getUsers(page, limit, search)` - Lista usuários com paginação
- `getUserDetails(userId)` - Detalhes completos de um usuário
- `deleteUser(userId)` - Remove usuário
- `getAdminStats()` - Estatísticas gerais do sistema

## Segurança

### Autenticação
- Senhas hasheadas com bcryptjs (10 rounds)
- JWT tokens com expiração de 7 dias
- Cookies httpOnly, secure em produção
- SameSite lax para proteção CSRF

### Autorização
- Layout protegido com `requireAdminAuth()`
- Todas as actions verificam sessão
- Redirecionamento automático para login

### Boas Práticas
- Tokens JWT armazenados em cookies httpOnly
- Senhas nunca expostas em APIs
- Validação de sessão em todas as rotas protegidas
- Mensagens de erro genéricas para segurança

## Desenvolvimento Futuro

### Próximas Funcionalidades
- [ ] Gestão de disciplinas
- [ ] Gestão de materiais de estudo
- [ ] Estatísticas avançadas
- [ ] Configurações do sistema
- [ ] Logs de auditoria
- [ ] Gestão de múltiplos admins
- [ ] Níveis de permissão (admin vs super_admin)
- [ ] Alteração de senha
- [ ] Recuperação de senha
- [ ] Exportação de dados
- [ ] Dashboard de performance do sistema

## Comandos Úteis

```bash
# Criar primeiro admin
npm run create-admin

# Desenvolvimento
npm run dev

# Build
npm run build

# Gerar Prisma Client
npx prisma generate

# Atualizar banco de dados
npx prisma db push

# Abrir Prisma Studio
npx prisma studio
```

## Troubleshooting

### Erro: "Já existe um administrador cadastrado"
Se precisar criar um novo admin, primeiro delete o existente via Prisma Studio ou SQL.

### Sessão expira automaticamente
Os tokens JWT expiram após 7 dias. Faça login novamente.

### Erro de autenticação
Verifique se o cookie `admin-token` está sendo enviado e se a variável `ADMIN_JWT_SECRET` está configurada.

### Página em branco após login
Verifique o console do navegador para erros e certifique-se de que o servidor está rodando.
