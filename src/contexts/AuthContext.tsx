import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';
import { User, AuthError } from '../types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and get latest user data
          const response = await api.get<{ data: User }>('/users/profile');
          setUser(response.data);
        } catch (error) {
          console.error('Session verification failed', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post<{ user: User; token: string }>('/auth/login', { email, password });

      localStorage.setItem('token', response.token);
      setUser(response.user);

      return { error: null };
    } catch (err: any) {
      console.error('Login failed', err);
      return {
        error: {
          message: err.response?.data?.error || 'Login failed',
          status: err.response?.status
        }
      };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await api.post<{ user: User; token: string }>('/auth/register', {
        email,
        password,
        full_name: fullName
      });

      localStorage.setItem('token', response.token);
      setUser(response.user);

      return { error: null };
    } catch (err: any) {
      console.error('Registration failed', err);
      return {
        error: {
          message: err.response?.data?.error || 'Registration failed',
          status: err.response?.status
        }
      };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
    // Optional: Call logout endpoint if you want to invalidate token on server
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
