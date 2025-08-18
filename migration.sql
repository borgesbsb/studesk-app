-- CreateTable
CREATE TABLE "Concurso" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "editalUrl" TEXT,
    "imagemUrl" TEXT DEFAULT 'https://placehold.co/600x400/png',
    "dataLancamento" TIMESTAMP(3),
    "dataProva" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concurso_pkey" PRIMARY KEY ("id")
);

