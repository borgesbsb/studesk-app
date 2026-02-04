# Script de Seed - Dados de Demonstração

Este script cria dados aleatórios para demonstração do sistema Studesk.

## O que o script cria?

Para cada usuário, o script gera:

### 1. Dados Básicos
- Usuário com nome, email e senha
- Hash único para rotas personalizadas

### 2. Plano de Estudo
- 1 plano de estudo ativo
- 3 semanas (passada, atual, próxima)
- Disciplinas variadas (6 a 14 disciplinas por usuário)

### 3. Estrutura Detalhada
- **DisciplinaSemana**: Cada disciplina tem horas e questões planejadas
- **DisciplinaDia**: Distribuição das atividades por dia da semana
- **Progresso**: Horas e questões realizadas (mais completo em semanas passadas)

### 4. Materiais de Estudo
- PDFs com páginas totais e páginas lidas
- Vídeos com duração e tempo assistido
- Associação com disciplinas

### 5. Histórico de Leitura
- Sessões de estudo reais (não é tempo transferido)
- Nome da sessão
- Página atual
- Tempo de leitura em segundos
- Assuntos estudados
- Datas distribuídas ao longo do período

### 6. Simulados
- 2 a 5 simulados por usuário
- Status: finalizado ou em andamento
- Questões distribuídas entre disciplinas
- Taxa de acerto entre 50% e 90%
- Respostas corretas e incorretas registradas

## Usuários Criados

O script cria 5 usuários demo com perfis diferentes:

| Nome | Email | Disciplinas | Materiais | Histórico | Simulados |
|------|-------|-------------|-----------|-----------|-----------|
| Ana Silva | ana.silva@demo.com | 8 | ✓ | ✓ | ✓ |
| Carlos Santos | carlos.santos@demo.com | 12 | ✓ | ✓ | ✓ |
| Maria Oliveira | maria.oliveira@demo.com | 6 | ✓ | ✗ | ✓ |
| João Costa | joao.costa@demo.com | 10 | ✓ | ✓ | ✗ |
| Fernanda Lima | fernanda.lima@demo.com | 14 | ✓ | ✓ | ✓ |

## Como usar

### Executar o script

```bash
npm run seed-demo
```

### Credenciais de acesso

**Usuários Demo:**
- Email: qualquer um dos emails acima
- Senha: `123456`

**Admin:**
- Email: `admin@studesk.com`
- Senha: `admin123`

## Estrutura dos dados gerados

### Plano de Estudo
- **Duração**: 60 dias
- **Início**: 15 dias atrás
- **Semanas**: 3 (passada, atual, próxima)

### Progresso
- **Semana 1** (passada): 70-100% das horas e 60-100% das questões completadas
- **Semana 2** (atual): 0-60% das horas e 0-50% das questões
- **Semana 3** (próxima): 0% (não iniciada)

### Materiais
- **PDFs**: 50 a 300 páginas
- **Vídeos**: 10 a 60 minutos
- **Progresso**: Variado entre 0% e 70%

### Histórico de Leitura
- **Sessões**: 10 a 30 por usuário
- **Duração**: 5 a 60 minutos por sessão
- **Datas**: Distribuídas desde o início do plano

### Simulados
- **Questões**: 20 a 50 por simulado
- **Disciplinas**: 3 a 6 por simulado
- **Taxa de acerto**: 50% a 90%

## Observações

- O script verifica se o usuário já existe antes de criar
- Todos os dados são gerados aleatoriamente mas seguem padrões realistas
- Os IDs são gerados automaticamente pelo Prisma
- As datas são distribuídas de forma lógica (sessões de estudo no passado, semanas futuras sem progresso)

## Análise Técnica

O script foi baseado na análise do usuário real `borgesbsb.dev@gmail.com`:

- Estrutura de plano de estudo com semanas e dias
- Relacionamentos entre disciplinas, materiais e sessões
- Formato de progresso (horas e questões por dia)
- Estrutura de simulados com disciplinas e questões
- Histórico de leitura com sessões nomeadas e assuntos

## Para visualizar os dados

### Admin Dashboard
1. Acesse: http://localhost:3030/admin/login
2. Login: admin@studesk.com / admin123
3. Vá em "Estatísticas" > "Por Usuário"
4. Busque qualquer um dos usuários demo

### Dashboard do Usuário
1. Acesse: http://localhost:3030/login
2. Login: qualquer email demo / 123456
3. Navegue pelas páginas:
   - /hoje - Ver matérias do dia
   - /plano-estudos - Ver plano completo
   - /materiais - Ver materiais de estudo
   - /simulados - Ver simulados realizados
   - /perfil - Ver estatísticas gerais
