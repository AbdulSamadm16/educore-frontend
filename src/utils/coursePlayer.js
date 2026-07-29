import apiClient from '../services/api';

/**
 * Resolves the target lessonId for a course player based on curriculum and user progress.
 * @param {string} courseId The course ID
 * @param {Object} [enrollment] Optional enrollment data containing last accessed lesson info
 * @returns {Promise<string|null>} Target lesson ID or null if none found
 */
export const resolvePlayerLesson = async (courseId, enrollment = null) => {
  const [curriculumRes, progressRes] = await Promise.all([
    apiClient.get(`/courses/${courseId}/curriculum`),
    apiClient.get(`/progress/${courseId}`).catch(() => null)
  ]);

  const modules = curriculumRes.data?.data?.modules || [];
  const progressData = progressRes?.data?.data || {};
  const completedLessons = (progressData.completedLessons || []).map((lessonId) => String(lessonId));
  let resolvedLessonId = progressData.lastAccessedLesson || enrollment?.lastLessonId || null;

  if (!resolvedLessonId) {
    for (const module of modules) {
      for (const lesson of module.lessons || []) {
        const lessonId = lesson.id || lesson._id || lesson.lessonId;
        const isLocked = lesson.isLocked ?? false;
        const isCompleted = completedLessons.includes(String(lessonId));
        if (lessonId && !isLocked && !isCompleted) {
          resolvedLessonId = lessonId;
          break;
        }
      }
      if (resolvedLessonId) break;
    }
  }

  if (!resolvedLessonId) {
    for (const module of modules) {
      const firstLesson = (module.lessons || [])[0];
      if (firstLesson) {
        resolvedLessonId = firstLesson.id || firstLesson._id || firstLesson.lessonId;
        break;
      }
    }
  }

  return resolvedLessonId;
};
