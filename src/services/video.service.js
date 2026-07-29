import apiClient from './api';
import axios from 'axios';

// Thread-safe map to resolve parent courseId from a lessonId dynamically
const lessonCourseMap = new Map();

/**
 * ChunkedUploader Class
 * Real client-side chunked and direct video uploader.
 * Supports:
 * 1. Mux direct PUT binary streams.
 * 2. Local multipart sequential chunk uploads with pause, resume, progress, and speed tracking.
 */
export class ChunkedUploader {
  constructor(file, options = {}) {
    this.file = file;
    this.lessonId = options.lessonId;
    this.onProgress = options.onProgress || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
    this.notifyLearners = options.notifyLearners || false;

    this.progress = 0;
    this.state = 'idle'; // 'idle', 'uploading', 'paused', 'processing', 'success', 'error'
    this.speed = 0;
    this.uploadId = null;
    this.uploadUrl = null;
    this.mode = null; // 'mux' or 'local'
    this.chunkSize = 5 * 1024 * 1024; // 5MB default, dynamically set from backend init
    this.uploadedChunks = [];
    this.totalChunks = 0;
    this.statusCheckTimer = null;
    this.isPaused = false;
    
    // AbortController to support cancelling or pausing ongoing network requests
    this.currentRequestController = null;
    this.startTime = null;
  }

