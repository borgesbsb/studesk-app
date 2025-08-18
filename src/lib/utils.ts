import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para converter URLs de arquivos para o formato da API
export function getFileApiUrl(fileUrl: string): string {
  // Se já é uma URL da API, retorna como está
  if (fileUrl.startsWith('/api/uploads/')) {
    return fileUrl
  }
  
  // Se é uma URL direta do uploads, converte para API
  if (fileUrl.startsWith('/uploads/')) {
    return fileUrl.replace('/uploads/', '/api/uploads/')
  }
  
  // Se não tem prefixo, assume que é apenas o nome do arquivo
  if (!fileUrl.startsWith('/')) {
    return `/api/uploads/${fileUrl}`
  }
  
  return fileUrl
}

// Função para obter o nome do arquivo de uma URL
export function getFileNameFromUrl(fileUrl: string): string {
  if (fileUrl.startsWith('/api/uploads/')) {
    return fileUrl.replace('/api/uploads/', '')
  }
  if (fileUrl.startsWith('/uploads/')) {
    return fileUrl.replace('/uploads/', '')
  }
  return fileUrl
}
