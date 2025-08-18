-- CreateTable
CREATE TABLE "ChunkUtilizado" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "chunkHash" TEXT NOT NULL,
    "indiceChunk" INTEGER NOT NULL,
    "tamanhoChunk" INTEGER NOT NULL,
    "sessaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChunkUtilizado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChunkUtilizado_materialId_idx" ON "ChunkUtilizado"("materialId");

-- CreateIndex
CREATE INDEX "ChunkUtilizado_sessaoId_idx" ON "ChunkUtilizado"("sessaoId");

-- CreateIndex
CREATE INDEX "ChunkUtilizado_createdAt_idx" ON "ChunkUtilizado"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChunkUtilizado_materialId_chunkHash_key" ON "ChunkUtilizado"("materialId", "chunkHash");
