/*
  Warnings:

  - Made the column `arquivoPdfUrl` on table `MaterialEstudo` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DisciplinaMaterial" DROP CONSTRAINT "DisciplinaMaterial_disciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "DisciplinaMaterial" DROP CONSTRAINT "DisciplinaMaterial_materialId_fkey";

-- DropIndex
DROP INDEX "DisciplinaMaterial_disciplinaId_idx";

-- DropIndex
DROP INDEX "DisciplinaMaterial_materialId_idx";

-- AlterTable
ALTER TABLE "MaterialEstudo" ALTER COLUMN "arquivoPdfUrl" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "DisciplinaMaterial" ADD CONSTRAINT "DisciplinaMaterial_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaMaterial" ADD CONSTRAINT "DisciplinaMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
