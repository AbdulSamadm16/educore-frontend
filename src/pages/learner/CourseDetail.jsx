import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Clock, Star, BookOpen, Play, CheckCircle, 
  ArrowLeft, Share2, Heart, Award, Shield,
  ChevronRight, ChevronLeft, Lock, Zap, Users, MessageSquare,
  ThumbsUp, Send, AlertCircle, StickyNote, FileText, Paperclip, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient, { API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/useAuth';
import VideoPlayer from '../../components/learner/VideoPlayer';
import { videoService } from '../../services/video.service';

export default function CourseDetail() {
  const { id } = useParams();
   const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('curriculum');
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
   const [activeLesson, setActiveLesson] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [courseProgress, setCourseProgress] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [promptTime, setPromptTime] = useState(0);

  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  const courseProgressRef = useRef(null);

  useEffect(() => {
    courseProgressRef.current = courseProgress;
  }, [courseProgress]);

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchCourseDetail();
      fetchReviews();
      if (user) {
        checkWishlistStatus();
      }
    }
  }, [id, user]);

  useEffect(() => {
    if (course && course.modules) {
      for (const mod of course.modules) {
        for (const l of mod.lessons || []) {
          videoService.registerLessonCourse(l.id || l._id, id);
        }
      }
    }
  }, [course, id]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getFlatLessons = () => {
    if (!course || !course.modules) return [];
    return course.modules.flatMap(m => m.lessons || []);
  };

  const flatLessons = getFlatLessons();
  const currentIdx = flatLessons.findIndex(l => String(l.id || l._id) === String(activeLesson?.id || activeLesson?._id));
  const hasPreviousLesson = currentIdx > 0;
  const nextLesson = currentIdx !== -1 && currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;
  const hasNextLesson = !!nextLesson && !nextLesson.isLocked;

  const handlePreviousLesson = () => {
    if (hasPreviousLesson) {
      setActiveLesson(flatLessons[currentIdx - 1]);
    }
  };

  const handleNextLesson = () => {
    if (hasNextLesson) {
      setActiveLesson(nextLesson);
    }
  };

  const handleResumeVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = resumeTime;
      videoRef.current.play().catch(() => {});
    }
    setShowResumePrompt(false);
  };

  const handleRestartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    setShowResumePrompt(false);
  };

  useEffect(() => {
    if (activeLesson && activeLesson.type === 'video') {
      const backendSeconds = activeLesson.secondsWatched || 0;
      const localKey = `educore_video_progress_${user?.id || user?._id || 'guest'}_${activeLesson.id || activeLesson._id}`;
      const localSeconds = parseFloat(localStorage.getItem(localKey) || '0');
      
      const savedSeconds = Math.max(backendSeconds, localSeconds);
      
      if (savedSeconds > 3) {
        setResumeTime(savedSeconds);
        setShowResumePrompt(true);
      } else {
        setShowResumePrompt(false);
      }
      
      lastSavedTimeRef.current = savedSeconds;
    } else {
      setShowResumePrompt(false);
    }
  }, [activeLesson, user]);

  const handleTimeUpdate = async (e) => {
    const video = e.target;
    if (!video || !activeLesson) return;
    
    const currentTime = video.currentTime;
    const duration = video.duration || activeLesson.durationInMinutes * 60 || 0;
    
    const localKey = `educore_video_progress_${user?.id || user?._id || 'guest'}_${activeLesson.id || activeLesson._id}`;
    localStorage.setItem(localKey, currentTime.toString());
    
    if (Math.abs(currentTime - lastSavedTimeRef.current) >= 10) {
      lastSavedTimeRef.current = currentTime;
      const progressPercentage = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;
      
      try {
        await apiClient.post(`/progress/${id}/video-progress`, {
          lessonId: activeLesson.id || activeLesson._id,
          progressPercentage,
          secondsWatched: currentTime
        });
      } catch (err) {
        console.error('Error syncing video progress to backend:', err);
      }
    }
  };

  useEffect(() => {
    const handleUnloadSync = () => {
      if (videoRef.current && activeLesson && activeLesson.type === 'video' && user) {
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration || 0;
        const progressPercentage = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

        const url = `${apiClient.defaults.baseURL || '/api/v1'}/progress/${id}/video-progress`;
        const headers = {
          'Content-Type': 'application/json'
        };
        const token = localStorage.getItem('token');
        if (token) {
          headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }

        const payload = JSON.stringify({
          lessonId: activeLesson.id || activeLesson._id,
          progressPercentage,
          secondsWatched: currentTime
        });

        fetch(url, {
          method: 'POST',
          headers,
          body: payload,
          keepalive: true
        }).catch(err => console.error('Unload sync error:', err));
      }
    };

    window.addEventListener('beforeunload', handleUnloadSync);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleUnloadSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnloadSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeLesson, user, id]);

  // Dynamic Background Status Poller for Transcoding Preview Videos
  useEffect(() => {
    let pollerInterval = null;
    
    if (!activeLesson || activeLesson.type !== 'video' || activeLesson.videoStatus !== 'Processing' || !id) {
      return;
    }

    console.log(`[Preview Poller] Starting background polling for processing preview lesson: ${activeLesson.id || activeLesson._id}`);

    const abortController = new AbortController();

    pollerInterval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/courses/${id}`, { signal: abortController.signal });
        const courseData = response.data.data;
        
        let updatedLesson = null;
        if (courseData && courseData.modules) {
          for (const mod of courseData.modules) {
            const lesson = mod.lessons?.find(l => String(l.id || l._id) === String(activeLesson.id || activeLesson._id));
            if (lesson) {
              updatedLesson = lesson;
              break;
            }
          }
        }

        if (updatedLesson) {
          console.log('[Preview Poller] Polled lesson status:', updatedLesson.videoStatus);
          if (updatedLesson.videoStatus !== 'Processing') {
            toast.success('Video optimization complete! Preview playback is ready.');
            setCourse(courseData);
            setActiveLesson(updatedLesson);
            clearInterval(pollerInterval);
          }
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.constructor.name === 'Cancel') {
          console.debug('[Preview Poller] Request aborted safely.');
          return;
        }
        console.error('[Preview Poller] Failed to query curriculum status:', err);
      }
    }, 5000); // 5 seconds polling frequency

    return () => {
      abortController.abort();
      if (pollerInterval) {
        clearInterval(pollerInterval);
      }
    };
  }, [activeLesson?.id, activeLesson?.videoStatus, id]);


  const checkWishlistStatus = async () => {
    try {
      const response = await apiClient.get(`/wishlist/status/${id}`);
      setInWishlist(response.data.data.inWishlist);
    } catch (err) {
      console.error('Error checking wishlist status:', err);
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error('Please sign in to save to wishlist.');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setWishlistLoading(true);
    try {
      if (inWishlist) {
        await apiClient.delete(`/wishlist/${id}`);
        setInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await apiClient.post(`/wishlist/${id}`);
        setInWishlist(true);
        toast.success('Added to wishlist');
      }
      window.dispatchEvent(new Event('wishlist-updated'));
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      toast.error('Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const fetchCourseProgress = async (courseId) => {
    try {
      const response = await apiClient.get(`/progress/${courseId}`);
      setCourseProgress(response.data.data);
    } catch (err) {
      console.error('Error fetching course progress:', err);
    }
  };

  const fetchCourseDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiClient.get(`/courses/${id}`);
      setCourse(response.data.data);
      if (response.data.data.isEnrolled) {
        fetchCourseProgress(response.data.data.course._id);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching course detail:', err);
      if (!silent) setError('Failed to load course details. It may be unavailable or offline.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const savePlaybackProgress = async (lessonId, currentTime, duration) => {
    if (!duration || duration <= 0) return;
    const percentage = Math.min(100, Math.round((currentTime / duration) * 100));

    if (Math.abs(currentTime - lastSavedTimeRef.current) < 1) return;
    lastSavedTimeRef.current = currentTime;

    try {
      const response = await apiClient.post(`/progress/${id}/video-progress`, {
        lessonId,
        watchTime: currentTime,
        percentage
      });

      setCourseProgress(response.data.data);

      if (percentage >= 90) {
        const wasCompleted = courseProgressRef.current?.completedLessons?.some(
          (cId) => String(cId) === String(lessonId)
        );
        if (!wasCompleted) {
          toast.success("Lesson Completed!");
          fetchCourseDetail(true);
        }
      }
    } catch (err) {
      console.error('Error saving playback progress:', err);
    }
  };

  const savePlaybackProgressBeacon = (lessonId, currentTime, duration) => {
    if (!duration || duration <= 0) return;
    const percentage = Math.min(100, Math.round((currentTime / duration) * 100));

    if (Math.abs(currentTime - lastSavedTimeRef.current) < 1) return;
    lastSavedTimeRef.current = currentTime;

    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      fetch(`${API_BASE_URL}/progress/${id}/video-progress`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lessonId,
          watchTime: currentTime,
          percentage
        }),
        keepalive: true
      });
    } catch (err) {
      console.error('Error saving playback progress via beacon:', err);
    }
  };

  const handleClosePlayer = () => {
    if (playerRef.current && activeLesson && activeLesson.type === 'video') {
      const player = playerRef.current;
      const lessonId = activeLesson.id || activeLesson._id;
      if (player.duration) {
        savePlaybackProgress(lessonId, player.currentTime, player.duration);
      }
    }
    setActiveLesson(null);
    setShowResumePrompt(false);
    setPromptTime(0);
  };

  useEffect(() => {
    setShowResumePrompt(false);
    setPromptTime(0);
    lastSavedTimeRef.current = 0;

    const player = playerRef.current;
    if (!player || !activeLesson || activeLesson.type !== 'video') return;

    const lessonId = activeLesson.id || activeLesson._id;
    const lessonProg = courseProgressRef.current?.lessonProgress?.find(
      (p) => String(p.lessonId) === String(lessonId)
    );
    const savedTime = lessonProg?.watchTime || 0;

    const handleLoadedMetadata = () => {
      if (savedTime > 2 && player) {
        setPromptTime(savedTime);
        setShowResumePrompt(true);
        try {
          player.pause();
        } catch (e) {
          console.error('Failed to pause player on metadata load:', e);
        }
      }
    };

    const handleTimeUpdateLocal = (e) => {
      const curTime = e.target.currentTime;
      const dur = e.target.duration;
      if (lessonId && dur && Math.abs(curTime - lastSavedTimeRef.current) >= 10) {
        savePlaybackProgress(lessonId, curTime, dur);
      }
    };

    const handlePauseLocal = (e) => {
      const curTime = e.target.currentTime;
      const dur = e.target.duration;
      if (lessonId && dur) {
        savePlaybackProgress(lessonId, curTime, dur);
      }
    };

    const handleEndedLocal = (e) => {
      const curTime = e.target.currentTime;
      const dur = e.target.duration;
      if (lessonId && dur) {
        savePlaybackProgress(lessonId, curTime, dur);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && player && player.duration) {
        savePlaybackProgressBeacon(lessonId, player.currentTime, player.duration);
      }
    };

    const handleBeforeUnload = () => {
      if (player && player.duration) {
        savePlaybackProgressBeacon(lessonId, player.currentTime, player.duration);
      }
    };

    player.addEventListener('loadedmetadata', handleLoadedMetadata);
    player.addEventListener('timeupdate', handleTimeUpdateLocal);
    player.addEventListener('pause', handlePauseLocal);
    player.addEventListener('ended', handleEndedLocal);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    if (player.readyState >= 1 && savedTime > 2) {
      setPromptTime(savedTime);
      setShowResumePrompt(true);
      try {
        player.pause();
      } catch (e) {
        console.error('Failed to pause player on immediate readiness:', e);
      }
    }

    return () => {
      player.removeEventListener('loadedmetadata', handleLoadedMetadata);
      player.removeEventListener('timeupdate', handleTimeUpdateLocal);
      player.removeEventListener('pause', handlePauseLocal);
      player.removeEventListener('ended', handleEndedLocal);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson]);

  const handleResumeConfirm = () => {
    const player = playerRef.current;
    if (player && activeLesson && activeLesson.type === 'video') {
      player.currentTime = promptTime;
      try {
        player.play().catch((err) => console.error('Playback confirm error:', err));
      } catch (err) {
        console.error('Playback play method error:', err);
      }
      toast.success(`Resumed playback from ${formatTime(promptTime)}`);
    }
    setShowResumePrompt(false);
  };

  const handleResumeRestart = () => {
    const player = playerRef.current;
    if (player && activeLesson && activeLesson.type === 'video') {
      player.currentTime = 0;
      try {
        player.play().catch((err) => console.error('Playback restart error:', err));
      } catch (err) {
        console.error('Playback play method error:', err);
      }
      const lessonId = activeLesson.id || activeLesson._id;
      if (player.duration) {
        savePlaybackProgress(lessonId, 0, player.duration);
      }
      toast.success('Started playback from the beginning');
    }
    setShowResumePrompt(false);
  };

  const fetchReviews = async (shouldUpdateForm = true) => {
    setReviewsLoading(true);
    try {
      const requests = [apiClient.get(`/reviews/${id}`)];
      
      // Only fetch user-specific review if authenticated
      if (user) {
        requests.push(apiClient.get(`/reviews/${id}/mine`).catch(() => ({ data: { data: null } })));
      }

      const results = await Promise.all(requests);
      const reviewsRes = results[0];
      const myReviewRes = results[1] || { data: { data: null } };

      setReviews(reviewsRes.data.data.reviews || []);
      setMyReview(myReviewRes.data.data);
      
      if (shouldUpdateForm && myReviewRes.data.data) {
        setRating(myReviewRes.data.data.rating);
        setComment(myReviewRes.data.data.comment || '');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchCourseDetail();
      fetchReviews();
      if (user) {
        checkWishlistStatus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Session required. Please sign in to submit a review.');
      navigate('/login', { state: { from: `/learner-dashboard/catalogue/${id}` } });
      return;
    }
    setSubmittingReview(true);
    try {
      const response = await apiClient.post(`/reviews/${id}`, { rating, comment });
      setMyReview(response.data.data);
      setRating(5);
      setComment('');
      fetchReviews(false); // Refresh list but DON'T re-fill form
      fetchCourseDetail(true); // Silent refresh course stats (rating, etc.)
      toast.success('Review submitted successfully.');
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const navigateToCoursePlayer = async () => {
    const loadingToast = toast.loading('Preparing player...');
    try {
      const curriculumRes = await apiClient.get(`/courses/${id}/curriculum`);
      const curriculumData = curriculumRes.data.data;
      const modulesList = curriculumData.modules || [];

      let progressData = null;
      try {
        const progressRes = await apiClient.get(`/progress/${id}`);
        progressData = progressRes.data?.data;
      } catch (progressErr) {
        console.warn('[CourseDetail] Non-blocking: Failed to fetch student progress. Defaulting to first lesson.', progressErr);
      }

      const completedLessons = progressData?.completedLessons || [];
      const lastAccessedLesson = progressData?.lastAccessedLesson;

      let resolvedLessonId = lastAccessedLesson;

      if (!resolvedLessonId) {
        // Find first incomplete unlocked lesson
        for (const mod of modulesList) {
          for (const l of mod.lessons || []) {
            const isLocked = l.isLocked ?? false;
            const isCompleted = completedLessons.includes(l.id || l._id);
            
            if (!isCompleted && !isLocked) {
              resolvedLessonId = l.id || l._id;
              break;
            }
          }
          if (resolvedLessonId) break;
        }
      }

      // Fallback: first lesson in curriculum
      if (!resolvedLessonId) {
        for (const mod of modulesList) {
          if (mod.lessons && mod.lessons.length > 0) {
            resolvedLessonId = mod.lessons[0].id || mod.lessons[0]._id;
            break;
          }
        }
      }

      if (resolvedLessonId) {
        toast.dismiss(loadingToast);
        navigate(`/learner-dashboard/player/${id}/${resolvedLessonId}`);
      } else {
        toast.dismiss(loadingToast);
        toast.error('No lessons found in this course.');
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Error resuming course:', err);
      toast.error('Failed to prepare the course player.');
    }
  };

  const handleEnroll = async () => {
    if (user && user.role !== 'learner') {
      toast.error('Enrollment is only available for learner accounts.');
      return;
    }

    if (!user) {
      toast.error('Please log in to enroll.');
      navigate('/login', { state: { from: `/learner-dashboard/catalogue/${id}` } });
      return;
    }

    if (course?.isEnrolled || isEnrolled) {
      await navigateToCoursePlayer();
      return;
    }

    if (!details.isFree && Number(details.price) > 0) {
      toast.success('Opening payment screen...');
      navigate(`/learner-dashboard/payment/${id}`, {
        state: {
          course: details,
          from: location.pathname
        }
      });
      return;
    }

    setEnrolling(true);
    try {
      await apiClient.post(`/enrollments/${id}`);
      toast.success('Successfully enrolled in this course.');
      setCourse((prev) => (prev ? { ...prev, isEnrolled: true } : prev));
      fetchCourseDetail();
      await navigateToCoursePlayer();
    } catch (err) {
      console.error('Enrollment error:', err);
      const isAlreadyEnrolled = err.response?.data?.code === 'COURSE_ALREADY_ENROLLED' || 
                                err.response?.data?.message?.includes('Already enrolled');
      if (isAlreadyEnrolled) {
        toast.success('Access verified. Preparing course player...');
        setCourse((prev) => (prev ? { ...prev, isEnrolled: true } : prev));
        await navigateToCoursePlayer();
      } else {
        toast.error(err.response?.data?.message || 'Failed to enroll in this course.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleCertificateDownload = () => {
    const certificateUrl = course?.certificateDownloadUrl || course?.certificate?.pdfUrl;
    if (!certificateUrl) {
      toast.error('Certificate download is not available yet.');
      return;
    }
    window.open(certificateUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenLesson = (lesson = null) => {
    if (isEnrolled) {
      navigateToCoursePlayer();
      return;
    }

    const target = lesson || modules.flatMap(m => m.lessons).find(l => l.isPreview || l.allowFreePreview);
    
    if (target) {
      if (target.isPreview || target.allowFreePreview) {
        navigate(`/learner-dashboard/catalogue/${id}/preview/${target.id || target._id}`);
      } else {
        toast.error('Enroll to access this lesson.');
      }
    } else {
      toast.error('Enroll to access this course.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading Course Details</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="glass-card rounded-[40px] p-12 border border-red-500/20 flex flex-col items-center justify-center min-h-[500px] bg-red-500/5">
        <Zap size={64} className="text-red-400/20 mb-6" />
        <h3 className="text-2xl font-bold text-white mb-2">Connection Error</h3>
        <p className="text-red-200/40 text-center max-w-sm mb-8">{error || 'Course not found'}</p>
        <button 
          onClick={() => navigate('/learner-dashboard/catalogue')}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all"
        >
          Return to Catalogue
        </button>
      </div>
    );
  }

  const { course: details, stats, modules, isEnrolled } = course;
  const isPaidCourse = !details.isFree && Number(details.price) > 0;
  const enrollActionLabel = isPaidCourse ? 'Proceed to Payment' : 'Enroll for Free';
  const hasIssuedCertificate = Boolean(
    course.certificateIssued
    && (course.certificateDownloadUrl || course.certificate?.pdfUrl)
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Back Navigation */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
      >
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-blue-600 transition-all">
          <ArrowLeft size={18} />
        </div>
        <span className="text-sm font-bold tracking-widest uppercase">Back to Catalogue</span>
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Left Column: Information Data */}
        <div className="xl:col-span-8">
          <div className="mb-10">
            <div className="flex flex-wrap gap-3 mb-6">
              {course.isEnrolled && (
              <span className="w-fit px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md border border-emerald-500/30 flex items-center gap-1.5 shadow-xl">
                <CheckCircle size={12} />
                Enrolled
              </span>
            )}
              <span className="px-4 py-1.5 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
                {details.category}
              </span>
              <span className="px-4 py-1.5 bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">
                {details.level}
              </span>
              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-400/10 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-400/20">
                <Star size={12} fill="currentColor" />
                {details.averageRating?.toFixed(1) || '0.0'} ({details.reviewCount || 0} Reviews)
              </div>
            </div>

            <h1 className="text-5xl font-black text-white mb-6 tracking-tighter leading-tight">
              {details.title}
            </h1>
            
            <p className="text-xl text-blue-200/40 font-medium leading-relaxed mb-10">
              {details.shortDescription}
            </p>

            <div className="flex flex-wrap gap-8 py-8 border-y border-white/5">
              <StatItem icon={Clock} label="Duration" value={`${Math.round(stats.totalDurationInMinutes / 60)}h ${stats.totalDurationInMinutes % 60}m`} />
              <StatItem icon={BookOpen} label="Modules" value={stats.totalModules} />
              <StatItem icon={Zap} label="Lessons" value={stats.totalLessons} />
              <StatItem icon={Users} label="Learners" value={details.enrollmentCount || 0} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-white/5 mb-8">
            {['curriculum', 'details', 'author', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-bold uppercase tracking-[0.2em] transition-all relative ${
                  activeTab === tab ? 'text-blue-400' : 'text-white/20 hover:text-white/40'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="activeTabDetail" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'curriculum' && (
              <div className="space-y-6">
                {modules.map((module, mIdx) => (
                  <CurriculumModule 
                    key={module.id} 
                    module={module} 
                    index={mIdx} 
                    isEnrolled={isEnrolled}
                    completedLessons={course.completedLessons || []}
                    onOpenLesson={handleOpenLesson}
                    courseProgress={courseProgress}
                  />
                ))}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="glass-card p-10 rounded-[32px] border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6">Course Information</h3>
                <div className="prose prose-invert max-w-none text-gray-600 leading-relaxed">
                  {details.description || 'No detailed course description is available yet.'}
                </div>
                
                {details.learningOutcomes?.length > 0 && (
                  <div className="mt-12">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Learning Outcomes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {details.learningOutcomes.map((outcome, i) => (
                        <div key={i} className="flex gap-3 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                          <CheckCircle className="text-blue-400 shrink-0" size={18} />
                          <span className="text-sm text-white/60 font-medium">{outcome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'author' && (
              <div className="glass-card p-10 rounded-[32px] border border-white/5 flex flex-col md:flex-row gap-10">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 p-[1px] shrink-0">
                  <div className="w-full h-full rounded-[23px] bg-[#020617] flex items-center justify-center overflow-hidden">
                    {details.authorId?.avatarUrl ? (
                      <img src={details.authorId.avatarUrl} alt={details.authorId.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white-400">{details.authorId?.name?.[0]}</span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{details.authorId?.name}</h3>
                  <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-6">Instructor</p>
                  <p className="text-white/60 leading-relaxed max-w-xl">
                    {details.authorId?.profile?.bio || 'Instructor profile details are not available yet.'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {/* Review Form (Only if enrolled) */}
                {isEnrolled && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 rounded-[32px] border border-blue-500/20 bg-blue-500/5"
                  >
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <MessageSquare className="text-blue-400" size={20} />
                      {myReview ? 'Update Your Feedback' : 'Share Your Feedback'}
                    </h3>
                    <form onSubmit={handleReviewSubmit} className="space-y-6">
                      <div>
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className={`p-2 rounded-xl transition-all ${rating >= star ? 'text-amber-400' : 'text-white/10 hover:text-white/20'}`}
                            >
                              <Star size={24} fill={rating >= star ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Comments</label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Share your thoughts about this course..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 h-32 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
                      >
                        {submittingReview ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send size={16} />
                            {myReview ? 'Update Review' : 'Post Review'}
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Review List */}
                <div className="space-y-6">
                  {reviewsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))
                  ) : (
                    <div className="glass-card p-12 rounded-[32px] border border-white/5 text-center">
                      <MessageSquare size={48} className="text-white/5 mx-auto mb-4" />
                      <p className="text-white/20 font-medium uppercase tracking-widest text-xs">No reviews yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Deployment Control */}
        <div className="xl:col-span-4">
          <div className="sticky top-10">
            <div className="glass-card rounded-[40px] border border-white/10 overflow-hidden shadow-2xl shadow-blue-900/20">
              <div className="aspect-video relative">
                <img 
                  src={details.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
                  alt={details.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <button 
                    onClick={() => handleOpenLesson()}
                    className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:scale-110 transition-transform group"
                  >
                    <Play size={32} fill="currentColor" className="ml-1 group-hover:text-blue-400 transition-colors" />
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                     <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2">{details.category}</span>
                     <h3 className="text-xl font-black text-white leading-tight">{details.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-400/20">
                    <Star size={12} fill="currentColor" />
                    {details.averageRating?.toFixed(1) || '0.0'}
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mb-1">Access</p>
                    <h3 className="text-4xl font-black text-white leading-none">
                      {details.isFree ? 'FREE' : `${details.currency || '$'}${details.price}`}
                    </h3>
                  </div>
                  {details.price > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest line-through opacity-50">$199.99</p>
                      <p className="text-xs font-black text-emerald-400">80% OFF</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <button 
                    onClick={handleEnroll}
                    disabled={enrolling || (user && user.role !== 'learner')}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {enrolling ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Play size={18} fill="currentColor" />
                        {user && user.role !== 'learner' ? 'Learner Only Access' : (isEnrolled ? 'Resume Course' : enrollActionLabel)}
                      </>
                    )}
                  </button>
                  {hasIssuedCertificate && (
                    <button
                      type="button"
                      onClick={handleCertificateDownload}
                      className="w-full py-5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                    >
                      <Download size={18} />
                      Download Certificate
                    </button>
                  )}
                   <button 
                    onClick={handleWishlistToggle}
                    disabled={wishlistLoading}
                    className={`w-full py-5 border rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                      inWishlist 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                    }`}
                  >
                    {wishlistLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
                        {inWishlist ? 'In Wishlist' : 'Save to Wishlist'}
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-6 pt-8 border-t border-white/5">
                  <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Included Content</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <AssetItem icon={Shield} text="Certified Verification" />
                    <AssetItem icon={Award} text="Lifetime Course Access" />
                    <AssetItem icon={StickyNote} label="Resources" text="Course Materials" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between px-4">
              <button className="text-white/20 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Share2 size={16} /> Share Course
              </button>
              <button className="text-white/20 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Shield size={16} /> Secured Access
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {/* Lesson Player Modal */}
      <AnimatePresence>
        {activeLesson && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleClosePlayer()}
              className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-[#0b0f1a] border border-white/10 md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Player Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                    {activeLesson.type === 'video' ? <Play size={20} fill="currentColor" /> : <BookOpen size={20} />}
                  </div>
                  <div>
                    <h3 className="text-white font-bold tracking-tight">{activeLesson.title}</h3>
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{activeLesson.type} Lesson</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    disabled={!hasPreviousLesson}
                    onClick={handlePreviousLesson}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-white/10 ${
                      hasPreviousLesson 
                        ? 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white' 
                        : 'opacity-30 cursor-not-allowed text-white/20'
                    }`}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button 
                    disabled={!hasNextLesson}
                    onClick={handleNextLesson}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-white/10 ${
                      hasNextLesson 
                        ? 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white' 
                        : 'opacity-30 cursor-not-allowed text-white/20'
                    }`}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={() => handleClosePlayer()}
                    className="p-3 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-2xl transition-all"
                  >
                    <ArrowLeft className="rotate-90" size={20} />
                  </button>
                </div>
              </div>
              
              {/* Split Body */}
              <div className="flex-1 flex overflow-hidden min-h-0 bg-[#080c14]/40">
                {/* Main Player Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col bg-black/20">
                  {activeLesson.type === 'video' ? (
                    <div className="flex flex-col w-full">
                      {/* Video Wrapper */}
                      <div className="w-full aspect-video flex items-center justify-center bg-black shrink-0 relative">
                        {activeLesson.muxPlaybackId ? (
                          <mux-player
                            ref={playerRef}
                            playback-id={activeLesson.muxPlaybackId}
                            metadata-video-title={activeLesson.title}
                            primary-color="#3b82f6"
                            className="w-full h-full object-contain"
                            controls
                          />
                        ) : activeLesson.videoUrl ? (
                          <div className="w-full h-full relative">
                            {activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be') ? (
                              <iframe 
                                src={`https://www.youtube.com/embed/${activeLesson.videoUrl.split('v=')[1]?.split('&')[0] || activeLesson.videoUrl.split('/').pop()}`}
                                className="w-full h-full border-0"
                                allowFullScreen
                              />
                            ) : (
                              <VideoPlayer
                                url={activeLesson.videoUrl}
                                lessonId={activeLesson.id || activeLesson._id}
                                videoStatus={activeLesson.videoStatus}
                                videoProcessingError={activeLesson.videoProcessingError}
                                initialPosition={resumeTime}
                                hasNextLesson={hasNextLesson}
                                nextLessonTitle={nextLesson?.title || ""}
                                onNextLesson={handleNextLesson}
                                isPreview={!isEnrolled}
                                onEnroll={handleEnroll}
                                enrollLabel={enrollActionLabel}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="text-center p-12">
                             <Play size={48} className="text-white/10 mx-auto mb-4" />
                             <p className="text-white/20 font-bold uppercase tracking-widest text-xs">Video Not Available</p>
                          </div>
                        )}

                        {/* Premium Resume Playback Prompt Overlay */}
                        <AnimatePresence>
                          {showResumePrompt && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#020617]/90 backdrop-blur-md p-6 text-center"
                            >
                              <motion.div 
                                initial={{ scale: 0.9, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 10 }}
                                className="max-w-md w-full p-8 rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-violet-500/10 flex flex-col items-center animate-in fade-in zoom-in duration-300"
                              >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-violet-500/20">
                                  <Clock size={24} />
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">
                                  Resume Playback?
                                </h3>
                                <p className="text-xs text-blue-200/50 mb-8 max-w-[280px] leading-relaxed">
                                  You previously watched up to <span className="font-extrabold text-blue-400">{formatTime(promptTime)}</span>. Would you like to resume from where you left off?
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                  <button
                                    onClick={handleResumeConfirm}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-violet-600/20 active:scale-95"
                                  >
                                    Resume
                                  </button>
                                  <button
                                    onClick={handleResumeRestart}
                                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                                  >
                                    Start Over
                                  </button>
                                </div>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Details and Attachments Section */}
                      <div className="p-8 space-y-8 bg-[#0b0f1a]">
                        <div className="space-y-3">
                          <h4 className="text-xl font-bold text-white tracking-tight">{activeLesson.title}</h4>
                          <p className="text-sm text-blue-200/40 font-medium leading-relaxed">
                            {activeLesson.description || 'No description provided for this lesson.'}
                          </p>
                        </div>

                        {/* Supplementary Resources list */}
                        {activeLesson.attachments && activeLesson.attachments.length > 0 && (
                          <div className="pt-6 border-t border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <Paperclip size={18} />
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-white uppercase tracking-widest leading-none mb-1">Supplementary Materials</h5>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Additional resources attached by the tutor</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {activeLesson.attachments.map((att) => (
                                <div key={att._id || att.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:border-blue-500/20 transition-all">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="text-blue-400 shrink-0" size={20} />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-white truncate">{att.title}</p>
                                      <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">Document Resource</p>
                                    </div>
                                  </div>
                                  <a 
                                    href={att.fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all shrink-0 ml-4 shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
                                  >
                                    Download
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  ) : activeLesson.type === 'quiz' ? (
                    <div className="p-10 max-w-3xl mx-auto w-full">
                      <div className="mb-10 text-center">
                         <Zap className="text-amber-400 mx-auto mb-4" size={40} />
                         <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Assessment</h2>
                         <p className="text-white/40 font-medium">Check your understanding of this lesson.</p>
                      </div>
                      
                      <div className="space-y-8">
                         {(activeLesson.quizMeta?.questions || []).map((q, qIdx) => (
                           <div key={qIdx} className="glass-card p-8 rounded-3xl border border-white/5">
                              <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Question {qIdx + 1}</p>
                              <h4 className="text-xl font-bold text-white mb-8 leading-snug">{q.questionText}</h4>
                              <div className="grid grid-cols-1 gap-3">
                                 {(q.options || []).map((opt, oIdx) => (
                                   <button 
                                     key={oIdx}
                                     className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-white/60 hover:bg-blue-600/10 hover:border-blue-500/30 hover:text-white transition-all font-medium flex items-center justify-between group"
                                   >
                                      <span>{opt.text}</span>
                                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                   </button>
                                 ))}
                              </div>
                           </div>
                         ))}
                         
                         <div className="pt-8 flex flex-col items-center">
                            <button className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20">
                               Submit Assessment
                            </button>
                            <p className="mt-4 text-[10px] text-white/20 font-bold uppercase tracking-widest">Self Assessment</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 md:p-20 max-w-4xl mx-auto">
                      <div className="prose prose-invert max-w-none">
                         <h2 className="text-4xl font-black text-white mb-8 tracking-tighter border-b border-white/10 pb-8">{activeLesson.title}</h2>
                         <div className="text-white/60 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                            {activeLesson.content || 'No content has been added for this lesson yet.'}
                         </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Navigation */}
                <div className="w-80 border-l border-white/5 bg-[#050811] flex flex-col overflow-y-auto custom-scrollbar shrink-0 hidden md:flex min-h-0">
                  <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Course Outline</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {(modules || []).map((mod, mIdx) => (
                      <div key={mod.id} className="space-y-1.5">
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Module {mIdx + 1}</span>
                          <span className="text-[10px] text-white/20 font-bold">{mod.lessons.length} Lessons</span>
                        </div>
                        <h5 className="text-xs font-black text-white/80 line-clamp-1 mb-2">{mod.title}</h5>
                        <div className="space-y-1">
                          {(mod.lessons || []).map((lesson) => {
                            const isActive = String(lesson.id || lesson._id) === String(activeLesson.id || activeLesson._id);
                            const isCompleted = (course.completedLessons || []).includes(String(lesson.id || lesson._id)) || lesson.isCompleted;
                            const isLocked = lesson.isLocked;
                            
                            return (
                              <button
                                key={lesson.id}
                                disabled={isLocked}
                                onClick={() => setActiveLesson(lesson)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                                  isActive 
                                    ? 'bg-blue-600/20 border border-blue-500/30 text-white' 
                                    : isLocked 
                                      ? 'opacity-45 cursor-not-allowed hover:bg-transparent'
                                      : 'hover:bg-white/5 border border-transparent text-white/60 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-1.5 rounded-lg ${
                                    isActive 
                                      ? 'bg-blue-500 text-white animate-pulse' 
                                      : isCompleted
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : isLocked
                                          ? 'bg-white/5 text-white/20'
                                          : 'bg-white/5 text-white/40'
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle size={12} />
                                    ) : isLocked ? (
                                      <Lock size={12} />
                                    ) : lesson.type === 'video' ? (
                                      <Play size={12} fill="currentColor" />
                                    ) : (
                                      <BookOpen size={12} />
                                    )}
                                  </div>
                                  <span className="text-xs font-bold truncate pr-2">{lesson.title}</span>
                                </div>
                                <span className="text-[10px] text-white/20 font-bold shrink-0">{lesson.durationInMinutes}m</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Player Footer */}
              {!isEnrolled && activeLesson.isPreview && (
                <div className="p-6 bg-blue-600/10 border-t border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-blue-400">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold tracking-tight">You are currently in preview mode. Enroll to unlock the full curriculum.</p>
                  </div>
                  <button 
                    onClick={() => { setActiveLesson(null); handleEnroll(); }}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0"
                  >
                    {enrollActionLabel}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-blue-400">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-base font-black text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

function AssetItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 text-white/60">
      <Icon size={16} className="text-blue-400" />
      <span className="text-xs font-bold tracking-wide">{text}</span>
    </div>
  );
}

function CurriculumModule({ module, index, isEnrolled, onOpenLesson, completedLessons = [], courseProgress }) {
  const [isOpen, setIsOpen] = useState(index === 0);

  return (
    <div className="glass-card rounded-[32px] border border-white/5 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 font-black text-xs">
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="text-left">
            <h4 className="text-lg font-bold text-white tracking-tight">{module.title}</h4>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              {module.lessons.length} Lessons • {module.lessons.reduce((acc, l) => acc + (l.durationInMinutes || 0), 0)}m
            </p>
          </div>
        </div>
        <div className={`p-2 rounded-lg bg-white/5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
           <ChevronRight size={18} className="text-white/40" />
        </div>
      </button>

      {isOpen && (
        <div className="p-6 pt-0 border-t border-white/5">
          <div className="space-y-1">
            {module.lessons.map((lesson) => {
              const isLocked = lesson.isLocked ?? (!lesson.isPreview && !isEnrolled);
              
              const isCompleted = 
                completedLessons.includes(String(lesson.id || lesson._id)) || 
                lesson.isCompleted ||
                courseProgress?.completedLessons?.some((cId) => String(cId) === String(lesson.id || lesson._id));

              const isPreviewEligible = lesson.isPreview || lesson.allowFreePreview;
              const canClick = !isLocked || isPreviewEligible;

              const progressItem = courseProgress?.lessonProgress?.find(
                (p) => String(p.lessonId) === String(lesson.id || lesson._id)
              );
              const watchPercentage = progressItem ? progressItem.percentage : 0;
              return (
                <div 
                  key={lesson.id}
                  onClick={() => canClick && onOpenLesson(lesson)}
                  className={`flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group ${!canClick ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      isCompleted 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : !isLocked 
                          ? 'bg-blue-600/10 text-blue-400' 
                          : 'bg-white/5 text-white/20'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle size={14} />
                      ) : isLocked ? (
                        <Lock size={14} />
                      ) : lesson.type === 'video' ? (
                        <Play size={14} fill="currentColor" />
                      ) : (
                        <BookOpen size={14} />
                      )}
                    </div>
                    <span className={`text-sm font-bold ${!isLocked ? 'text-white' : 'text-white/40'} group-hover:text-blue-400 transition-colors`}>
                      {lesson.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    {isCompleted ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                        <CheckCircle size={10} className="text-emerald-400 shrink-0" />
                        Completed
                      </span>
                    ) : watchPercentage > 0 ? (
                      <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest border border-blue-500/10">
                        {watchPercentage}% Watched
                      </span>
                    ) : null}
                    {lesson.isPreview && !isEnrolled && (
                      <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest">Preview</span>
                    )}
                    <span className="text-xs font-bold text-white/20">{lesson.durationInMinutes}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-6 rounded-[24px] border border-white/5 flex gap-6"
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0 flex items-center justify-center overflow-hidden">
        {review.userId?.avatarUrl ? (
          <img src={review.userId.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-white/20">{review.userId?.name?.[0]}</span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
           <div>
             <h4 className="text-sm font-bold text-white">{review.userId?.name}</h4>
             <div className="flex gap-1 mt-1">
               {[1, 2, 3, 4, 5].map((s) => (
                 <Star key={s} size={10} fill={review.rating >= s ? '#fbbf24' : 'none'} className={review.rating >= s ? 'text-amber-400' : 'text-white/10'} />
               ))}
             </div>
           </div>
           <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">{new Date(review.updatedAt).toLocaleDateString()}</span>
        </div>
        <p className="text-sm text-white/60 leading-relaxed italic">"{review.comment}"</p>
      </div>
    </motion.div>
  );
}
