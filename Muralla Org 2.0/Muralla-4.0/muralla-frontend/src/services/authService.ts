// Simple auth service for demo purposes
export class AuthService {
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // For demo purposes, we'll use a hardcoded admin token with extended expiry
  // In production, this would come from a proper login flow
  private static readonly DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWRyYWo3ZGg4MDAwMXN1dHFvdDk3aWdxIiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDIzMzk1MywiZXhwIjoxNzg1NzY5OTUzfQ.6kvsSWL7iN-pkjNuohpyKmHU7aP2WqvBIu8_jxeePQI';

  static getToken(): string {
    // Always return the current token from localStorage (which should be fresh)
    return localStorage.getItem(this.TOKEN_KEY) || this.DEMO_TOKEN;
  }

  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static getAuthHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
    };
  }

  static async apiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.API_BASE_URL}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token might be expired, try to refresh (but handle rate limiting)
        try {
          await this.refreshToken();
          
          // Retry the request with the new token
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...this.getAuthHeaders(),
              ...options.headers,
            },
          });
          
          if (!retryResponse.ok) {
            throw new Error(`API call failed: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          return await retryResponse.json();
        } catch (refreshError) {
          // If refresh fails due to rate limiting, use the existing token and retry once
          console.warn('Token refresh failed, retrying with existing token:', refreshError);
          
          const fallbackResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`API call failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
          }
          
          return await fallbackResponse.json();
        }
      }

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  }

  static async refreshToken(): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.access_token);
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  // Initialize demo token on first load
  static init(): void {
    // Always use the fresh demo token to avoid expired cached tokens
    this.setToken(this.DEMO_TOKEN);
    console.log('AuthService initialized with fresh token');
  }

  // Debug method to check token status
  static debugToken(): void {
    const token = this.getToken();
    console.log('Current token:', token.substring(0, 50) + '...');
    
    // Decode JWT payload to check expiry
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < now;
      console.log('Token expires at:', new Date(payload.exp * 1000));
      console.log('Current time:', new Date());
      console.log('Token expired:', isExpired);
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  }
}

// Initialize auth service
AuthService.init();
