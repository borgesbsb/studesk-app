-- AlterTable
ALTER TABLE "PlanoEstudo" ADD COLUMN     "concursoId" TEXT;

-- CreateIndex
CREATE INDEX "PlanoEstudo_concursoId_idx" ON "PlanoEstudo"("concursoId");

-- AddForeignKey
ALTER TABLE "PlanoEstudo" ADD CONSTRAINT "PlanoEstudo_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "Concurso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
