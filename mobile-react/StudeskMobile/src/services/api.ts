import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getDefaultApiUrl} from '../config/environment';

// Chave para armazenar a URL personalizada
const API_URL_STORAGE_KEY = '@studesk:api_url';

// URL padrão baseada no ambiente
let currentApiUrl = getDefaultApiUrl();

// Criar instância do axios
export const api = axios.create({
  baseURL: currentApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor para adicionar token nas requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@studesk:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log da requisição
    console.log('🌐 API REQUEST:', config.method?.toUpperCase(), config.baseURL + config.url);
    console.log('🔑 Auth Header:', config.headers.Authorization ? 'Bearer ' + token?.substring(0, 30) + '...' : 'NONE');

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => {
    // Log da resposta
    console.log('✅ API RESPONSE:', response.status, response.config.url);
    console.log('📦 Data:', JSON.stringify(response.data).substring(0, 200) + '...');
    return response;
  },
  async (error) => {
    console.error('❌ API ERROR:', error.response?.status, error.config?.url);
    console.error('📦 Error Data:', error.response?.data);

    // Não limpar token no interceptor - evita que chamadas fire-and-forget
    // (como auto-save do video) apaguem a sessão inteira.
    // O AuthContext.validateSession() já cuida de tokens expirados no startup.

    return Promise.reject(error);
  }
);

/**
 * Inicializa a API carregando a URL personalizada do storage
 */
export async function initializeApi(): Promise<string> {
  try {
    const savedUrl = await AsyncStorage.getItem(API_URL_STORAGE_KEY);
    if (savedUrl) {
      currentApiUrl = savedUrl;
      api.defaults.baseURL = savedUrl;
      console.log('✅ API URL carregada do storage:', savedUrl);
    } else {
      console.log('✅ API URL padrão:', currentApiUrl);
    }
    return currentApiUrl;
  } catch (error) {
    console.error('❌ Erro ao carregar API URL:', error);
    return currentApiUrl;
  }
}

/**
 * Atualiza a URL da API
 */
export async function updateApiUrl(newUrl: string): Promise<void> {
  try {
    currentApiUrl = newUrl;
    api.defaults.baseURL = newUrl;
    await AsyncStorage.setItem(API_URL_STORAGE_KEY, newUrl);
    console.log('✅ API URL atualizada:', newUrl);
  } catch (error) {
    console.error('❌ Erro ao salvar API URL:', error);
    throw error;
  }
}

/**
 * Obtém a URL atual da API
 */
export function getCurrentApiUrl(): string {
  return currentApiUrl;
}

/**
 * Reseta para a URL padrão
 */
export async function resetApiUrl(): Promise<void> {
  const defaultUrl = getDefaultApiUrl();
  await updateApiUrl(defaultUrl);
}

/**
 * Testa a conexão com a API
 */
export async function testApiConnection(url?: string): Promise<boolean> {
  try {
    const testUrl = url || currentApiUrl;
    // Remove /api do final se existir
    const baseUrl = testUrl.endsWith('/api') ? testUrl.slice(0, -4) : testUrl;
    const healthUrl = `${baseUrl}/api/health`;

    console.log('🔍 Testando conexão:', healthUrl);

    const response = await axios.get(healthUrl, {
      timeout: 10000, // 10 segundos para rede WiFi
    });

    console.log('✅ Conexão OK:', response.status);
    return response.status === 200;
  } catch (error: any) {
    console.error('❌ Erro ao testar conexão:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   Sem resposta do servidor (timeout ou rede)');
    } else {
      console.error('   Erro:', error.message);
    }
    return false;
  }
}

export default api;
