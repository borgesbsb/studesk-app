/*
  Warnings:

  - You are about to drop the `Concurso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConcursoDisciplina` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Disciplina` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConcursoDisciplina" DROP CONSTRAINT "ConcursoDisciplina_concursoId_fkey";

-- DropForeignKey
ALTER TABLE "ConcursoDisciplina" DROP CONSTRAINT "ConcursoDisciplina_disciplinaId_fkey";

-- DropTable
DROP TABLE "Concurso";

-- DropTable
DROP TABLE "ConcursoDisciplina";

-- DropTable
DROP TABLE "Disciplina";

-- CreateTable
CREATE TABLE "disciplinas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cargaHoraria" INTEGER NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concursos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "dataProva" TIMESTAMP(3),
    "editalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concursos_disciplinas" (
    "concursoId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "questoes" INTEGER NOT NULL DEFAULT 0,
    "pontos" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concursos_disciplinas_pkey" PRIMARY KEY ("concursoId","disciplinaId")
);

-- AddForeignKey
ALTER TABLE "concursos_disciplinas" ADD CONSTRAINT "concursos_disciplinas_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "concursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concursos_disciplinas" ADD CONSTRAINT "concursos_disciplinas_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
