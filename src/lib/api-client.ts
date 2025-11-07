/**
 * API Client utility for making authenticated requests
 * Handles API key authentication for all API calls
 */

interface ApiClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    // Get API key from environment variable or localStorage
    this.apiKey = config.apiKey || 
                  process.env.NEXT_PUBLIC_API_KEY || 
                  (typeof window !== 'undefined' ? localStorage.getItem('apiKey') : null);
  }

  /**
   * Set the API key for authentication
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    if (typeof window !== 'undefined') {
      localStorage.setItem('apiKey', apiKey);
    }
  }

  /**
   * Get the current API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Clear the API key
   */
  clearApiKey() {
    this.apiKey = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apiKey');
    }
  }

  /**
   * Build headers with authentication
   */
  private buildHeaders(customHeaders: HeadersInit = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add custom headers
    if (customHeaders) {
      if (customHeaders instanceof Headers) {
        customHeaders.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(customHeaders)) {
        customHeaders.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, customHeaders);
      }
    }

    // Add API key authentication if available
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Make a GET request
   */
  async get(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      method: 'GET',
      headers: this.buildHeaders(options.headers),
      credentials: 'include', // Include cookies for JWT authentication
    });

    // Handle 401 errors (only log for non-auth endpoints)
    if (!response.ok && response.status === 401) {
      // Don't log errors for /api/auth/me - it's expected when not logged in
      if (!endpoint.includes('/api/auth/me')) {
        console.error('Authentication failed. Please log in.');
        // Emit event for the app to handle
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api-auth-error'));
        }
      }
    }

    return response;
  }

  /**
   * Make a POST request
   */
  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      method: 'POST',
      headers: this.buildHeaders(options.headers),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include', // Include cookies for JWT authentication
    });

    if (!response.ok && response.status === 401) {
      console.error('Authentication failed. Please log in.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-auth-error'));
      }
    }

    return response;
  }

  /**
   * Make a PUT request
   */
  async put(endpoint: string, data?: any, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      method: 'PUT',
      headers: this.buildHeaders(options.headers),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include', // Include cookies for JWT authentication
    });

    if (!response.ok && response.status === 401) {
      console.error('Authentication failed. Please log in.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-auth-error'));
      }
    }

    return response;
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      method: 'DELETE',
      headers: this.buildHeaders(options.headers),
      credentials: 'include', // Include cookies for JWT authentication
    });

    if (!response.ok && response.status === 401) {
      console.error('Authentication failed. Please log in.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-auth-error'));
      }
    }

    return response;
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };
