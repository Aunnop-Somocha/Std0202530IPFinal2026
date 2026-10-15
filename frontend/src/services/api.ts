import { Platform } from 'react-native';

export interface Employee {
  id: string;
  name: string;
  position: string;
  status: 'Active' | 'On Leave';
  salary: number;
}

export interface SalaryCluster {
  group: string;
  centroid: number;
  count: number;
}

export interface ClustersResponse {
  success: boolean;
  clusters: SalaryCluster[];
}

// Auto-detect default API URL based on platform
const getDefaultBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    // Android emulator loops back to host via 10.0.2.2
    return 'http://10.0.2.2:5000';
  }
  // Web and iOS simulator can reach localhost:5000 directly
  return 'http://localhost:5000';
};

class ApiService {
  private baseUrl: string = getDefaultBaseUrl();
  private token: string | null = null;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedToken = window.localStorage.getItem('hr_auth_token');
        if (savedToken) this.token = savedToken;
        const savedUrl = window.localStorage.getItem('hr_api_url');
        if (savedUrl) this.baseUrl = savedUrl;
      } catch {}
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    let clean = url.trim();
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    this.baseUrl = clean;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('hr_api_url', clean);
      } catch {}
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        if (token) {
          window.localStorage.setItem('hr_auth_token', token);
        } else {
          window.localStorage.removeItem('hr_auth_token');
        }
      } catch {}
    }
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public logout() {
    this.setToken(null);
  }

  // Helper method for JSON requests
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data as T;
    } catch (err: any) {
      if (err.message && err.message.includes('Network request failed')) {
        throw new Error(`Cannot reach backend at ${this.baseUrl}. Make sure Express server is running on port 5000.`);
      }
      throw err;
    }
  }

  // 1. POST /api/login
  public async login(username: string, password: string): Promise<{ success: boolean; token: string }> {
    const data = await this.request<{ success: boolean; token: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.token) {
      this.token = data.token;
    }

    return data;
  }

  // 2. GET /api/employees
  public async getEmployees(): Promise<Employee[]> {
    const data = await this.request<any>('/api/employees', {
      method: 'GET',
    });

    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.employees)) {
      return data.employees;
    }
    return [];
  }

  // 3. POST /api/employees
  public async addEmployee(name: string, position: string, salary: number): Promise<{ success: boolean; employee: Employee }> {
    return await this.request<{ success: boolean; employee: Employee }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify({ name, position, salary }),
    });
  }

  // 4. PUT /api/employees/:id/status
  public async toggleEmployeeStatus(id: string): Promise<{ success: boolean; employee: Employee }> {
    return await this.request<{ success: boolean; employee: Employee }>(`/api/employees/${id}/status`, {
      method: 'PUT',
    });
  }

  // 5. DELETE /api/employees/:id
  public async deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>(`/api/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // 6. GET /api/employees/salary-clusters
  public async getSalaryClusters(): Promise<ClustersResponse> {
    return await this.request<ClustersResponse>('/api/employees/salary-clusters', {
      method: 'GET',
    });
  }

  // 7. Utility: Reset mock data
  public async resetMockData(): Promise<{ success: boolean; message: string; count: number }> {
    return await this.request<{ success: boolean; message: string; count: number }>('/api/reset', {
      method: 'POST',
    });
  }

  // 8. Health check
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
