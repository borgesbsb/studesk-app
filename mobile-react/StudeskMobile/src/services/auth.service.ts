import api from './api';
import {LoginRequest, LoginResponse, RegisterRequest, RegisterResponse} from '../types/auth';

class AuthService {
  /**
   * Faz login no sistema
   * Usa endpoint personalizado que valida credenciais
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Fazer requisição de login
      const response = await api.post('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      // Verificar se o login foi bem-sucedido
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Extrair dados do usuário da resposta
      const {user, token} = response.data;

      return {user, token};
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          'Erro ao fazer login'
      );
    }
  }

  /**
   * Registra um novo usuário
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await api.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          'Erro ao criar conta'
      );
    }
  }

  /**
   * Valida se o token JWT ainda é válido
   * Retorna: true = válido, false = inválido (401)
   * Lança erro em caso de problema de rede (para manter sessão offline)
   */
  async validateSession(): Promise<boolean> {
    try {
      const response = await api.get('/auth/validate-token');
      return !!response.data?.valid;
    } catch (error: any) {
      // Se recebeu resposta HTTP (401, 403, etc.) = token realmente inválido
      if (error.response?.status) {
        console.log('🔒 Token inválido, status:', error.response.status);
        return false;
      }
      // Sem resposta HTTP = erro de rede → lançar para manter sessão offline
      console.log('📴 Erro de rede ao validar token');
      throw error;
    }
  }
}

export default new AuthService();
