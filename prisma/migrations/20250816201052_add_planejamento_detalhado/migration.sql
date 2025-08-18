-- AlterTable
ALTER TABLE "DisciplinaSemana" ADD COLUMN     "materialNome" TEXT,
ADD COLUMN     "materialUrl" TEXT,
ADD COLUMN     "paginasLidas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questoesPlanejadas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questoesRealizadas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tempoVideoPlanejado" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tempoVideoRealizado" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tipoVeiculo" TEXT,
ADD COLUMN     "totalPaginas" INTEGER NOT NULL DEFAULT 0;
