import {Platform} from 'react-native';

export type Environment = 'development' | 'production' | 'custom';

export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  description: string;
}

export const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'Desenvolvimento',
    apiUrl: Platform.OS === 'android'
      ? 'http://10.0.2.2:3030/api'  // Emulador Android
      : 'http://localhost:3030/api', // iOS Simulator
    description: 'Servidor local (localhost:3030)',
  },
  production: {
    name: 'Produção',
    apiUrl: 'https://studesk.pro/api',
    description: 'Servidor de produção (studesk.pro)',
  },
  custom: {
    name: 'Personalizado',
    apiUrl: '',
    description: 'URL personalizada',
  },
};

// URLs comuns para dispositivos físicos
export const COMMON_URLS = {
  // Para celular físico conectado via ADB (IP da sua máquina na rede local)
  localNetwork: 'http://192.168.15.8:3030/api',

  // Para emulador Android
  androidEmulator: 'http://10.0.2.2:3030/api',

  // Para iOS Simulator
  iosSimulator: 'http://localhost:3030/api',

  // Produção
  production: 'https://studesk.pro/api',
};

/**
 * Detecta automaticamente a melhor URL baseado no ambiente
 */
export function getDefaultApiUrl(): string {
  if (!__DEV__) {
    return ENVIRONMENTS.production.apiUrl;
  }

  // Em desenvolvimento, usar URL específica da plataforma
  return ENVIRONMENTS.development.apiUrl;
}

/**
 * Obtém o IP local da máquina (para documentação)
 * Nota: Em produção, isso será substituído pela configuração do usuário
 */
export async function getLocalIpAddress(): Promise<string | null> {
  try {
    // Esta função pode ser expandida para detectar o IP automaticamente
    // Por enquanto, retorna null e o usuário deve configurar manualmente
    return null;
  } catch (error) {
    return null;
  }
}
