# 📋 Plano de Implementação - StudesDk Mobile PWA

## 🎯 Objetivo

Criar interface mobile completa e isolada do desktop, otimizada para smartphones e tablets, com todas as funcionalidades principais do StudesDk.

---

## 📦 Módulo 1: Setup e Autenticação
**Prioridade**: 🔴 Alta | **Duração estimada**: 2-3 horas

### O que vamos fazer:
- ✅ Configurar cliente API para consumir backend do web
- ✅ Implementar login mobile (tela otimizada para touch)
- ✅ Implementar registro de usuário
- ✅ Configurar NextAuth no mobile
- ✅ Criar hook useAuth para gerenciar sessão
- ✅ Implementar proteção de rotas mobile

### Entregas:
- `/login` - Tela de login mobile
- `/register` - Tela de registro mobile
- `/api/auth/[...nextauth]` - Configuração NextAuth mobile
- `useAuth` hook
- Middleware de autenticação

### Dependências:
- Backend web rodando (porta 3030)
- Banco de dados configurado

---

## 📊 Módulo 2: Dashboard Mobile
**Prioridade**: 🔴 Alta | **Duração estimada**: 3-4 horas

### O que vamos fazer:
- ✅ Criar layout mobile com bottom navigation
- ✅ Dashboard principal com resumo do dia
- ✅ Cards de materiais de hoje (disciplinas ativas)
- ✅ Indicadores de progresso
- ✅ Controle de tempo de estudo (timer mobile)
- ✅ Estatísticas rápidas (gráficos mobile-friendly)

### Entregas:
- `/dashboard` - Dashboard principal
- `<BottomNav>` - Navegação inferior mobile
- `<MobileHeader>` - Header mobile com menu
- `<StudyTimer>` - Timer de estudo mobile
- `<TodayCards>` - Cards de materiais do dia
- `<QuickStats>` - Estatísticas rápidas

### Componentes Mobile:
```
components/mobile/
├── layout/
│   ├── BottomNav.tsx
│   ├── MobileHeader.tsx
│   └── MobileLayout.tsx
├── dashboard/
│   ├── TodayCards.tsx
│   ├── StudyTimer.tsx
│   ├── QuickStats.tsx
│   └── ProgressRing.tsx
```

---

## 📚 Módulo 3: Gestão de Disciplinas
**Prioridade**: 🟡 Média | **Duração estimada**: 2-3 horas

### O que vamos fazer:
- ✅ Lista de disciplinas (cards touch-friendly)
- ✅ Modal de criação/edição mobile
- ✅ Picker de cores mobile
- ✅ Seletor de ícones mobile
- ✅ Swipe para deletar
- ✅ Busca e filtros mobile

### Entregas:
- `/disciplinas` - Lista de disciplinas
- `<DisciplinaCard>` - Card de disciplina mobile
- `<DisciplinaModal>` - Modal mobile full-screen
- `<ColorPicker>` - Seletor de cores touch-friendly
- `<IconPicker>` - Seletor de ícones em grid

### Interações Mobile:
- Swipe esquerda → Deletar
- Tap → Ver detalhes
- Long press → Menu rápido

---

## 📄 Módulo 4: Materiais de Estudo
**Prioridade**: 🔴 Alta | **Duração estimada**: 3-4 horas

### O que vamos fazer:
- ✅ Lista de materiais (layout de cards)
- ✅ Upload de PDF mobile (camera + galeria)
- ✅ Detalhes do material
- ✅ Barra de progresso visual
- ✅ Botão flutuante para adicionar
- ✅ Filtros por disciplina

### Entregas:
- `/materiais` - Lista de materiais
- `/materiais/novo` - Upload de material
- `/materiais/[id]` - Detalhes do material
- `<MaterialCard>` - Card de material mobile
- `<UploadButton>` - Upload com preview mobile
- `<ProgressBar>` - Barra de progresso animada

### Features Mobile:
- Upload via câmera do celular
- Preview do PDF antes de salvar
- Compartilhamento nativo
- Download para leitura offline

---

## 📖 Módulo 5: Visualizador de PDF Mobile
**Prioridade**: 🔴 Alta | **Duração estimada**: 4-5 horas

### O que vamos fazer:
- ✅ Visualizador PDF otimizado para mobile
- ✅ Controles touch (pinch zoom, swipe)
- ✅ Bottom sheet com opções
- ✅ Modo leitura (fullscreen)
- ✅ Anotações rápidas mobile
- ✅ Marcadores de página
- ✅ Ajuste de brilho e contraste

### Entregas:
- `/materiais/[id]/ler` - Visualizador mobile
- `<MobilePdfViewer>` - Viewer otimizado
- `<PdfControls>` - Controles mobile
- `<BottomSheet>` - Bottom sheet de opções
- `<QuickAnnotations>` - Anotações rápidas

### Gestos Mobile:
- Pinch → Zoom
- Swipe horizontal → Próxima/anterior página
- Swipe vertical → Scroll
- Double tap → Zoom rápido
- Long press → Anotar

### Opções do Bottom Sheet:
- Ir para página
- Marcadores
- Ajustes de visualização
- Compartilhar
- Download

---

## 📅 Módulo 6: Planos de Estudo
**Prioridade**: 🟡 Média | **Duração estimada**: 3-4 horas

### O que vamos fazer:
- ✅ Lista de planos (timeline mobile)
- ✅ Criar plano (wizard mobile simplificado)
- ✅ Visualização semanal mobile
- ✅ Marcar tarefas como concluídas
- ✅ Edição rápida de horas

