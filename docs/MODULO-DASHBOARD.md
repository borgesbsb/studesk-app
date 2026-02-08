# Módulo Dashboard

## Visão Geral

O módulo Dashboard apresenta uma visão consolidada do ciclo de estudo atual do usuário. Exibe progresso geral, estatísticas de horas e questões, disciplinas do ciclo com barras de progresso e gráficos de evolução ao longo dos dias.

## Rota

`/[userHash]/dashboard`

## Layout

```
┌──────────┬──────────┬──────────┬──────────┐
│  Horas   │  Horas   │ Questões │ Questões │  ← CicloStatsCards
│ Planej.  │ Realiz.  │ Planej.  │ Realiz.  │
└──────────┴──────────┴──────────┴──────────┘
┌──────────────┬─────────────────────────────┐
│  Progresso   │   Disciplinas do Ciclo      │
│  do Ciclo    │  ┌─────┐ ┌─────┐ ┌─────┐  │  ← CicloProgressoCard + DisciplinasCicloCard
│   (radial)   │  │Disc1│ │Disc2│ │Disc3│  │
│    72%       │  │barra│ │barra│ │barra│  │
└──────────────┴─────────────────────────────┘
┌──────────────────┬─────────────────────────┐
│ Evolução Horas   │ Evolução Questões       │  ← Componentes reusados de /hoje
│ (area chart)     │ (area chart)            │
└──────────────────┴─────────────────────────┘
```

## Componentes

### `CicloStatsCards` (`src/components/dashboard/ciclo-stats-cards.tsx`)
- Grid de 4 cards com ícones coloridos
- Exibe: Horas Planejadas, Horas Realizadas, Questões Planejadas, Questões Realizadas
- Recebe `ProgressoCiclo | null`

### `CicloProgressoCard` (`src/components/dashboard/ciclo-progresso-card.tsx`)
- Card com gráfico radial duplo (horas externo, questões interno)
- Mostra porcentagem geral no centro
- Legendas com valores absolutos abaixo do gráfico
- Cores dinâmicas baseadas na porcentagem de progresso

### `DisciplinasCicloCard` (`src/components/dashboard/disciplinas-ciclo-card.tsx`)
- Grid responsivo de cards por disciplina
- Cada card com borda colorida (cor da disciplina), barra de progresso de horas e questões
- Recebe `DisciplinaCiclo[]`

### `DashboardHeader` (`src/components/dashboard/dashboard-header.tsx`)
- Componente client-side que define o título "Dashboard" no header via `useHeader()`

### Componentes reusados de `/hoje`
- `EvolucaoHorasCard` (`src/components/hoje/evolucao-horas-card.tsx`)
- `EvolucaoQuestoesCard` (`src/components/hoje/evolucao-questoes-card.tsx`)

## Server Actions

### `getProgressoCiclo()` (`src/interface/actions/dashboard/get-progresso-ciclo.ts`)
- Retorna totais do ciclo atual: horas/questões planejadas e realizadas
- Inclui nome do ciclo e período (dataInicio, dataFim)

### `getDisciplinasCiclo()` (`src/interface/actions/dashboard/get-disciplinas-ciclo.ts`)
- Retorna lista de disciplinas no ciclo atual com estatísticas individuais
- Cada disciplina: nome, cor, horas e questões (planejadas/realizadas)

### `getEvolucaoCiclo()` (`src/interface/actions/dashboard/get-evolucao-ciclo.ts`)
- Retorna dados diários agregados para gráficos de evolução

## Página

`src/app/(authenticated)/[userHash]/dashboard/page.tsx`

- Server Component (async) - dados são buscados no servidor
- Chama as 3 server actions em paralelo via `Promise.all()`
- Passa dados para os componentes client-side

## Sidebar

Item "Dashboard" adicionado no topo da sidebar em `src/components/layout/SidebarContent.tsx` com ícone `BarChartIcon`.

## Dependências

- Recharts (RadialBarChart, AreaChart)
- shadcn/ui (Card, ChartContainer)
- Lucide React (ícones)
