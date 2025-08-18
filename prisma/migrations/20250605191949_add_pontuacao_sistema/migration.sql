-- CreateTable
CREATE TABLE "SessaoRealizada" (
    "id" TEXT NOT NULL,
    "sessaoQuestoesId" TEXT NOT NULL,
    "totalQuestoes" INTEGER NOT NULL,
    "questoesCorretas" INTEGER NOT NULL,
    "questoesIncorretas" INTEGER NOT NULL,
    "questoesNaoRespondidas" INTEGER NOT NULL,
    "pontuacao" DOUBLE PRECISION NOT NULL,
    "percentualAcerto" DOUBLE PRECISION NOT NULL,
    "tempoTotalSegundos" INTEGER,
    "iniciada" BOOLEAN NOT NULL DEFAULT false,
    "finalizada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoRealizada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaDetalhada" (
    "id" TEXT NOT NULL,
    "sessaoRealizadaId" TEXT NOT NULL,
    "questaoId" TEXT NOT NULL,
    "respostaSelecionada" TEXT,
    "correto" BOOLEAN,
    "tempoSegundos" INTEGER,
    "ordem" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaDetalhada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoPontuacao" (
    "id" TEXT NOT NULL,
    "materialId" TEXT,
    "disciplinaId" TEXT,
    "sessaoRealizadaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "pontuacao" DOUBLE PRECISION NOT NULL,
    "percentualAcerto" DOUBLE PRECISION NOT NULL,
    "totalQuestoes" INTEGER NOT NULL,
    "questoesCorretas" INTEGER NOT NULL,
    "tempoTotal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPontuacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessaoRealizada_sessaoQuestoesId_idx" ON "SessaoRealizada"("sessaoQuestoesId");

-- CreateIndex
CREATE INDEX "SessaoRealizada_createdAt_idx" ON "SessaoRealizada"("createdAt");

-- CreateIndex
CREATE INDEX "SessaoRealizada_pontuacao_idx" ON "SessaoRealizada"("pontuacao");

-- CreateIndex
CREATE INDEX "SessaoRealizada_percentualAcerto_idx" ON "SessaoRealizada"("percentualAcerto");

-- CreateIndex
CREATE INDEX "RespostaDetalhada_sessaoRealizadaId_idx" ON "RespostaDetalhada"("sessaoRealizadaId");

-- CreateIndex
CREATE INDEX "RespostaDetalhada_questaoId_idx" ON "RespostaDetalhada"("questaoId");

-- CreateIndex
CREATE INDEX "RespostaDetalhada_correto_idx" ON "RespostaDetalhada"("correto");

-- CreateIndex
CREATE UNIQUE INDEX "RespostaDetalhada_sessaoRealizadaId_questaoId_key" ON "RespostaDetalhada"("sessaoRealizadaId", "questaoId");

-- CreateIndex
CREATE INDEX "HistoricoPontuacao_materialId_idx" ON "HistoricoPontuacao"("materialId");

-- CreateIndex
CREATE INDEX "HistoricoPontuacao_disciplinaId_idx" ON "HistoricoPontuacao"("disciplinaId");

-- CreateIndex
CREATE INDEX "HistoricoPontuacao_data_idx" ON "HistoricoPontuacao"("data");

-- CreateIndex
CREATE INDEX "HistoricoPontuacao_pontuacao_idx" ON "HistoricoPontuacao"("pontuacao");

-- CreateIndex
CREATE INDEX "HistoricoPontuacao_percentualAcerto_idx" ON "HistoricoPontuacao"("percentualAcerto");

-- AddForeignKey
ALTER TABLE "SessaoRealizada" ADD CONSTRAINT "SessaoRealizada_sessaoQuestoesId_fkey" FOREIGN KEY ("sessaoQuestoesId") REFERENCES "SessaoQuestoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaDetalhada" ADD CONSTRAINT "RespostaDetalhada_sessaoRealizadaId_fkey" FOREIGN KEY ("sessaoRealizadaId") REFERENCES "SessaoRealizada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaDetalhada" ADD CONSTRAINT "RespostaDetalhada_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "Questao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPontuacao" ADD CONSTRAINT "HistoricoPontuacao_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPontuacao" ADD CONSTRAINT "HistoricoPontuacao_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPontuacao" ADD CONSTRAINT "HistoricoPontuacao_sessaoRealizadaId_fkey" FOREIGN KEY ("sessaoRealizadaId") REFERENCES "SessaoRealizada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