### Entregas:
- `/planos` - Lista de planos
- `/planos/novo` - Wizard mobile
- `/planos/[id]` - Detalhes do plano
- `<PlanoCard>` - Card de plano mobile
- `<WeeklyView>` - Visão semanal mobile
- `<TaskCheckbox>` - Checkbox animado

### Wizard Mobile (Simplificado):
1. Informações básicas (nome, data)
2. Selecionar disciplinas (chips)
3. Distribuir horas (sliders)
4. Confirmar e criar

---

## 🗓️ Módulo 7: Agenda e Calendário
**Prioridade**: 🟡 Média | **Duração estimada**: 2-3 horas

### O que vamos fazer:
- ✅ Calendário mobile (vista mensal)
- ✅ Agenda diária (lista)
- ✅ Adicionar eventos de estudo
- ✅ Notificações de lembretes
- ✅ Visualização de semana

### Entregas:
- `/agenda` - Calendário + agenda
- `/agenda/[data]` - Detalhes do dia
- `<MobileCalendar>` - Calendário touch-friendly
- `<DayAgenda>` - Lista de eventos do dia
- `<EventCard>` - Card de evento mobile

### Interações:
- Tap no dia → Ver agenda
- Swipe → Próximo/anterior mês
- Botão flutuante → Adicionar evento

---

## 🚀 Módulo 8: PWA Features Avançados
**Prioridade**: 🟢 Baixa | **Duração estimada**: 3-4 horas

### O que vamos fazer:
- ✅ Melhorar service worker (cache offline)
- ✅ Push notifications
- ✅ Badge para contador de tarefas
- ✅ Background sync
- ✅ Compartilhamento nativo
- ✅ Instalação guiada (prompt customizado)

### Entregas:
- Service worker otimizado
- Sistema de notificações push
- Background sync para uploads
- Share API integration
- Install prompt customizado

### Features PWA:
- **Offline**: Funciona sem internet
- **Sync**: Sincroniza quando voltar online
- **Notifications**: Lembretes de estudo
- **Install**: Prompt de instalação personalizado
- **Share**: Compartilhar materiais nativamente

---

## 🎨 Design System Mobile

### Princípios:
1. **Touch-First**: Botões ≥ 44x44px
2. **Gestos Nativos**: Swipe, pinch, long-press
3. **Performance**: Lazy loading, virtual scrolling
4. **Acessibilidade**: Alto contraste, texto legível
5. **Feedback Visual**: Animações e haptic feedback

### Componentes Base:
```
packages/ui-mobile/  (novo package)
├── Button.tsx       (mobile-optimized)
├── Card.tsx
├── BottomSheet.tsx
├── FloatingButton.tsx
├── Tabs.tsx
├── Drawer.tsx
└── Toast.tsx
```

### Cores e Tipografia:
```css
/* Mobile: Texto maior, contraste maior */
--text-base: 16px    (desktop: 14px)
--button-height: 48px (desktop: 40px)
--touch-target: 44px
```

---

## 📊 Métricas de Sucesso

### Performance:
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse Score > 90

### UX:
- [ ] Touch targets ≥ 44x44px
- [ ] Gestos intuitivos implementados
- [ ] Feedback visual em todas as ações

### PWA:
- [ ] Instalável em iOS e Android
- [ ] Funciona offline (básico)
- [ ] Ícones e splash screen corretos

---

## 🗂️ Estrutura de Arquivos Final

```
apps/mobile/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── disciplinas/
│   │   │   ├── materiais/
│   │   │   ├── planos/
│   │   │   └── agenda/
│   │   └── api/
│   ├── components/
│   │   ├── mobile/      # Componentes mobile-specific
│   │   ├── layout/      # Layouts mobile
│   │   └── ui/          # UI primitivos mobile
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSwipe.ts
│   │   └── useOnline.ts
│   └── styles/
│       └── mobile.css
└── public/
    ├── manifest.json
    ├── icons/
    └── sw.js
```

---

## 🚦 Ordem de Implementação Sugerida

### Sprint 1 (Essencial) - 8-12 horas
1. ✅ Módulo 1: Autenticação
2. ✅ Módulo 2: Dashboard
3. ✅ Módulo 4: Materiais (lista básica)

### Sprint 2 (Core Features) - 10-14 horas
4. ✅ Módulo 5: Visualizador PDF
5. ✅ Módulo 3: Disciplinas
6. ✅ Módulo 6: Planos de Estudo (básico)

### Sprint 3 (Refinamento) - 6-8 horas
7. ✅ Módulo 7: Agenda
8. ✅ Módulo 8: PWA Features
9. ✅ Polimento e ajustes

---

## 🔧 Ferramentas e Libs Úteis

### Mobile UI:
- `framer-motion` - Animações mobile
- `react-swipeable` - Gestos de swipe
- `react-use-gesture` - Gestos complexos
- `usehooks-ts` - Hooks úteis

### PWA:
- `workbox` - Service worker avançado
- `react-query` - Cache e sincronização
- `idb` - IndexedDB para storage offline

### Performance:
- `react-virtualized` - Listas longas
- `react-lazy-load-image` - Lazy loading de imagens
- `web-vitals` - Métricas de performance

---

## 📝 Checklist Antes de Começar Cada Módulo

- [ ] Backend web rodando (porta 3030)
- [ ] Banco de dados configurado
- [ ] Prisma client gerado
- [ ] Variáveis de ambiente configuradas
- [ ] Mobile rodando (porta 3031)

---

## 🎯 Próximo Passo

Começar pelo **Módulo 1: Setup e Autenticação** ✅

Você quer que eu comece implementando o Módulo 1?
