-- CreateTable
CREATE TABLE "SessaoQuestoes" (
    "id" TEXT NOT NULL,
    "materialId" TEXT,
    "disciplinaId" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prompt" TEXT NOT NULL,
    "totalQuestoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoQuestoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questao" (
    "id" TEXT NOT NULL,
    "sessaoId" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "alternativaA" TEXT NOT NULL,
    "alternativaB" TEXT NOT NULL,
    "alternativaC" TEXT NOT NULL,
    "alternativaD" TEXT NOT NULL,
    "alternativaE" TEXT,
    "respostaCorreta" TEXT NOT NULL,
    "explicacao" TEXT,
    "nivel" TEXT,
    "topico" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaUsuario" (
    "id" TEXT NOT NULL,
    "questaoId" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "correto" BOOLEAN NOT NULL,
    "tempoGasto" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChunkCache" (
    "id" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "textoOriginal" TEXT NOT NULL,
    "textoProcessado" TEXT NOT NULL,
    "parametros" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChunkCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessaoQuestoes_materialId_idx" ON "SessaoQuestoes"("materialId");

-- CreateIndex
CREATE INDEX "SessaoQuestoes_disciplinaId_idx" ON "SessaoQuestoes"("disciplinaId");

-- CreateIndex
CREATE INDEX "SessaoQuestoes_createdAt_idx" ON "SessaoQuestoes"("createdAt");

-- CreateIndex
CREATE INDEX "Questao_sessaoId_idx" ON "Questao"("sessaoId");

-- CreateIndex
CREATE INDEX "Questao_ordem_idx" ON "Questao"("ordem");

-- CreateIndex
CREATE INDEX "RespostaUsuario_questaoId_idx" ON "RespostaUsuario"("questaoId");

-- CreateIndex
CREATE INDEX "RespostaUsuario_createdAt_idx" ON "RespostaUsuario"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChunkCache_textHash_key" ON "ChunkCache"("textHash");

-- CreateIndex
CREATE INDEX "ChunkCache_textHash_idx" ON "ChunkCache"("textHash");

-- CreateIndex
CREATE INDEX "ChunkCache_createdAt_idx" ON "ChunkCache"("createdAt");

-- AddForeignKey
ALTER TABLE "SessaoQuestoes" ADD CONSTRAINT "SessaoQuestoes_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoQuestoes" ADD CONSTRAINT "SessaoQuestoes_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questao" ADD CONSTRAINT "Questao_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "SessaoQuestoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaUsuario" ADD CONSTRAINT "RespostaUsuario_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "Questao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
