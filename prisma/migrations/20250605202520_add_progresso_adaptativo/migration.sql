-- CreateTable
CREATE TABLE "ProgressoAdaptativo" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "nivelAtual" TEXT NOT NULL DEFAULT 'FACIL',
    "totalSessoes" INTEGER NOT NULL DEFAULT 0,
    "ultimaPontuacao" DOUBLE PRECISION,
    "ultimoPercentual" DOUBLE PRECISION,
    "podeAvancar" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressoAdaptativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoAdaptativo_materialId_key" ON "ProgressoAdaptativo"("materialId");

-- CreateIndex
CREATE INDEX "ProgressoAdaptativo_materialId_idx" ON "ProgressoAdaptativo"("materialId");

-- CreateIndex
CREATE INDEX "ProgressoAdaptativo_nivelAtual_idx" ON "ProgressoAdaptativo"("nivelAtual");

-- AddForeignKey
ALTER TABLE "ProgressoAdaptativo" ADD CONSTRAINT "ProgressoAdaptativo_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
