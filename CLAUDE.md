# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup and Dependencies
- `npm run copy-webviewer` - Copy WebViewer files to public directory (required before dev/build)
- `npm run dev` - Start development server (includes WebViewer copy)
- `npm run build` - Build for production (includes WebViewer copy and PDF worker setup)
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Custom Scripts
- `npm run migrate-pdf-urls` - Migrate PDF URLs (see scripts/migrate-pdf-urls.js)
- `npm run test-delete-material` - Test material deletion functionality

### Database
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma studio` - Open Prisma Studio for database browsing

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.3.2 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **UI**: React 19, Tailwind CSS, Radix UI components
- **PDF Processing**: Multiple libraries (@pdftron/webviewer, pdfjs-dist, @react-pdf-viewer)
- **AI Integration**: OpenAI API for question generation
- **Authentication**: NextAuth.js with Prisma adapter

### Core Domain Structure

The application follows a layered architecture with clear separation:

#### `/src/domain/entities/`
Domain entities representing core business objects:
- `Concurso.ts` - Contest/competition data
- `Disciplina.ts` - Academic subjects
- `MaterialEstudo.ts` - Study materials
- `Questao.ts` - Questions/quizzes
- `SessaoQuestoes.ts` - Question sessions

#### `/src/application/services/`
Application services for business logic:
- `concurso.service.ts` - Contest management
- `disciplina.service.ts` - Subject management
- `material-estudo.service.ts` - Study material operations
- `openai.service.ts` - AI question generation
- `plano-estudo.service.ts` - Study plan management

#### `/src/interface/actions/`
Server actions organized by domain:
- `concurso/` - Contest CRUD operations
- `disciplina/` - Subject CRUD operations
- `material-estudo/` - Material CRUD operations
- `plano-estudo/` - Study plan operations

### Key Features

#### PDF Processing System
- Multiple PDF viewers: WebViewer, PDF.js, React PDF Viewer
- Text extraction and caching via ChunkCache model
- Annotation system with highlighting and notes
- Reading progress tracking with HistoricoLeitura

#### AI Question Generation
- OpenAI integration for generating questions from text
- Configurable prompts and parameters via OpenAIConfig
- Adaptive difficulty system with ProgressoAdaptativo
- Text preprocessing and caching for efficiency

#### Study Management
- Complex study plans with PlanoEstudo, SemanaEstudo, DisciplinaSemana
- Progress tracking across materials and sessions
- Performance analytics with HistoricoPontuacao
- Adaptive learning paths

### Database Schema Highlights

Key relationships:
- Concurso ↔ Disciplina (many-to-many via ConcursoDisciplina)
- MaterialEstudo ↔ Disciplina (many-to-many via DisciplinaMaterial)
- SessaoQuestoes → Questao (one-to-many)
- Complex study plan hierarchy: PlanoEstudo → SemanaEstudo → DisciplinaSemana

Important indexes on:
- Performance tracking fields (pontuacao, percentualAcerto)
- Time-based queries (createdAt, dataLeitura)
- Frequently joined foreign keys

### File Upload and Static Assets

#### PDF Storage
- Upload endpoint: `/api/upload/`
- Static serving: `/api/static/uploads/[...path]/`
- WebViewer assets: `/public/lib/webviewer/`
- PDF.js workers: `/public/pdf.worker.min.js`

#### PDF Processing Pipeline
1. Upload via `/api/upload/`
2. Text extraction via `/api/pdf/extract-text/`
3. Chunk processing and caching
4. AI processing via `/api/questoes/gerar-com-ia/`

### Authentication Structure
- Layout: `/src/app/(authenticated)/` - Protected routes
- Public routes: Login/register forms in main app directory
- NextAuth configuration with Prisma adapter

### Component Organization
- `/src/components/ui/` - Reusable UI components (Radix-based)
- `/src/components/[domain]/` - Domain-specific components
- `/src/components/layout/` - Layout components (Header, Sidebar, AppLayout)

### Development Notes

#### PDF Integration
- WebViewer requires files to be copied to public directory before build
- PDF.js worker must be available at `/pdf.worker.min.js`
- Multiple PDF libraries used for different viewer requirements

#### Build Configuration
- ESLint disabled during builds (`ignoreDuringBuilds: true`)
- Type checking skipped in build (`SKIP_TYPE_CHECK=true`)
- Webpack configured for PDF.js compatibility and Node.js modules

#### Styling
- Extensive Tailwind safelist for dynamic classes
- Custom CSS variables for theming
- Responsive design patterns throughout

### API Structure

#### Question Generation
- `/api/questoes/gerar-com-ia/` - Main AI generation endpoint
- `/api/questoes/gerar-adaptativo/` - Adaptive difficulty generation
- `/api/questoes/responder/` - Submit answers

#### Study Progress
- `/api/material/[id]/progress/` - Update reading progress
- `/api/material/[id]/historico-leitura/` - Reading history
- `/api/pontuacao/` - Scoring system endpoints

#### File Processing
- `/api/pdf/extract-text/` - PDF text extraction
- `/api/upload/` - File upload handling
- `/api/cache/estatisticas/` - Cache performance stats