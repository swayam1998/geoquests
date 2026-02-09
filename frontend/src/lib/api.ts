/**
 * API Client for GeoQuests Backend
 * Handles authentication, token storage, and API requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Token storage keys
const ACCESS_TOKEN_KEY = 'geoquests_access_token';
const REFRESH_TOKEN_KEY = 'geoquests_refresh_token';

/**
 * Token storage utilities
 */
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  
  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/**
 * API Error class
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Make API request with automatic token injection
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Handle 401 - try to refresh token
    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry request with new token
        const newToken = tokenStorage.getAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          if (!retryResponse.ok) {
            throw new APIError(
              `Request failed: ${retryResponse.statusText}`,
              retryResponse.status,
              await retryResponse.json().catch(() => null)
            );
          }
          
          return retryResponse.json();
        }
      }
      
      // Refresh failed, clear tokens
      tokenStorage.clearTokens();
      throw new APIError('Authentication failed', 401);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new APIError(
        errorData.detail || `Request failed: ${response.statusText}`,
        response.status,
        errorData
      );
    }
    
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return {} as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Auth API methods
 */
export const authAPI = {
  /**
   * Request magic link
   */
  requestMagicLink: async (email: string): Promise<{ message: string }> => {
    return apiRequest('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  
  /**
   * Verify magic link token
   */
  verifyMagicLink: async (token: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
  }> => {
    const response = await apiRequest<{
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>(`/auth/magic-link/verify?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
    
    // Store tokens
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    
    return response;
  },
  
  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<{
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at?: string;
  }> => {
    return apiRequest('/auth/me');
  },
  
  /**
   * Update current user
   */
  updateCurrentUser: async (data: {
    display_name?: string;
    avatar_url?: string;
  }): Promise<{
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at?: string;
  }> => {
    return apiRequest('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
  }> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new APIError('No refresh token available', 401);
    }
    
    const response = await apiRequest<{
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    // Store new tokens
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    
    return response;
  },
  
  /**
   * Logout (clear tokens)
   */
  logout: (): void => {
    tokenStorage.clearTokens();
  },
  
  /**
   * Get Google OAuth authorization URL
   */
  getGoogleAuthUrl: (): string => {
    return `${API_BASE_URL}/auth/google/authorize`;
  },
};

/**
 * Quest API methods
 */
export const questAPI = {
  /**
   * Create a new quest
   */
  createQuest: async (data: {
    title: string;
    description: string;
    lat: number;
    lng: number;
    radius_meters: number;
    visibility: 'public' | 'private';
    photo_count: number;
    is_paid?: boolean;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    id: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lng: number;
    };
    radius_meters: number;
    visibility: 'public' | 'private';
    photo_count: number;
    share_link?: string;
    created_at: string;
  }> => {
    return apiRequest('/quests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get list of quests
   */
  getQuests: async (params?: {
    creator_id?: string;
    visibility?: 'public' | 'private';
    status?: 'draft' | 'active' | 'completed' | 'archived';
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    id: string;
    creator_id: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lng: number;
    };
    radius_meters: number;
    visibility: 'public' | 'private';
    photo_count: number;
    participant_count?: number;
    submission_count?: number;
    has_joined?: boolean | null;
    start_date?: string;
    end_date?: string;
    status: string;
    created_at: string;
    updated_at?: string;
  }>> => {
    const queryParams = new URLSearchParams();
    if (params?.creator_id) queryParams.append('creator_id', params.creator_id);
    if (params?.visibility) queryParams.append('visibility', params.visibility);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `/quests?${queryString}` : '/quests';
    
    return apiRequest(url);
  },

  /**
   * Get a single quest by ID or slug
   */
  getQuest: async (idOrSlug: string): Promise<{
    id: string;
    creator_id: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lng: number;
    };
    radius_meters: number;
    visibility: 'public' | 'private';
    photo_count: number;
    is_paid: boolean;
    slug: string | null;
    share_link: string | null;
    participant_count: number;
    has_joined: boolean | null;
    start_date?: string;
    end_date?: string;
    status: string;
    created_at: string;
    updated_at?: string;
  }> => {
    return apiRequest(`/quests/${idOrSlug}`);
  },

  /**
   * Join a quest
   */
  joinQuest: async (questId: string): Promise<{ message: string }> => {
    return apiRequest(`/quests/${questId}/join`, {
      method: 'POST',
    });
  },

  /**
   * Get shareable link for a quest
   */
  getQuestShareLink: async (questId: string): Promise<{
    share_link: string;
    can_share: boolean;
  }> => {
    return apiRequest(`/quests/${questId}/share-link`);
  },
};

/**
 * User API methods
 */
export const userAPI = {
  /**
   * Get user profile with statistics
   */
  getUser: async (userId: string): Promise<{
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at: string | null;
    quests_created_count: number;
    quests_joined_count: number;
    quests_completed_count: number;
  }> => {
    return apiRequest(`/users/${userId}`);
  },

  /**
   * Get quests created by a user
   */
  getUserCreatedQuests: async (
    userId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<{
    id: string;
    creator_id: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lng: number;
    };
    radius_meters: number;
    visibility: 'public' | 'private';
    photo_count: number;
    is_paid: boolean;
    slug: string | null;
    share_link: string | null;
    participant_count: number;
    has_joined: boolean | null;
    start_date?: string;
    end_date?: string;
    status: string;
    created_at: string;
    updated_at?: string;
  }>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `/users/${userId}/quests/created?${queryString}` : `/users/${userId}/quests/created`;
    
    return apiRequest(url);
  },

  /**
   * Get quests joined by a user
   */
  getUserJoinedQuests: async (
    userId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<{
    id: string;
    creator_id: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lng: number;
    };
    radius_meters: number;
    visibility: 'public' | 'private';
    photo_count: number;
    is_paid: boolean;
    slug: string | null;
    share_link: string | null;
    participant_count: number;
    has_joined: boolean | null;
    start_date?: string;
    end_date?: string;
    status: string;
    created_at: string;
    updated_at?: string;
    joined_at: string;
    participation_status: string;
  }>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `/users/${userId}/quests/joined?${queryString}` : `/users/${userId}/quests/joined`;
    
    return apiRequest(url);
  },
};

/**
 * Submission API methods
 */
export const submissionAPI = {
  /**
   * Submit a photo to complete a quest
   */
  submitQuestPhoto: async (
    questId: string,
    imageFile: File,
    location: { lat: number; lng: number; accuracy?: number },
    capturedAt: string,
    captureMethod: "live" | "upload" = "live"
  ): Promise<{
    id: string;
    quest_id: string;
    explorer_id: string;
    image_url: string;
    captured_location: { lat: number; lng: number };
    captured_accuracy?: number;
    captured_at: string;
    verification_result?: any;
    content_match_score?: number;
    quality_score?: number;
    faces_detected: number;
    faces_blurred: number;
    status: string;
    rejection_reason?: string;
    submitted_at: string;
    capture_method?: string;
    gemini_result?: { grade?: string; content_match_score?: number; [key: string]: unknown };
  }> => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      throw new APIError('Not authenticated', 401);
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('quest_id', questId);
    formData.append('location', JSON.stringify(location));
    formData.append('captured_at', capturedAt);
    formData.append('capture_method', captureMethod);

    const response = await fetch(`${API_BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.detail ||
        errorData.message ||
        (Array.isArray(errorData.detail) ? errorData.detail.map((d: any) => d?.msg ?? d).join(", ") : null) ||
        `Request failed: ${response.statusText}`;
      throw new APIError(
        typeof message === "string" ? message : "Request failed",
        response.status,
        errorData
      );
    }

    return response.json();
  },

  /**
   * Get a submission by ID
   */
  getSubmission: async (submissionId: string): Promise<{
    id: string;
    quest_id: string;
    explorer_id: string;
    image_url: string;
    captured_location: { lat: number; lng: number };
    captured_accuracy?: number;
    captured_at: string;
    verification_result?: any;
    content_match_score?: number;
    quality_score?: number;
    faces_detected: number;
    faces_blurred: number;
    status: string;
    rejection_reason?: string;
    submitted_at: string;
  }> => {
    return apiRequest(`/submissions/${submissionId}`);
  },

  /**
   * Get all submissions for a quest (quest creator only).
   * Optionally filter by status (e.g. { status: 'verified' } for approved only).
   */
  getQuestSubmissions: async (
    questId: string,
    options?: { status?: string }
  ): Promise<Array<{
    id: string;
    quest_id: string;
    explorer_id: string;
    image_url: string;
    captured_location: { lat: number; lng: number };
    captured_accuracy?: number;
    captured_at: string;
    verification_result?: any;
    content_match_score?: number;
    quality_score?: number;
    faces_detected: number;
    faces_blurred: number;
    status: string;
    rejection_reason?: string;
    submitted_at: string;
  }>> => {
    const params = options?.status ? `?status=${encodeURIComponent(options.status)}` : "";
    return apiRequest(`/submissions/quest/${questId}${params}`);
  },
};

/**
 * Generic API request method
 */
export const api = {
  get: <T>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'GET' });
  },
  
  post: <T>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  patch: <T>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  delete: <T>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },
};
