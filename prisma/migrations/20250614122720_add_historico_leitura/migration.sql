-- CreateTable
CREATE TABLE "HistoricoLeitura" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "paginaAtual" INTEGER NOT NULL,
    "tempoLeituraSegundos" INTEGER NOT NULL,
    "dataLeitura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoLeitura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoLeitura_materialId_idx" ON "HistoricoLeitura"("materialId");

-- CreateIndex
CREATE INDEX "HistoricoLeitura_dataLeitura_idx" ON "HistoricoLeitura"("dataLeitura");

-- CreateIndex
CREATE INDEX "HistoricoLeitura_paginaAtual_idx" ON "HistoricoLeitura"("paginaAtual");

-- AddForeignKey
ALTER TABLE "HistoricoLeitura" ADD CONSTRAINT "HistoricoLeitura_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
