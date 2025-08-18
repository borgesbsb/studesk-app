-- CreateTable
CREATE TABLE "Anotacao" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "pagina" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "posicaoX" DOUBLE PRECISION,
    "posicaoY" DOUBLE PRECISION,
    "largura" DOUBLE PRECISION,
    "altura" DOUBLE PRECISION,
    "cor" TEXT DEFAULT '#ffff00',
    "tipo" TEXT NOT NULL DEFAULT 'highlight',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anotacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anotacao_materialId_idx" ON "Anotacao"("materialId");

-- CreateIndex
CREATE INDEX "Anotacao_pagina_idx" ON "Anotacao"("pagina");

-- CreateIndex
CREATE INDEX "Anotacao_tipo_idx" ON "Anotacao"("tipo");

-- CreateIndex
CREATE INDEX "Anotacao_createdAt_idx" ON "Anotacao"("createdAt");

-- AddForeignKey
ALTER TABLE "Anotacao" ADD CONSTRAINT "Anotacao_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