  setState(newState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  async start() {
    if (this.state === 'uploading' || this.state === 'processing' || this.state === 'success') return;
    this.isPaused = false;
    this.setState('uploading');

    try {
      // ============================================================
      // REFRESH RECOVERY: Check if there's an existing upload session
      // before calling upload-init. This allows resuming after a hard
      // browser reload without losing the current upload session.
      // ============================================================
      let existingSession = null;
      try {
        const statusRes = await apiClient.get(`/lessons/${this.lessonId}/video/upload-status`, { params: { _t: Date.now() } });
        const statusData = statusRes.data.data;
        // Only recover if a valid session exists and video is still uploading
        if (statusData.uploadId && statusData.videoStatus === 'Uploading') {
          existingSession = statusData;
          console.log('[Uploader] Existing upload session detected. Recovering from session:', statusData.uploadId);
        }
      } catch (statusErr) {
        // No existing session found, or status check failed — proceed with fresh init
        console.log('[Uploader] No existing session detected. Starting fresh upload.');
      }

      // RECOVERY PATH: Only resume if there are actual chunks already uploaded.
      // If uploadedChunks is empty, the temp session dir is cleaned up or stale � force a fresh init.
      if (existingSession && existingSession.mode !== 'mux' && existingSession.uploadedChunks?.length > 0) {
        this.mode = existingSession.mode || 'local';
        this.uploadId = existingSession.uploadId;
        this.uploadedChunks = existingSession.uploadedChunks;
        this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
        console.log(`[Uploader] Resuming from chunk ${this.uploadedChunks.length} / ${this.totalChunks}`);
        await this._uploadChunks();
        return;
      }

      // FRESH INIT PATH: Initialize a new upload session on backend
      const initRes = await apiClient.post(`/lessons/${this.lessonId}/video/upload-init`, {
        fileName: this.file.name,
        fileSize: this.file.size,
        notifyLearners: this.notifyLearners
      });

      const { mode, uploadId, uploadUrl, chunkSize } = initRes.data.data;
      this.mode = mode;
      this.uploadId = uploadId;
      this.uploadUrl = uploadUrl;
      if (chunkSize) {
        this.chunkSize = chunkSize;
      }
      this.totalChunks = Math.ceil(this.file.size / this.chunkSize);

      if (mode === 'mux') {
        // Mux Mode: Direct PUT upload
        await this._uploadMux();
      } else {
        // Local Mode: Fallback chunked upload
        // On a fresh initialization, we know there are no uploaded chunks yet.
        // We can call _uploadChunks directly to avoid a redundant upload-status GET query.
        this.uploadedChunks = [];
        await this._uploadChunks();
      }
    } catch (err) {
      console.error('[Uploader] Initialization failed:', err.response?.data || err);
      this.setState('error');
      this.onError(err);
    }
  }

  async _fetchStatusAndUpload() {
    try {
      const statusRes = await apiClient.get(`/lessons/${this.lessonId}/video/upload-status`, { params: { _t: Date.now() } });
      const { uploadedChunks } = statusRes.data.data;
      this.uploadedChunks = uploadedChunks || [];
      
      // Start chunked upload loop
      await this._uploadChunks();
    } catch (err) {
      console.error('[Uploader] Failed to retrieve upload status:', err);
      this.setState('error');
      this.onError(err);
    }
  }

  async _uploadChunks() {
    this.startTime = Date.now();
    
    for (let i = 0; i < this.totalChunks; i++) {
      if (this.isPaused) return;

      // Skip already uploaded chunks (for pausing and resuming)
      if (this.uploadedChunks.includes(i)) {
        continue;
      }

      // Exponential backoff retry: up to 3 attempts (1s → 2s → 4s)
      let chunkUploaded = false;
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (this.isPaused) return;

        try {
          const startByte = i * this.chunkSize;
          const endByte = Math.min(this.file.size, startByte + this.chunkSize);
          const chunkBlob = this.file.slice(startByte, endByte);

          this.currentRequestController = new AbortController();
          const formData = new FormData();
          formData.append('uploadId', this.uploadId);
          formData.append('chunkIndex', String(i));
          formData.append('chunk', chunkBlob, 'chunk');

          const chunkStartTime = Date.now();

          await apiClient.post(`/lessons/${this.lessonId}/video/upload-chunk`, formData, {
            signal: this.currentRequestController.signal,
            onUploadProgress: (progressEvent) => {
              const loaded = progressEvent.loaded;
              const chunkTimeElapsed = (Date.now() - chunkStartTime) / 1000;
              const currentSpeed = chunkTimeElapsed > 0 ? loaded / chunkTimeElapsed : 0;
              
              // Calculate overall progress based on finished chunks + current chunk progress
              const overallLoaded = (this.uploadedChunks.length * this.chunkSize) + loaded;
              const overallPercent = Math.min(99.9, (overallLoaded / this.file.size) * 100);
              
              this.progress = overallPercent;
              this.speed = currentSpeed;
              this.onProgress(overallPercent, currentSpeed);
            }
          });

          // Chunk uploaded successfully
          this.uploadedChunks.push(i);
          chunkUploaded = true;
          break; // Exit retry loop on success
        } catch (err) {
          if (this.isPaused) {
            console.log('[Uploader] Upload paused by user abort.');
            return;
          }

          const isLastAttempt = attempt === MAX_RETRIES;
          if (isLastAttempt) {
            console.error(`[Uploader] Chunk ${i} failed after ${MAX_RETRIES} attempts:`, err);
            this.setState('error');
            this.onError(err);
            return;
          }

          // Transient failure — wait with exponential backoff before retrying
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.warn(`[Uploader] Chunk ${i} attempt ${attempt} failed. Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }

      if (!chunkUploaded) return; // Safety guard
    }

    // 3. Complete chunked upload session
    try {
      this.setState('processing');
      await apiClient.post(`/lessons/${this.lessonId}/video/upload-complete`, {
        uploadId: this.uploadId,
        totalChunks: this.totalChunks
      });
      
      // Start polling for transcoding ready state
      this._startPollingStatus();
    } catch (err) {
      console.error('[Uploader] Failed to complete upload session:', err);
      this.setState('error');
      this.onError(err);
    }
  }

  async _uploadMux() {
    this.startTime = Date.now();
    this.currentRequestController = new AbortController();

    try {
      // Put file direct to Mux URL.
      // Use clean standard axios PUT to avoid credentials headers, 
      // as Mux direct links are external and will block requests with auth tokens due to CORS.
      await axios.put(this.uploadUrl, this.file, {
        headers: {
          'Content-Type': this.file.type || 'video/mp4'
        },
        signal: this.currentRequestController.signal,
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total || this.file.size;
          const percent = (loaded / total) * 100;
          const timeElapsed = (Date.now() - this.startTime) / 1000;
          const currentSpeed = timeElapsed > 0 ? loaded / timeElapsed : 0;

          this.progress = percent;
          this.speed = currentSpeed;
          this.onProgress(percent, currentSpeed);
        }
      });

      // Once Mux upload is complete, transition to processing and poll status checks
      this.setState('processing');
      this._startPollingStatus();
    } catch (err) {
      if (this.isPaused) {
        console.log('[Uploader] Mux upload paused by user abort.');
        return;
      }
      console.error('[Uploader] Mux upload PUT request failed:', err);
      this.setState('error');
      this.onError(err);
    }
  }

  _startPollingStatus() {
    if (this.statusCheckTimer) {
      clearTimeout(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }

    let delay = 1000; // Start polling at 1 second
    const poll = async () => {
      if (this.isPaused || (this.state !== 'processing' && this.state !== 'uploading')) {
        return;
      }

      try {
        const statusRes = await apiClient.get(`/lessons/${this.lessonId}/video/upload-status`, { params: { _t: Date.now() } });
        const { videoStatus, error } = statusRes.data.data;

        if (videoStatus === 'Ready') {
          this.statusCheckTimer = null;
          this.setState('success');
          
          // Retrieve the final transcode URL from lesson details
          const lessonRes = await apiClient.get(`/lessons/${this.lessonId}`);
          const finalUrl = lessonRes.data.data.videoUrl;
          
          this.onSuccess({
            success: true,
            url: finalUrl,
            fileDetails: { name: this.file.name, size: this.file.size }
          });
          return;
        } else if (videoStatus === 'Failed') {
          this.statusCheckTimer = null;
          this.setState('error');
          this.onError(new Error(error || 'Video transcoding failed on server.'));
          return;
        }
      } catch (err) {
        console.error('[Uploader] Error polling transcoding status:', err);
      }

      // Progressive backoff: 1s -> 2s -> 3s -> 4s -> 5s max
      if (delay < 5000) {
        delay = Math.min(5000, delay + 1000);
      }

      this.statusCheckTimer = setTimeout(poll, delay);
    };

    this.statusCheckTimer = setTimeout(poll, delay);
  }

  pause() {
    if (this.state !== 'uploading') return;
    this.isPaused = true;
    if (this.currentRequestController) {
      this.currentRequestController.abort();
      this.currentRequestController = null;
    }
    this.speed = 0;
    this.setState('paused');
  }

  async resume() {
    if (this.state !== 'paused') return;
    this.isPaused = false;
    this.setState('uploading');

    if (this.mode === 'mux') {
      await this._uploadMux();
    } else {
      // Direct chunk uploading resumption, bypass redundant fetchStatus checks
      await this._uploadChunks();
    }
  }

  cancel() {
    this.isPaused = true; // Abort any in-flight chunk request
    if (this.currentRequestController) {
      this.currentRequestController.abort();
      this.currentRequestController = null;
    }
    if (this.statusCheckTimer) {
      clearTimeout(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
    this.progress = 0;
    this.speed = 0;
    this.uploadId = null;
    this.uploadUrl = null;
    this.uploadedChunks = [];
    this.totalChunks = 0;
    this.isPaused = false; // Reset so a fresh start() can proceed
    this.setState('idle');
    this.onProgress(0, 0);
  }
}

export const videoService = {
  // Synchronize dynamic parent course registration mapping manually if direct curriculum endpoints are skipped
  registerLessonCourse: (lessonId, courseId) => {
    if (lessonId && courseId) {
      lessonCourseMap.set(String(lessonId), String(courseId));
    }
  },

  // Fetch curriculum/outline of the course combined with dynamic student progress metrics
  getCourseCurriculum: async (courseId, config = {}) => {
    // Add cache-busting timestamp to prevent stale/cached curriculum responses
    const params = { ...config.params, _t: Date.now() };
    const mergedConfig = { ...config, params };

    // 1. Fetch curriculum structure
    const curriculumRes = await apiClient.get(`/courses/${courseId}/curriculum`, mergedConfig);
    const { course, modules } = curriculumRes.data.data;
    
    // 2. Fetch progress metrics
    let completedLessons = [];
    let videoProgress = [];
    try {
      const progressRes = await apiClient.get(`/progress/${courseId}`, mergedConfig);
      if (progressRes.data && progressRes.data.data) {
        completedLessons = progressRes.data.data.completedLessons || [];
        videoProgress = progressRes.data.data.videoProgress || [];
      }
    } catch (err) {
      if (axios.isCancel(err)) throw err;
      console.log('[Curriculum] Progress record not initialized yet or user not enrolled.');
    }

    // 3. Map backend curriculum schema directly to learner CoursePlayer expectations
    let previousCompleted = true;
    const mappedModules = modules.map((mod) => {
      const mappedLessons = (mod.lessons || []).map((l) => {
        const isCompleted = completedLessons.includes(l.id || l._id);
        const lProgress = videoProgress.find((p) => String(p.lessonId) === String(l.id || l._id));
        const secondsWatched = lProgress ? lProgress.secondsWatched : 0;
        
        // Use backend-calculated locking status directly
        const isLocked = l.isLocked ?? false;
        
        // Sync map for resolving course ID from lesson ID dynamically in playback saves
        lessonCourseMap.set(String(l.id || l._id), String(courseId));
        
        previousCompleted = isCompleted;

        // Resolve absolute video URL if path exists
        const resolvedVideoUrl = l.videoUrl ? (l.videoUrl.startsWith('http') ? l.videoUrl : `http://localhost:4000${l.videoUrl}`) : null;

        const mappedLesson = {
          lessonId: l.id || l._id,
          type: l.type,
          title: l.title,
          description: l.description,
          duration: `${l.durationInMinutes || 5} min`,
          videoUrl: resolvedVideoUrl,
          subtitleUrl: l.subtitleUrl || null,
          videoStatus: l.videoStatus || null,
          videoProcessingError: l.videoProcessingError || null,
          isCompleted,
          isLocked,
          secondsWatched,
          quizMeta: l.quizMeta || null,
          assignmentMeta: l.assignmentMeta || null,
          attachments: (l.attachments || []).filter(a => a && a.fileUrl).map((a) => ({
            name: a.title || 'Resource File',
            url: a.fileUrl.startsWith('http') ? a.fileUrl : `http://localhost:4000${a.fileUrl}`
          }))
        };

        console.log('CURRICULUM LESSON', mappedLesson);
        console.log('VIDEO URL', mappedLesson.videoUrl);

        return mappedLesson;
      });

      return {
        moduleId: mod.id || mod._id,
        title: mod.title,
        lessons: mappedLessons
      };
    });

    const authorId = course.authorId?._id || course.authorId?.id || course.authorId || null;

    return {
      data: {
        title: course.title,
        authorId: authorId ? String(authorId) : null,
        certificateEnabled: course.certificateEnabled,
        isFree: course.isFree,
        price: course.price || 0,
        currency: course.currency || '$',
        thumbnailUrl: course.thumbnailUrl,
        shortDescription: course.shortDescription,
        modules: mappedModules
      }
    };
  },

