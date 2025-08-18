/*
  Warnings:

  - You are about to drop the `UserOpenAIKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "OpenAIConfig" ADD COLUMN     "apiKey" TEXT;

-- DropTable
DROP TABLE "UserOpenAIKey";
