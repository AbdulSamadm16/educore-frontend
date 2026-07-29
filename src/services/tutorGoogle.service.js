import apiClient, { API_BASE_URL } from './api';

const GOOGLE_API_BASE = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api');
const googleUrl = (path) => `${GOOGLE_API_BASE}${path}`;

export const tutorGoogleService = {
  getAuthUrl: () => apiClient.get(googleUrl('/tutors/google/auth')),

  disconnect: () => apiClient.post(googleUrl('/tutors/google/disconnect')),
};
