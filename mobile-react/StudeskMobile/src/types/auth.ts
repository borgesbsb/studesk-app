export interface User {
  id: string;
  email: string;
  name: string | null;
  hash: string;
  image?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  name?: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  user: User;
  message: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
