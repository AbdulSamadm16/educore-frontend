import apiClient, { API_BASE_URL } from './api';

const LIVE_API_BASE = import.meta.env.VITE_LIVE_API_URL || API_BASE_URL;
const liveUrl = (path) => `${LIVE_API_BASE}${path}`;

export const liveSessionService = {
  getTutorCourses: () => apiClient.get('/courses/my-courses?limit=10000'),

  getTutorBatches: () => apiClient.get(liveUrl('/live-sessions/tutor-batches')),

  scheduleSession: (payload) => apiClient.post(liveUrl('/live-sessions'), payload),

  getTutorSessions: (params = {}) =>
    apiClient.get(liveUrl('/live-sessions/my'), {
      params: { page: 1, limit: 100, ...params },
    }),

  getLearnerUpcomingSessions: (params = {}) =>
    apiClient.get(liveUrl('/live-sessions/my-upcoming'), {
      params: { page: 1, limit: 20, ...params },
    }),

  getSessionById: (sessionId) => apiClient.get(liveUrl(`/live-sessions/${sessionId}`)),

  joinSession: (sessionId) => apiClient.get(liveUrl(`/live-sessions/${sessionId}/join`)),

  cancelSession: (sessionId) => apiClient.delete(liveUrl(`/live-sessions/${sessionId}`)),

  rescheduleSession: (sessionId, payload) =>
    apiClient.patch(liveUrl(`/live-sessions/${sessionId}`), payload),

  addRecording: (sessionId, payload) =>
    apiClient.post(liveUrl('/live-recordings/draft'), payload),

  requestMuxUploadUrl: (payload) =>
    apiClient.post(liveUrl('/live-recordings/mux-upload-url'), payload),

  createRecordingDraft: (payload) =>
    apiClient.post(liveUrl('/live-recordings/draft'), payload),

  getCourseRecordings: (courseId) =>
    apiClient.get(liveUrl(`/live-recordings/course/${courseId}`)),

  getTutorCourseRecordings: (courseId) =>
    apiClient.get(liveUrl(`/live-recordings/tutor/${courseId}`)),

  publishRecording: (recordingId) =>
    apiClient.post(liveUrl(`/live-recordings/${recordingId}/publish`)),

  discardRecording: (recordingId) =>
    apiClient.delete(liveUrl(`/live-recordings/${recordingId}`)),

  saveRecordingProgress: (recordingId, payload) =>
    apiClient.post(liveUrl(`/live-recordings/${recordingId}/progress`), payload),
};