  // Fetch curriculum/outline for preview (public access for guest mode)
  getCoursePreviewCurriculum: async (courseId, config = {}) => {
    const params = { ...config.params, _t: Date.now() };
    const mergedConfig = { ...config, params };

    const curriculumRes = await apiClient.get(`/courses/${courseId}/preview-curriculum`, mergedConfig);
    const { course, modules } = curriculumRes.data.data;

    const mappedModules = modules.map((mod) => {
      const mappedLessons = (mod.lessons || []).map((l) => {
        const resolvedVideoUrl = l.videoUrl ? (l.videoUrl.startsWith('http') ? l.videoUrl : `http://localhost:4000${l.videoUrl}`) : null;
        
        lessonCourseMap.set(String(l.id || l._id), String(courseId));

        return {
          lessonId: l.id || l._id,
          title: l.title,
          description: l.description,
          duration: `${l.durationInMinutes || 5} min`,
          videoUrl: resolvedVideoUrl,
          subtitleUrl: l.subtitleUrl || null,
          videoStatus: l.videoStatus || null,
          videoProcessingError: l.videoProcessingError || null,
          isCompleted: false,
          isLocked: l.isLocked ?? true,
          isPreview: l.isPreview ?? false,
          allowFreePreview: l.allowFreePreview ?? false,
          secondsWatched: 0,
          attachments: []
        };
      });

      return {
        moduleId: mod.id || mod._id,
        title: mod.title,
        lessons: mappedLessons
      };
    });

    return {
      data: {
        title: course.title,
        modules: mappedModules
      }
    };
  },

