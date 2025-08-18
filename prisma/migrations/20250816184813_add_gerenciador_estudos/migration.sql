-- CreateTable
CREATE TABLE "PlanoEstudo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoEstudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanaEstudo" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "numeroSemana" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "totalHoras" INTEGER NOT NULL DEFAULT 0,
    "horasRealizadas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanaEstudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaSemana" (
    "id" TEXT NOT NULL,
    "semanaId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "horasPlanejadas" INTEGER NOT NULL,
    "horasRealizadas" INTEGER NOT NULL DEFAULT 0,
    "prioridade" INTEGER NOT NULL DEFAULT 1,
    "observacoes" TEXT,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaSemana_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanoEstudo_ativo_idx" ON "PlanoEstudo"("ativo");

-- CreateIndex
CREATE INDEX "PlanoEstudo_dataInicio_idx" ON "PlanoEstudo"("dataInicio");

-- CreateIndex
CREATE INDEX "PlanoEstudo_dataFim_idx" ON "PlanoEstudo"("dataFim");

-- CreateIndex
CREATE INDEX "SemanaEstudo_planoId_idx" ON "SemanaEstudo"("planoId");

-- CreateIndex
CREATE INDEX "SemanaEstudo_numeroSemana_idx" ON "SemanaEstudo"("numeroSemana");

-- CreateIndex
CREATE INDEX "SemanaEstudo_dataInicio_idx" ON "SemanaEstudo"("dataInicio");

-- CreateIndex
CREATE UNIQUE INDEX "SemanaEstudo_planoId_numeroSemana_key" ON "SemanaEstudo"("planoId", "numeroSemana");

-- CreateIndex
CREATE INDEX "DisciplinaSemana_semanaId_idx" ON "DisciplinaSemana"("semanaId");

-- CreateIndex
CREATE INDEX "DisciplinaSemana_disciplinaId_idx" ON "DisciplinaSemana"("disciplinaId");

-- CreateIndex
CREATE INDEX "DisciplinaSemana_prioridade_idx" ON "DisciplinaSemana"("prioridade");

-- CreateIndex
CREATE UNIQUE INDEX "DisciplinaSemana_semanaId_disciplinaId_key" ON "DisciplinaSemana"("semanaId", "disciplinaId");

-- AddForeignKey
ALTER TABLE "SemanaEstudo" ADD CONSTRAINT "SemanaEstudo_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaSemana" ADD CONSTRAINT "DisciplinaSemana_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "SemanaEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaSemana" ADD CONSTRAINT "DisciplinaSemana_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
