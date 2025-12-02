/*
  Warnings:

  - You are about to drop the column `concursoId` on the `PlanoEstudo` table. All the data in the column will be lost.
  - You are about to drop the `ChunkCache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChunkUtilizado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Concurso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConcursoDisciplina` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HistoricoPontuacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OpenAIConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProgressoAdaptativo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Questao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RespostaDetalhada` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RespostaUsuario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessaoQuestoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessaoRealizada` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Disciplina` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `MaterialEstudo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PlanoEstudo` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ConcursoDisciplina" DROP CONSTRAINT "ConcursoDisciplina_concursoId_fkey";

-- DropForeignKey
ALTER TABLE "ConcursoDisciplina" DROP CONSTRAINT "ConcursoDisciplina_disciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "HistoricoPontuacao" DROP CONSTRAINT "HistoricoPontuacao_disciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "HistoricoPontuacao" DROP CONSTRAINT "HistoricoPontuacao_materialId_fkey";

-- DropForeignKey
ALTER TABLE "HistoricoPontuacao" DROP CONSTRAINT "HistoricoPontuacao_sessaoRealizadaId_fkey";

-- DropForeignKey
ALTER TABLE "PlanoEstudo" DROP CONSTRAINT "PlanoEstudo_concursoId_fkey";

-- DropForeignKey
ALTER TABLE "ProgressoAdaptativo" DROP CONSTRAINT "ProgressoAdaptativo_materialId_fkey";

-- DropForeignKey
ALTER TABLE "Questao" DROP CONSTRAINT "Questao_sessaoId_fkey";

-- DropForeignKey
ALTER TABLE "RespostaDetalhada" DROP CONSTRAINT "RespostaDetalhada_questaoId_fkey";

-- DropForeignKey
ALTER TABLE "RespostaDetalhada" DROP CONSTRAINT "RespostaDetalhada_sessaoRealizadaId_fkey";

-- DropForeignKey
ALTER TABLE "RespostaUsuario" DROP CONSTRAINT "RespostaUsuario_questaoId_fkey";

-- DropForeignKey
ALTER TABLE "SessaoQuestoes" DROP CONSTRAINT "SessaoQuestoes_disciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "SessaoQuestoes" DROP CONSTRAINT "SessaoQuestoes_materialId_fkey";

-- DropForeignKey
ALTER TABLE "SessaoRealizada" DROP CONSTRAINT "SessaoRealizada_sessaoQuestoesId_fkey";

-- DropIndex
DROP INDEX "PlanoEstudo_concursoId_idx";

-- AlterTable
ALTER TABLE "Disciplina" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MaterialEstudo" ADD COLUMN     "arquivoVideoUrl" TEXT,
ADD COLUMN     "duracaoSegundos" INTEGER,
ADD COLUMN     "tempoAssistido" INTEGER DEFAULT 0,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'PDF',
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "arquivoPdfUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PlanoEstudo" DROP COLUMN "concursoId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ChunkCache";

-- DropTable
DROP TABLE "ChunkUtilizado";

-- DropTable
DROP TABLE "Concurso";

-- DropTable
DROP TABLE "ConcursoDisciplina";

-- DropTable
DROP TABLE "HistoricoPontuacao";

-- DropTable
DROP TABLE "OpenAIConfig";

-- DropTable
DROP TABLE "ProgressoAdaptativo";

-- DropTable
DROP TABLE "Questao";

-- DropTable
DROP TABLE "RespostaDetalhada";

-- DropTable
DROP TABLE "RespostaUsuario";

-- DropTable
DROP TABLE "SessaoQuestoes";

-- DropTable
DROP TABLE "SessaoRealizada";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_hash_key" ON "User"("hash");

-- CreateIndex
CREATE INDEX "User_hash_idx" ON "User"("hash");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Disciplina_userId_idx" ON "Disciplina"("userId");

-- CreateIndex
CREATE INDEX "Disciplina_nome_idx" ON "Disciplina"("nome");

-- CreateIndex
CREATE INDEX "MaterialEstudo_userId_idx" ON "MaterialEstudo"("userId");

-- CreateIndex
CREATE INDEX "MaterialEstudo_tipo_idx" ON "MaterialEstudo"("tipo");

-- CreateIndex
CREATE INDEX "PlanoEstudo_userId_idx" ON "PlanoEstudo"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disciplina" ADD CONSTRAINT "Disciplina_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoEstudo" ADD CONSTRAINT "PlanoEstudo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
