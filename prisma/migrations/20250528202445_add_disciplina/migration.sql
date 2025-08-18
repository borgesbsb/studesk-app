/*
  Warnings:

  - You are about to drop the `concursos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `concursos_disciplinas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `disciplinas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "concursos_disciplinas" DROP CONSTRAINT "concursos_disciplinas_concursoId_fkey";

-- DropForeignKey
ALTER TABLE "concursos_disciplinas" DROP CONSTRAINT "concursos_disciplinas_disciplinaId_fkey";

-- DropTable
DROP TABLE "concursos";

-- DropTable
DROP TABLE "concursos_disciplinas";

-- DropTable
DROP TABLE "disciplinas";

-- CreateTable
CREATE TABLE "Concurso" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "editalUrl" TEXT,
    "imagemUrl" TEXT,
    "dataProva" TIMESTAMP(3),
    "dataPublicacao" TIMESTAMP(3),
    "inicioCurso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concurso_pkey" PRIMARY KEY ("id")
);

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
