import { GetScannerResultParams, ScannerApiResponse } from '../types/test-task-types';

const API_BASE_URL = 'https://api-rs.dexcelerate.com';

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async fetchScannerData(params: GetScannerResultParams): Promise<ScannerApiResponse> {
    const searchParams = new URLSearchParams();
    
    // Convert params to URL search params, filtering out null/undefined values
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const url = `${this.baseUrl}/scanner?${searchParams.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Note: CORS will need to be handled via browser extension during development
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ScannerApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch scanner data:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
