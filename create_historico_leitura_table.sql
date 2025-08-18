-- Script para criar a tabela HistoricoLeitura
-- Execute este script diretamente no seu banco de dados

CREATE TABLE "HistoricoLeitura" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "paginaAtual" INTEGER NOT NULL,
    "tempoLeituraSegundos" INTEGER NOT NULL,
    "dataLeitura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoLeitura_pkey" PRIMARY KEY ("id")
);

-- Índices para otimizar consultas
CREATE INDEX "HistoricoLeitura_materialId_idx" ON "HistoricoLeitura"("materialId");
CREATE INDEX "HistoricoLeitura_dataLeitura_idx" ON "HistoricoLeitura"("dataLeitura");
CREATE INDEX "HistoricoLeitura_paginaAtual_idx" ON "HistoricoLeitura"("paginaAtual");

-- Chave estrangeira para MaterialEstudo
ALTER TABLE "HistoricoLeitura" ADD CONSTRAINT "HistoricoLeitura_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE; 