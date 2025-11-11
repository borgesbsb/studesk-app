# StudesDk - Documentação

Documentação completa da plataforma StudesDk para gerenciamento de estudos.

## 🚀 Início Rápido

### Para Retomar Sessão (Claude)
1. **Leia primeiro**: [PRD.md](./PRD.md) - Contexto essencial em 2min
2. **Se precisar de detalhes**: [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
3. **Para problemas**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Para Desenvolvimento
```bash
# Setup
npm install
npm run copy-webviewer
npx prisma generate
npx prisma db push

# Rodar
npm run dev
```

## 📚 Documentos

### Essenciais (Leia Nesta Ordem)

1. **[PRD.md](./PRD.md)** ⭐
   - Contexto rápido para retomar sessões
   - O que está implementado
   - Decisões importantes
   - O que NÃO fazer
   - ~100 linhas, leitura: 2-3min

2. **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**
   - Visão geral concisa do projeto
   - Funcionalidades principais
   - Estrutura e fluxos
   - ~180 linhas, leitura: 5min

3. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - Detalhes técnicos completos
   - Estrutura em camadas
   - Modelos de dados
   - Padrões e convenções
   - ~400 linhas, consulta conforme necessário

### Referência

4. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**
   - Problemas comuns e soluções
   - Erros frequentes
   - Debug e verificações
   - Scripts úteis

5. **[CLAUDE.md](./CLAUDE.md)**
   - Guia específico para Claude Code
   - Comandos disponíveis
   - Arquitetura do projeto
   - Best practices

### Features Específicas

6. **[ANOTACOES.md](./ANOTACOES.md)**
   - Sistema de anotações em PDFs
   - Como funciona o salvamento
   - Implementação técnica

## 🗂️ Estrutura da Documentação

```
/docs
├── README.md              # Este arquivo (índice)
├── PRD.md                 # ⭐ Leia primeiro ao retomar sessão
├── PROJECT_OVERVIEW.md    # Visão geral concisa
├── ARCHITECTURE.md        # Detalhes técnicos completos
├── TROUBLESHOOTING.md     # Soluções de problemas
├── CLAUDE.md              # Guia para Claude Code
└── ANOTACOES.md           # Feature: Sistema de anotações
```

## 📖 Como Usar Esta Documentação

### Você é Claude retomando uma sessão?
```
1. Abra PRD.md
2. Leia rapidamente PROJECT_OVERVIEW.md
3. Consulte TROUBLESHOOTING.md se houver problemas
4. Use ARCHITECTURE.md como referência quando necessário
```

### Você é um desenvolvedor novo no projeto?
```
1. Leia PROJECT_OVERVIEW.md
2. Rode o setup (comandos acima)
3. Explore ARCHITECTURE.md
4. Tenha TROUBLESHOOTING.md à mão
```

### Você precisa entender uma feature específica?
```
1. Veja se existe arquivo específico (ex: ANOTACOES.md)
2. Consulte ARCHITECTURE.md para detalhes técnicos
3. Veja PROJECT_OVERVIEW.md para o contexto geral
```

### Você está com um erro?
```
1. Abra TROUBLESHOOTING.md
2. Use Ctrl+F para buscar o erro
3. Siga os passos de debug
```

## 🎯 O Que Este Projeto É

Plataforma web para **estudantes de concursos** organizarem:
- PDFs de estudo
- Planos e cronogramas
- Progresso de aprendizado

**Stack**: Next.js 15 + PostgreSQL + Prisma + PDFTron WebViewer

## ✅ Status Atual

- ✅ Upload e visualização de PDFs
- ✅ Sistema de anotações
- ✅ Planos de estudo (4 modos)
- ✅ Dashboard com tracking
- ✅ Autenticação
- ❌ Sistema de questões (removido)

## 🚫 O Que NÃO Fazer

1. Sistema de questões (já foi removido)
2. API Routes para CRUD (usar Server Actions)
3. Upload em cloud (usar local storage)
4. Features de teams/grupos
5. Integração com IA sem discutir

## 📊 Métricas de Documentação

| Arquivo | Linhas | Tempo Leitura | Uso |
|---------|--------|---------------|-----|
| PRD.md | ~100 | 2-3min | Sempre (retomar sessão) |
| PROJECT_OVERVIEW.md | ~180 | 5min | Início/visão geral |
| ARCHITECTURE.md | ~400 | 15min | Referência técnica |
| TROUBLESHOOTING.md | ~300 | Consulta | Quando há problemas |
| CLAUDE.md | ~150 | - | Para Claude Code |
| ANOTACOES.md | ~70 | 3min | Feature específica |

## 🔄 Manutenção da Documentação

### Quando Atualizar

- **PRD.md**: Mudança de funcionalidade ou decisão importante
- **ARCHITECTURE.md**: Mudança de estrutura ou padrões
- **TROUBLESHOOTING.md**: Novo problema comum encontrado
- **PROJECT_OVERVIEW.md**: Mudança significativa no projeto

### Princípios

1. **Concisão**: Menos é mais
2. **Pragmatismo**: Foco no que é útil
3. **Atualidade**: Remover o que ficou obsoleto
4. **Hierarquia**: Informação mais importante primeiro

---

**Última atualização**: 2025-01-11
**Versão da documentação**: 2.0 (Reestruturação completa)
