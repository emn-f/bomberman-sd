import { Direction, GameStateDTO, PlayerDTO } from './types';

export class BridgeApi {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }
      return data as T;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error(`Falha ao conectar no Bridge local (${this.baseUrl}). Verifique se o processo está em execução.`);
      }
      throw err;
    }
  }

  async connect(nome: string): Promise<PlayerDTO> {
    return this.request<PlayerDTO>('/api/connect', {
      method: 'POST',
      body: JSON.stringify({ nome })
    });
  }

  async move(playerId: string, direcao: Direction): Promise<GameStateDTO> {
    return this.request<GameStateDTO>('/api/move', {
      method: 'POST',
      body: JSON.stringify({ playerId, direcao })
    });
  }

  async plantBomb(playerId: string): Promise<GameStateDTO> {
    return this.request<GameStateDTO>('/api/bomb', {
      method: 'POST',
      body: JSON.stringify({ playerId })
    });
  }

  async confirmTurn(playerId: string): Promise<GameStateDTO> {
    return this.request<GameStateDTO>('/api/confirm', {
      method: 'POST',
      body: JSON.stringify({ playerId })
    });
  }

  async getState(): Promise<GameStateDTO> {
    return this.request<GameStateDTO>('/api/state', {
      method: 'GET'
    });
  }

  async disconnect(playerId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/disconnect', {
      method: 'POST',
      body: JSON.stringify({ playerId })
    });
  }

  async restartMatch(): Promise<GameStateDTO> {
    return this.request<GameStateDTO>('/api/restart', {
      method: 'POST'
    });
  }
}
