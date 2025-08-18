/*
  Warnings:

  - You are about to drop the column `dataLancamento` on the `Concurso` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Concurso" DROP COLUMN "dataLancamento",
ADD COLUMN     "dataPublicacao" TIMESTAMP(3),
ADD COLUMN     "inicioCurso" TIMESTAMP(3),
ALTER COLUMN "imagemUrl" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Disciplina" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cargaHoraria" INTEGER NOT NULL DEFAULT 0,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcursoDisciplina" (
    "id" TEXT NOT NULL,
    "concursoId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "questoes" INTEGER NOT NULL DEFAULT 0,
    "pontos" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConcursoDisciplina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConcursoDisciplina_concursoId_idx" ON "ConcursoDisciplina"("concursoId");

-- CreateIndex
CREATE INDEX "ConcursoDisciplina_disciplinaId_idx" ON "ConcursoDisciplina"("disciplinaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcursoDisciplina_concursoId_disciplinaId_key" ON "ConcursoDisciplina"("concursoId", "disciplinaId");

-- AddForeignKey
ALTER TABLE "ConcursoDisciplina" ADD CONSTRAINT "ConcursoDisciplina_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "Concurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcursoDisciplina" ADD CONSTRAINT "ConcursoDisciplina_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
