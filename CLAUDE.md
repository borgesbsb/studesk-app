# CLAUDE.md

Guidance for Claude Code in this repo. Fuller detail (full route tree, deploy, feature docs) in `specs/` — local, git-ignored, absent in fresh clones.

## Commands
- `npm run dev` / `build` / `start` / `lint`
- `npm run migrate-pdf-urls`, `npm run test-delete-material` — see `scripts/` for many more one-off debug/test scripts (check before writing a new throwaway one)
- `npx prisma generate` / `db push` / `migrate dev` / `studio`

## Stack
Next.js 15 App Router + React 19 · PostgreSQL/Prisma · Tailwind/Radix · Auth: NextAuth (`[userHash]` multi-user) + separate JWT/bcrypt for admin (`src/lib/admin-auth.ts`) · AI: `@anthropic-ai/sdk` (edital extraction, tool_use), `openai` (GPT-4o-mini text formatting) · PDF: Syncfusion (primary/annotations) + PDFTron (grid) + `@react-pdf-viewer/*` (installed, unconfirmed use) · Mobile: separate RN/Expo app `mobile-react/StudeskMobile/` (APK/IPA, not served here).

## Layers
`src/interface/actions/<domain>/` (Server Actions) → `src/application/services/` → `src/domain/entities/` → Prisma. `/api/*` only for pure HTTP needs (OAuth, streaming, scripts).

- **Entities**: `Disciplina`, `Edital`, `MaterialEstudo`, `Questao`, `SessaoQuestoes` — no `Concurso`
- **Services**: `build-plano-ai`, `disciplina`, `material-estudo`, `plano-estudo`, `simulado`, `edital` (Anthropic extraction/verticalization), `header-footer-detector`, `openai-format` (reader formatting), `pdf-background-processor`, `pdf-image-extractor`
- **Actions**: `admin/`, `agenda/`, `dashboard/`, `disciplina/`, `edital/`, `material-estudo/`, `plano-estudo/`, `simulado/`, `temp/`

## Features
- **PDF/reading**: extraction → `openai-format.service.ts` → cached in `PdfMobileText` → rendered by `TextReader.tsx` at `/[userHash]/material/[id]/ler`; annotations via `Anotacao.startOffset/endOffset`; progress in `HistoricoLeitura`
- **Simulados**: `Simulado`, `SimuladoQuestao`, `SimuladoResultado(Disciplina)`, `ConfigSimulado(Disciplina)` — active system, replaced an old ad-hoc questions feature; extend this, don't recreate a separate one
- **Editais/Build-Plano**: edital PDF → 2-step Anthropic extraction (`edital.service.ts`) → `Edital`/`EditalDisciplina` → verticalized per subject in `/admin/editais/[id]` → `build-plano-ai.service.ts` distributes subjects into `BuildPlano(Disciplina|Assunto)` → basis for a `PlanoEstudo`
- **Study plans**: `PlanoEstudo → SemanaEstudo → DisciplinaSemana/Dia`. Shared: `PlanoEstudo.userId=null` = admin plan, `PlanoEstudoUsuario` assigns users, `PlanoEstudoDisciplina` = admin pool, `ProgressoUsuarioDisciplina*` = per-user progress. Units: `horasRealizadas` = HOURS everywhere except `ProgressoUsuarioDisciplinaExtra.horasRealizadas` (MINUTES, deliberate exception); `minutosPlanejados` = MINUTES everywhere
- **Google Drive — two separate integrations**: end-user video (`User.googleDriveAccessToken/RefreshToken/TokenExpiry`, `/api/google-drive/*`, `/api/video/google-drive-*`) vs admin bulk import (`Admin.googleDriveAccessToken/RefreshToken`, `/api/admin/google-drive/*`, configured at `/admin/configuracoes`)

## Auth
End users: `src/app/(authenticated)/[userHash]/...`, hash resolved in `src/lib/auth-helpers.ts`/`auth.ts` (NextAuth+Prisma). Admin: `src/app/admin/(protected)/...`, JWT/bcrypt, `Admin` model.

## Components
`src/components/ui/` (Radix), `src/components/[domain]/`, `src/components/layout/`.

## Build config
ESLint/type-check skipped in build (`ignoreDuringBuilds`, `SKIP_TYPE_CHECK=true`). `OPENAI_API_KEY` + Anthropic key required for AI features.

## Selected API routes
`/api/material/[id]/progress`, `/historico-leitura` · `/api/dashboard/{stats,evolucao-ciclo,agenda}` · `/api/pdf/extract-text`, `/api/upload` · `/api/admin/editais/*` (extrair-pdf, extrair-disciplinas, extrair-conteudo) · `/api/admin/google-drive/*` (auth, callback, browse, disconnect) · `/api/admin/plano-estudos/*` (sync-drive, import simulados). Full tree in `specs/ARCHITECTURE.md`.

> Stale facts from past versions of this file, now fixed — don't reintroduce: no `Concurso` model, no `/api/questoes|pontuacao|cache/*` routes, no `ChunkCache`/`OpenAIConfig`/`ProgressoAdaptativo`/`HistoricoPontuacao` models.
