import { Prisma } from '@prisma/client'

interface ErrorLog {
  timestamp: string
  error: string
  details: any
  path?: string
  action?: string
}

export function logError(error: unknown, action: string): ErrorLog {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    error: 'Erro desconhecido',
    details: {},
    action
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    errorLog.error = `Erro do Prisma: ${error.code}`
    errorLog.details = {
      code: error.code,
      message: error.message,
      meta: error.meta,
      clientVersion: error.clientVersion
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    errorLog.error = 'Erro de validação do Prisma'
    errorLog.details = {
      message: error.message
    }
  } else if (error instanceof Error) {
    errorLog.error = error.message
    errorLog.details = {
      name: error.name,
      stack: error.stack
    }
  } else {
    errorLog.details = error
  }

  // Log no console para desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.error('\n=== Erro do Prisma ===')
    console.error(`Ação: ${action}`)
    console.error(`Timestamp: ${errorLog.timestamp}`)
    console.error(`Erro: ${errorLog.error}`)
    console.error('Detalhes:', errorLog.details)
    console.error('=====================\n')
  }

  return errorLog
}

export function formatPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return 'Já existe um registro com estes dados.'
      case 'P2014':
        return 'O registro que você está tentando relacionar não existe.'
      case 'P2003':
        return 'Dados relacionados não encontrados.'
      case 'P2025':
        return 'Registro não encontrado.'
      default:
        return `Erro do banco de dados: ${error.code}`
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return 'Dados inválidos fornecidos.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocorreu um erro inesperado.'
} 