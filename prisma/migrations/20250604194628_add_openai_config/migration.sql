-- CreateTable
CREATE TABLE "OpenAIConfig" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4-turbo-preview',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenAIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOpenAIKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOpenAIKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOpenAIKey_userId_key" ON "UserOpenAIKey"("userId");
