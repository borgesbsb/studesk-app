import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth.service';
import {initializeApi} from '../services/api';
import {User, LoginRequest, RegisterRequest, AuthState} from '../types/auth';

interface AuthContextData extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_KEYS = {
  token: '@studesk:token',
  user: '@studesk:user',
  credentials: '@studesk:credentials',
};

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do storage ao iniciar
  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      // Inicializar API com URL salva
      await initializeApi();
      const [storedToken, storedUser] = await AsyncStorage.multiGet([
        STORAGE_KEYS.token,
        STORAGE_KEYS.user,
      ]);

      if (storedToken[1] && storedUser[1]) {
        // Restaurar sessão do storage imediatamente
        setToken(storedToken[1]);
        setUser(JSON.parse(storedUser[1]));

        // Validar token no backend (apenas se estiver online)
        try {
          const isValid = await authService.validateSession();
          if (!isValid) {
            console.warn('⚠️ Token expirado, tentando re-login automático...');
            const relogged = await tryAutoRelogin();
            if (!relogged) {
              console.warn('⚠️ Re-login falhou, fazendo logout');
              await clearSession();
            }
          } else {
            console.log('✅ Token válido');
          }
        } catch (error) {
          // Se falhar (offline), continuar com sessão em cache
          console.log('📴 Modo offline: mantendo sessão em cache');
        }
      } else {
        // Sem token salvo - tentar auto-login com credenciais salvas
        console.log('🔑 Sem token, tentando auto-login com credenciais...');
        const relogged = await tryAutoRelogin();
        if (!relogged) {
          console.log('🔒 Sem credenciais salvas, exibindo tela de login');
        }
      }
    } catch (error) {
      console.error('Error loading storage data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Tenta re-login automático usando credenciais salvas
   */
  async function tryAutoRelogin(): Promise<boolean> {
    try {
      const storedCreds = await AsyncStorage.getItem(STORAGE_KEYS.credentials);
      if (!storedCreds) {
        return false;
      }

      const credentials: LoginRequest = JSON.parse(storedCreds);
      console.log('🔄 Re-login automático para:', credentials.email);

      const response = await authService.login(credentials);

      setUser(response.user);
      setToken(response.token);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.token, response.token],
        [STORAGE_KEYS.user, JSON.stringify(response.user)],
      ]);

      console.log('✅ Re-login automático bem-sucedido');
      return true;
    } catch (error) {
      console.error('❌ Re-login automático falhou:', error);
      // Credenciais inválidas - limpar tudo
      await clearSession();
      return false;
    }
  }

  async function login(credentials: LoginRequest) {
    try {
      const response = await authService.login(credentials);

      setUser(response.user);
      setToken(response.token);

      // Salvar token, user e credenciais
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.token, response.token],
        [STORAGE_KEYS.user, JSON.stringify(response.user)],
        [STORAGE_KEYS.credentials, JSON.stringify(credentials)],
      ]);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async function register(data: RegisterRequest) {
    try {
      const response = await authService.register(data);

      if (response.success) {
        // Após registro bem-sucedido, fazer login automaticamente
        await login({email: data.email, password: data.password});
      } else {
        throw new Error(response.message || 'Erro ao criar conta');
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await clearSession();
      // Limpar credenciais salvas no logout explícito
      await AsyncStorage.removeItem(STORAGE_KEYS.credentials);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Limpa sessão (token + user) mas mantém credenciais para auto-re-login
   */
  async function clearSession() {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user]);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
