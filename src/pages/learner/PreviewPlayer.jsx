import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, List, X, Lock, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import VideoPlayer from '../../components/learner/VideoPlayer';
import CourseSidebar from '../../components/learner/CourseSidebar';
import { videoService } from '../../services/video.service';
import { useAuth } from '../../context/useAuth';
import apiClient from '../../services/api';

const PreviewPlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courseData, setCourseData] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar

  const activeControllerRef = useRef(null);
  const isPaidCourse = courseData && !courseData.isFree && Number(courseData.price) > 0;
  const enrollActionLabel = isPaidCourse ? 'Proceed to Payment' : 'Enroll for Free';

  useEffect(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    activeControllerRef.current = new AbortController();
    const signal = activeControllerRef.current.signal;

    const fetchPreviewCurriculum = async () => {
      try {
        setLoading(true);
        const res = await videoService.getCoursePreviewCurriculum(courseId, { signal });
        setCourseData(res.data);

        // Find standard lesson to display
        let targetLesson = null;
        if (lessonId) {
          for (const mod of res.data.modules) {
            const lesson = mod.lessons.find(l => String(l.lessonId) === String(lessonId));
            if (lesson) {
              targetLesson = lesson;
              break;
            }
          }
        }

        // Default to first previewable lesson if not found or not specified
        if (!targetLesson) {
          for (const mod of res.data.modules) {
            const firstPreviewable = mod.lessons.find(l => l.isPreview || l.allowFreePreview);
            if (firstPreviewable) {
              targetLesson = firstPreviewable;
              break;
            }
          }
        }

        // Fallback to first lesson in the curriculum
        if (!targetLesson && res.data.modules.length > 0 && res.data.modules[0].lessons.length > 0) {
          targetLesson = res.data.modules[0].lessons[0];
        }

        // Guard against locked lesson manual route attempts
        if (targetLesson && targetLesson.isLocked) {
          toast.error('This lesson is locked. Only previewable lessons can be played.');
          // Redirect to a previewable one
          let previewable = null;
          for (const mod of res.data.modules) {
            const match = mod.lessons.find(l => l.isPreview || l.allowFreePreview);
            if (match) {
              previewable = match;
              break;
            }
          }
          if (previewable) {
            targetLesson = previewable;
          }
        }

        setActiveLesson(targetLesson);

        // Sync URL if active lesson is different or URL has no lessonId
        if (targetLesson && String(lessonId) !== String(targetLesson.lessonId)) {
          navigate(`/learner-dashboard/catalogue/${courseId}/preview/${targetLesson.lessonId}`, { replace: true });
        }
      } catch (error) {
        if (error.name === 'CanceledError' || error.constructor.name === 'Cancel') {
          console.debug('[PreviewPlayer] Fetch preview curriculum request aborted safely.');
          return;
        }
        toast.error('Failed to load course preview content.');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPreviewCurriculum();

    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [courseId]);

  // Handle URL change reactively
  useEffect(() => {
    if (courseData && lessonId) {
      let foundLesson = null;
      for (const mod of courseData.modules) {
        const lesson = mod.lessons.find(l => String(l.lessonId) === String(lessonId));
        if (lesson) {
          foundLesson = lesson;
          break;
        }
      }

      if (foundLesson) {
        if (foundLesson.isLocked) {
          toast.error('This lesson is locked. Enroll to unlock.');
          return;
        }
        if (String(foundLesson.lessonId) !== String(activeLesson?.lessonId)) {
          setActiveLesson(foundLesson);
        }
      }
    }
  }, [lessonId, courseData]);

  const handleLessonSelect = (lesson) => {
    if (lesson.isLocked) {
      toast.error('This lesson is locked. Enroll to unlock all lessons.');
      return;
    }
    navigate(`/learner-dashboard/catalogue/${courseId}/preview/${lesson.lessonId}`);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleEnroll = async () => {
    if (user && user.role !== 'learner') {
      toast.error('Restricted: Enrollment is reserved for Learner accounts only.');
      return;
    }

    if (!user) {
      toast.error('Login required to enroll. Redirecting...');
      navigate('/login', { state: { from: `/learner-dashboard/catalogue/${courseId}/preview/${activeLesson?.lessonId || lessonId}` } });
      return;
    }

    if (isPaidCourse) {
      toast.success('Opening payment screen...');
      navigate(`/learner-dashboard/payment/${courseId}`, {
        state: {
          course: courseData,
          from: `/learner-dashboard/catalogue/${courseId}/preview/${activeLesson?.lessonId || lessonId}`
        }
      });
      return;
    }

    setIsEnrolling(true);
    try {
      await apiClient.post(`/enrollments/${courseId}`);
      toast.success('Successfully enrolled in this course!');
      // Navigate straight to full enrolled player
      navigate(`/learner-dashboard/player/${courseId}/${activeLesson?.lessonId || lessonId}`);
    } catch (err) {
      console.error('[PreviewPlayer] Enrollment error:', err);
      const isAlreadyEnrolled = err.response?.data?.code === 'COURSE_ALREADY_ENROLLED' || 
                                err.response?.data?.message?.includes('Already enrolled');
      if (isAlreadyEnrolled) {
        toast.success('Already enrolled! Access verified.');
        navigate(`/learner-dashboard/player/${courseId}/${activeLesson?.lessonId || lessonId}`);
      } else {
        toast.error(err.response?.data?.message || 'Failed to enroll in this course.');
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden flex-col lg:flex-row">
      
      {/* Mobile Header / Sidebar Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <button 
          onClick={() => navigate(`/learner-dashboard/catalogue/${courseId}`)}
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center max-w-[60%]">
          <span className="font-semibold text-gray-900 dark:text-white truncate w-full text-center">
            {activeLesson?.title}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse mt-0.5">
            PREVIEW MODE
          </span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
          <List size={24} />
        </button>
      </div>

      {/* Main Content (Video + Info) */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative">
        
        {/* Back to Catalogue Button (Desktop) & Preview Badge */}
        <div className="hidden lg:flex p-4 bg-transparent absolute top-0 left-0 z-10 w-full bg-gradient-to-b from-black/60 to-transparent items-center justify-between pointer-events-none">
          <button
            onClick={() => navigate(`/learner-dashboard/catalogue/${courseId}`)}
            className="pointer-events-auto flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm"
          >
            <ChevronLeft size={16} className="mr-1" /> Back to Catalogue
          </button>
          
          <div className="pointer-events-auto flex items-center bg-amber-500/90 text-black text-xs font-black tracking-widest px-4 py-1.5 rounded-full shadow-lg border border-amber-400 animate-pulse uppercase">
            Preview Mode
          </div>
        </div>

        {/* Video Player Container */}
        <div className="w-full bg-black shrink-0">
          <div className="max-w-6xl mx-auto">
            {activeLesson ? (
              <VideoPlayer
                key={activeLesson.lessonId} // Force remount on lesson change
                url={activeLesson.videoUrl}
                lessonId={activeLesson.lessonId}
                videoStatus={activeLesson.videoStatus}
                videoProcessingError={activeLesson.videoProcessingError}
                initialPosition={0}
                onComplete={null} // Sandboxed Preview Mode disables progress updates
                hasNextLesson={false} // Disable countdown auto-progression in preview
                nextLessonTitle=""
                onNextLesson={null}
                isPreview={true}
                onEnroll={handleEnroll}
                enrollLabel={enrollActionLabel}
              />
            ) : (
              <div className="aspect-video w-full bg-slate-950 flex flex-col items-center justify-center text-white border border-white/5 rounded-xl">
                <Lock size={48} className="text-amber-500 mb-4" />
                <p className="text-sm font-semibold text-gray-300">Enroll in this course to unlock the full curriculum.</p>
              </div>
            )}
          </div>
        </div>

        {/* Lesson Info Below Video */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                {activeLesson?.title}
                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  FREE PREVIEW
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Module: {courseData?.modules.find(m => m.lessons.some(l => String(l.lessonId) === String(activeLesson?.lessonId)))?.title}
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-w-3xl">
                {activeLesson?.description || activeLesson?.lessonDescription || 'This lesson is a free preview. Watch the lesson preview to get a taste of the course content!'}
              </p>
            </div>

            {/* Quick Enrollment Card Gating */}
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shrink-0 w-full md:w-80 shadow-md backdrop-blur-sm flex flex-col items-stretch">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <Lock size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Full Course Access</h4>
                  <p className="text-xs text-gray-400">Unlock entire syllabus</p>
                </div>
              </div>
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                {isEnrolling ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    <span>{enrollActionLabel}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 shrink-0 z-20">
        <CourseSidebar
          courseData={courseData}
          activeLessonId={activeLesson?.lessonId}
          onLessonSelect={handleLessonSelect}
          isPreviewMode={true}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Curriculum Preview</span>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CourseSidebar
                  courseData={courseData}
                  activeLessonId={activeLesson?.lessonId}
                  onLessonSelect={handleLessonSelect}
                  isPreviewMode={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PreviewPlayer;