  // Fetch student's playback save-point timestamp
  getLessonPlayback: async (lessonId, config = {}) => {
    const courseId = lessonCourseMap.get(String(lessonId));
    if (!courseId) {
      return { data: { lessonId, lastPosition: 0 } };
    }

    try {
      const progressRes = await apiClient.get(`/progress/${courseId}`, config);
      const videoProgress = progressRes.data.data.videoProgress || [];
      const lProgress = videoProgress.find((p) => String(p.lessonId) === String(lessonId));
      return {
        data: {
          lessonId,
          lastPosition: lProgress ? lProgress.secondsWatched : 0
        }
      };
    } catch (err) {
      if (axios.isCancel(err)) throw err;
      console.error('[Playback] Failed to fetch lesson playback progress:', err);
      return { data: { lessonId, lastPosition: 0 } };
    }
  },

  // Save student's progress position securely (saves only meaningful progress debounced every 10s by caller)
  savePlaybackProgress: async (lessonId, position, speed, duration) => {
    const courseId = lessonCourseMap.get(String(lessonId));
    if (!courseId) {
      console.warn(`[Playback] Could not resolve courseId for lessonId ${lessonId}. Skipping progress save.`);
      return { success: false };
    }

    const durationSec = duration || 0;
    const progressPercentage = durationSec > 0 ? Math.min(100, Math.round((position / durationSec) * 100)) : 0;

    // Check if offline
    if (!window.navigator.onLine) {
      console.warn('[Playback Offline] Client is offline. Saving progress locally.');
      try {
        const offlineData = JSON.parse(localStorage.getItem('educore_offline_progress') || '{}');
        offlineData[lessonId] = {
          courseId,
          lessonId,
          position: Math.floor(position),
          duration: Math.floor(durationSec),
          timestamp: Date.now()
        };
        localStorage.setItem('educore_offline_progress', JSON.stringify(offlineData));
        return { success: true, isOfflineCached: true };
      } catch (e) {
        console.error('[Playback Offline] Failed to write to localStorage:', e);
      }
    }

    try {
      const response = await apiClient.post(`/progress/${courseId}/video-progress`, {
        lessonId,
        progressPercentage,
        secondsWatched: Math.floor(position)
      });

      // Opportunistically attempt to reconcile any cached progress if we successfully save online
      videoService.reconcileOfflineProgress().catch(() => {});

      return { success: true, data: response.data.data };
    } catch (err) {
      console.error('[Playback] Failed to save playback progress online. Falling back to local storage caching:', err);
      try {
        const offlineData = JSON.parse(localStorage.getItem('educore_offline_progress') || '{}');
        offlineData[lessonId] = {
          courseId,
          lessonId,
          position: Math.floor(position),
          duration: Math.floor(durationSec),
          timestamp: Date.now()
        };
        localStorage.setItem('educore_offline_progress', JSON.stringify(offlineData));
        return { success: true, isOfflineCached: true };
      } catch (e) {
        console.error('[Playback Offline] Failed to write to localStorage after failure:', e);
      }
      return { success: false };
    }
  },

