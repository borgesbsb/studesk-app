-- CreateTable
CREATE TABLE "MaterialEstudo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "totalPaginas" INTEGER NOT NULL,
    "paginasLidas" INTEGER NOT NULL DEFAULT 0,
    "arquivoPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialEstudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaMaterial" (
    "id" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisciplinaMaterial_disciplinaId_idx" ON "DisciplinaMaterial"("disciplinaId");

-- CreateIndex
CREATE INDEX "DisciplinaMaterial_materialId_idx" ON "DisciplinaMaterial"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "DisciplinaMaterial_disciplinaId_materialId_key" ON "DisciplinaMaterial"("disciplinaId", "materialId");

-- AddForeignKey
ALTER TABLE "DisciplinaMaterial" ADD CONSTRAINT "DisciplinaMaterial_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaMaterial" ADD CONSTRAINT "DisciplinaMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