  // Reconcile pending offline playback save points with backend APIs
  reconcileOfflineProgress: async () => {
    if (!window.navigator.onLine) return { success: false, reason: 'offline' };

    try {
      const offlineData = JSON.parse(localStorage.getItem('educore_offline_progress') || '{}');
      const keys = Object.keys(offlineData);
      if (keys.length === 0) return { success: true, count: 0 };

      console.log(`[Playback Offline Reconcile] Attempting to sync ${keys.length} cached progress items...`);

      for (const lessonId of keys) {
        const item = offlineData[lessonId];
        const progressPercentage = item.duration > 0 ? Math.min(100, Math.round((item.position / item.duration) * 100)) : 0;
        
        try {
          await apiClient.post(`/progress/${item.courseId}/video-progress`, {
            lessonId: item.lessonId,
            progressPercentage,
            secondsWatched: item.position
          });
          
          // Delete from local cache upon successful API receipt
          const currentOffline = JSON.parse(localStorage.getItem('educore_offline_progress') || '{}');
          delete currentOffline[lessonId];
          localStorage.setItem('educore_offline_progress', JSON.stringify(currentOffline));
          console.log(`[Playback Offline Reconcile] Successfully reconciled lesson progress: ${lessonId}`);
        } catch (itemErr) {
          console.error(`[Playback Offline Reconcile] Failed to reconcile lesson ${lessonId}:`, itemErr);
          // Keep it in local storage to try again next time
        }
      }
      return { success: true };
    } catch (err) {
      console.error('[Playback Offline Reconcile] Failed to parse local progress cache:', err);
      return { success: false, error: err };
    }
  },

  // Create standard stateful uploader instance for modular frontend uploader page
  createUploader: (file, options) => {
    return new ChunkedUploader(file, options);
  },

  // Mark a lesson completed on the backend
  markLessonComplete: async (courseId, lessonId) => {
    const response = await apiClient.post(`/progress/${courseId}/complete`, { lessonId });
    return response.data;
  }
};
