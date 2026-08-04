import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, FileText, Download, List, X, CalendarDays, 
  PlayCircle, Clock, Award, CheckCircle2, XCircle, AlertCircle, ArrowRight, 
  UploadCloud, History, Check, Paperclip, Trash2, ExternalLink, MessageSquare,
  GraduationCap, Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import VideoPlayer from '../../components/learner/VideoPlayer';
import CourseSidebar from '../../components/learner/CourseSidebar';
import DiscussionTab from '../../components/discussion/DiscussionTab';
import { videoService } from '../../services/video.service';
import { liveSessionService } from '../../services/liveSession.service';
import { useAuth } from '../../context/useAuth';
import apiClient from '../../services/api';

const CoursePlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile responsiveness
  const [activeTab, setActiveTab] = useState('lessons');
  const [recordings, setRecordings] = useState([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [activeRecording, setActiveRecording] = useState(null);
  const [previewAsStudent, setPreviewAsStudent] = useState(false);

  const getCurriculumConfig = (extra = {}) => {
    const config = { ...extra };
    if (previewAsStudent) {
      config.params = { ...config.params, previewAsStudent: 'true' };
    }
    return config;
  };

  const userId = String(user?.id || user?._id || '');
  const isTutorAuthor = Boolean(
    user?.role === 'tutor' &&
    courseData?.authorId &&
    userId === String(courseData.authorId)
  );

  // Expanded Quiz & Assignment States
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [quizState, setQuizState] = useState('landing'); // landing, taking, results
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizAttachments, setQuizAttachments] = useState({}); // questionId -> [{title, fileUrl, publicId}]
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [assignmentContent, setAssignmentContent] = useState('');
  const [assignmentFiles, setAssignmentFiles] = useState([]); // [{title, fileUrl, publicId}]

  const pollerIntervalRef = useRef(null);
  const activeControllerRef = useRef(null);
  const isSyncingCompletionRef = useRef(false);
  const isSubmittingQuizRef = useRef(false);
  const isSubmittingAssignmentRef = useRef(false);

  const isMatchingLesson = (l, targetId) => {
    if (!l || targetId === undefined || targetId === null) return false;
    const tid = String(targetId);
    return (
      (l.lessonId && String(l.lessonId) === tid) ||
      (l._id && String(l._id) === tid) ||
      (l.id && String(l.id) === tid)
    );
  };

  const getLessonId = (l) => l?.lessonId || l?._id || l?.id;

  // Derived state for the active lesson
  const activeLesson = (() => {
    if (!courseData || !Array.isArray(courseData.modules)) return null;
    
    let target = null;
    if (lessonId) {
      for (const mod of courseData.modules) {
        const lesson = (mod.lessons || []).find(l => isMatchingLesson(l, lessonId));
        if (lesson) {
          target = lesson;
          break;
        }
      }
    }

    if (target && target.isLocked) {
      let lastUnlocked = null;
      for (const mod of courseData.modules) {
        for (const l of mod.lessons || []) {
          if (!l.isLocked) {
            lastUnlocked = l;
          }
        }
      }
      if (lastUnlocked) {
        return lastUnlocked;
      }
    }

    if (!target && courseData.modules.length > 0 && (courseData.modules[0].lessons || []).length > 0) {
      return courseData.modules[0].lessons[0];
    }

    return target;
  })();

  // Offline Progress Reconcile and Sync Activation hook
  useEffect(() => {
    videoService.reconcileOfflineProgress().catch(() => {});

    const handleOnline = () => {
      console.log('[CoursePlayer] Browser returned online. Reconciling playback progress...');
      toast.promise(
        videoService.reconcileOfflineProgress(),
        {
          loading: 'Saving offline playback progress...',
          success: 'Playback progress saved successfully!',
          error: 'Failed to save offline progress.'
        },
        { id: 'offline-sync-toast' }
      ).catch(() => {});
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    activeControllerRef.current = new AbortController();
    const signal = activeControllerRef.current.signal;

    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await videoService.getCourseCurriculum(courseId || 'course_123', getCurriculumConfig({ signal }));
        setCourseData(res.data);

        let targetLesson = null;
        const modules = Array.isArray(res.data?.modules) ? res.data.modules : [];
        if (lessonId) {
          for (const mod of modules) {
            const lesson = (mod.lessons || []).find(l => isMatchingLesson(l, lessonId));
            if (lesson) {
              targetLesson = lesson;
              break;
            }
          }
        }

        if (!targetLesson) {
          const mockPlayback = await videoService.getLessonPlayback(lessonId || 'les_2', { signal });
          for (const mod of modules) {
            const lesson = (mod.lessons || []).find(l => isMatchingLesson(l, mockPlayback.data?.lessonId));
            if (lesson) {
              targetLesson = lesson;
              if (mockPlayback.data?.lastPosition > 0) {
                targetLesson.secondsWatched = mockPlayback.data.lastPosition;
              }
              break;
            }
          }
        }

        if (!targetLesson && modules.length > 0 && (modules[0].lessons || []).length > 0) {
          targetLesson = modules[0].lessons[0];
        }

        if (targetLesson && targetLesson.isLocked) {
          let lastUnlocked = null;
          for (const mod of modules) {
            for (const l of mod.lessons || []) {
              if (!l.isLocked) {
                lastUnlocked = l;
              }
            }
          }
          if (lastUnlocked) {
            targetLesson = lastUnlocked;
            toast.error('This lesson is locked. Redirecting to last unlocked lesson.');
          }
          else if (modules.length > 0 && (modules[0].lessons || []).length > 0) {
            targetLesson = modules[0].lessons[0];
          }
        }

        const resolvedTargetId = getLessonId(targetLesson);
        if (targetLesson && resolvedTargetId && String(lessonId) !== String(resolvedTargetId)) {
          navigate(`/learner-dashboard/player/${courseId || 'course_123'}/${resolvedTargetId}`, { replace: true });
        }
      } catch (error) {
        if (error.name === 'CanceledError' || error.constructor.name === 'Cancel') {
          console.debug('[CoursePlayer] Fetch course request aborted safely.');
          return;
        }
        toast.error('Failed to load course content.');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCourse();

    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [courseId, previewAsStudent]);

  useEffect(() => {
    if (!courseId) return;

    const fetchRecordings = async () => {
      try {
        setRecordingsLoading(true);
        const response = await liveSessionService.getCourseRecordings(courseId);
        const list = response.data?.data?.recordings || response.data?.data || [];
        const publishedReady = list.filter((recording) =>
          String(recording.status || recording.publishStatus || '').toLowerCase() === 'published'
          && String(recording.processingStatus || recording.videoStatus || '').toLowerCase() === 'ready'
        );
        setRecordings(publishedReady);
        setActiveRecording((current) => current || publishedReady[0] || null);
      } catch (error) {
        console.error('Failed to load live recordings:', error);
      } finally {
        setRecordingsLoading(false);
      }
    };

    fetchRecordings();
  }, [courseId]);

  // Reactive lock redirection
  useEffect(() => {
    if (!courseData || !lessonId) return;

    let foundLesson = null;
    for (const mod of courseData.modules) {
      const lesson = mod.lessons.find(l => String(l.lessonId) === String(lessonId));
      if (lesson) {
        foundLesson = lesson;
        break;
      }
    }

    if (foundLesson && foundLesson.isLocked) {
      let lastUnlocked = null;
      for (const mod of courseData.modules) {
        for (const l of mod.lessons) {
          if (!l.isLocked) {
            lastUnlocked = l;
          }
        }
      }
      if (lastUnlocked) {
        // Only toast+redirect when there's a real unlocked lesson to go to
        toast.error('This lesson is locked.');
        navigate(`/learner-dashboard/player/${courseId || 'course_123'}/${lastUnlocked.lessonId}`, { replace: true });
      }
      // If ALL lessons are locked (e.g. progress not yet initialised), stay put silently.
      // The backend still serves the content so showing the error toast is misleading.
    }
  }, [lessonId, courseData, courseId, navigate]);

  // Handle loading attempts and submissions on lesson changes
  useEffect(() => {
    if (!activeLesson) return;

    setQuizState('landing');
    setCurrentAttempt(null);
    setActiveQuestionIdx(0);
    setQuizAnswers({});
    setQuizAttachments({});
    setQuizTimeLeft(0);
    setAssignmentContent('');
    setAssignmentFiles([]);

    if (activeLesson.type === 'quiz') {
      fetchQuizAttempts();
    } else if (activeLesson.type === 'assignment') {
      fetchAssignmentSubmissions();
    }
  }, [activeLesson?.lessonId]);

  const fetchQuizAttempts = async () => {
    try {
      const res = await apiClient.get(`/quizzes/my-attempts?lessonId=${activeLesson.lessonId}`);
      setQuizAttempts(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch quiz attempts:', e);
    }
  };

  const fetchAssignmentSubmissions = async () => {
    try {
      const res = await apiClient.get(`/submissions/my-submissions?courseId=${courseId}`);
      const filtered = (res.data.data || []).filter(sub => {
        const subLessonId = sub.lessonId?.id || sub.lessonId?._id || sub.lessonId;
        return String(subLessonId) === String(activeLesson.lessonId);
      });
      setAssignmentSubmissions(filtered);
    } catch (e) {
      console.error('Failed to fetch submissions:', e);
    }
  };

  // Status Poller for Video Transcoding
  useEffect(() => {
    if (pollerIntervalRef.current) {
      clearInterval(pollerIntervalRef.current);
      pollerIntervalRef.current = null;
    }

    if (!activeLesson || activeLesson.videoStatus !== 'Processing' || !courseId) return;

    const pollController = new AbortController();
    const signal = pollController.signal;

    pollerIntervalRef.current = setInterval(async () => {
      try {
        const res = await videoService.getCourseCurriculum(courseId, getCurriculumConfig({ signal }));
        let updatedLesson = null;
        for (const mod of res.data.modules) {
          const lesson = mod.lessons.find(l => String(l.lessonId) === String(activeLesson.lessonId));
          if (lesson) {
            updatedLesson = lesson;
            break;
          }
        }

        if (updatedLesson) {
          if (updatedLesson.videoStatus !== 'Processing') {
            toast.success('Video optimization complete! Playback is now ready.');
            setCourseData(res.data);
            if (pollerIntervalRef.current) {
              clearInterval(pollerIntervalRef.current);
              pollerIntervalRef.current = null;
            }
          }
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.constructor.name === 'Cancel') {
          return;
        }
      }
    }, 5000);

    return () => {
      pollController.abort();
      if (pollerIntervalRef.current) {
        clearInterval(pollerIntervalRef.current);
        pollerIntervalRef.current = null;
      }
    };
  }, [activeLesson?.lessonId, activeLesson?.videoStatus, courseId]);

  const handleLessonSelect = (lesson) => {
    if (lesson.isLocked) {
      if (isSyncingCompletionRef.current) {
        const toastId = toast.loading('Unlocking next lesson...');
        const checkSync = setInterval(() => {
          if (!isSyncingCompletionRef.current) {
            clearInterval(checkSync);
            toast.dismiss(toastId);
            setCourseData(currentData => {
              if (currentData) {
                let updatedLesson = null;
                for (const mod of currentData.modules) {
                  const l = mod.lessons.find(l => String(l.lessonId) === String(lesson.lessonId));
                  if (l) {
                    updatedLesson = l;
                    break;
                  }
                }
                if (updatedLesson && !updatedLesson.isLocked) {
                  setActiveTab('lessons');
                  navigate(`/learner-dashboard/player/${courseId || 'course_123'}/${updatedLesson.lessonId}`);
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                } else {
                  toast.error('This lesson is locked.');
                }
              }
              return currentData;
            });
          }
        }, 100);
        return;
      }
      toast.error('This lesson is locked.');
      return;
    }
    
    setActiveTab('lessons');
    navigate(`/learner-dashboard/player/${courseId || 'course_123'}/${lesson.lessonId}`);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const navigateLesson = (direction) => {
    if (!courseData || !activeLesson) return;

    const allLessons = [];
    courseData.modules.forEach(mod => {
      mod.lessons.forEach(lesson => allLessons.push(lesson));
    });

    const currentIndex = allLessons.findIndex(l => String(l.lessonId) === String(activeLesson.lessonId));

    if (direction === 'next' && currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      if (!nextLesson.isLocked) handleLessonSelect(nextLesson);
      else toast.error('Next lesson is locked.');
    } else if (direction === 'prev' && currentIndex > 0) {
      handleLessonSelect(allLessons[currentIndex - 1]);
    }
  };

  const handleLessonComplete = async (lessonId) => {
    try {
      isSyncingCompletionRef.current = true;
      toast.success('Lesson marked complete!');

      await videoService.markLessonComplete(courseId || 'course_123', lessonId);
      const res = await videoService.getCourseCurriculum(courseId || 'course_123', getCurriculumConfig());
      setCourseData(res.data);
    } catch (error) {
      console.error('[CoursePlayer] Failed to mark lesson complete:', error);
      toast.error('Failed to update progress on the server.');
    } finally {
      isSyncingCompletionRef.current = false;
    }
  };

  // Upload attachment directly to Cloudinary
  const handleCloudinaryUpload = async (file, onProgressSuccess) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadToastId = toast.loading(`Uploading "${file.name}" to Cloudinary...`);
    try {
      const response = await apiClient.post('/submissions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Asset uploaded successfully!', { id: uploadToastId });
      
      const fileData = {
        title: response.data.data.title,
        fileUrl: response.data.data.fileUrl,
        publicId: response.data.data.publicId
      };
      
      onProgressSuccess(fileData);
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload file.', { id: uploadToastId });
    }
  };

  // Quiz submission timer handler (Countdown tick)
  useEffect(() => {
    if (quizState !== 'taking' || quizTimeLeft <= 0 || isSubmittingQuiz) return;

    const timer = setInterval(() => {
      setQuizTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, quizTimeLeft, isSubmittingQuiz]);

  // Quiz auto-submit trigger when time runs out
  useEffect(() => {
    const timeLimit = activeLesson?.quizMeta?.timeLimitInMinutes || 0;
    if (quizState === 'taking' && timeLimit > 0 && quizTimeLeft === 0 && !isSubmittingQuizRef.current) {
      toast.error('Time is up! Auto-submitting your quiz attempt.');
      submitQuizAttempt();
    }
  }, [quizState, quizTimeLeft, activeLesson?.quizMeta?.timeLimitInMinutes]);

  // Submit Quiz Attempt
  const submitQuizAttempt = async () => {
    if (isSubmittingQuizRef.current) return;
    isSubmittingQuizRef.current = true;
    setIsSubmittingQuiz(true);

    const questionsList = activeLesson?.quizMeta?.questions || [];
    const answersPayload = questionsList.map((q) => {
      const ansVal = quizAnswers[q._id || q.id];
      const isMultiple = q.isMultipleAnswer;
      return {
        questionId: q._id || q.id,
        selectedOptionIndex: isMultiple ? null : (typeof ansVal === 'number' ? ansVal : null),
        selectedOptionIndexes: isMultiple ? (Array.isArray(ansVal) ? ansVal : []) : []
      };
    });

    const submitToastId = toast.loading('Submitting quiz attempt...');
    try {
      const res = await apiClient.post(`/quizzes/lessons/${activeLesson.lessonId}/attempt`, {
        answers: answersPayload
      });
      toast.success(res.data.message || 'Quiz attempt submitted!', { id: submitToastId });
      
      setCurrentAttempt(res.data.data);
      setQuizState('results');
      fetchQuizAttempts();

      if (res.data.data.status === 'graded') {
        const curriculumRes = await videoService.getCourseCurriculum(courseId, getCurriculumConfig());
        setCourseData(curriculumRes.data);
      }
    } catch (e) {
      console.error('Quiz attempt failed:', e);
      toast.error(e.response?.data?.message || 'Failed to submit quiz attempt.', { id: submitToastId });
    } finally {
      isSubmittingQuizRef.current = false;
      setIsSubmittingQuiz(false);
    }
  };

  // Submit Assignment
  const submitAssignmentSubmission = async (e) => {
    e.preventDefault();
    if (isSubmittingAssignmentRef.current) return;
    isSubmittingAssignmentRef.current = true;

    const assignmentMeta = activeLesson?.assignmentMeta || {};
    
    if (assignmentMeta.submissionType !== 'text' && assignmentFiles.length === 0) {
      toast.error('Please upload at least one submission file.');
      isSubmittingAssignmentRef.current = false;
      return;
    }
    if (assignmentMeta.submissionType === 'text' && !assignmentContent.trim()) {
      toast.error('Please write some content in the text editor.');
      isSubmittingAssignmentRef.current = false;
      return;
    }

    setSubmittingAssignment(true);
    const submitToastId = toast.loading('Handing in your assignment...');
    try {
      const res = await apiClient.post(`/submissions/lessons/${activeLesson.lessonId}/submit`, {
        content: assignmentContent,
        attachments: assignmentFiles,
        submissionType: assignmentMeta.submissionType
      });
      toast.success('Assignment handed in successfully!', { id: submitToastId });
      
      setAssignmentContent('');
      setAssignmentFiles([]);
      fetchAssignmentSubmissions();

      // Trigger completion check
      const curriculumRes = await videoService.getCourseCurriculum(courseId, getCurriculumConfig());
      setCourseData(curriculumRes.data);
    } catch (e) {
      console.error('Assignment submission failed:', e);
      toast.error(e.response?.data?.message || 'Failed to hand in assignment.', { id: submitToastId });
    } finally {
      isSubmittingAssignmentRef.current = false;
      setSubmittingAssignment(false);
    }
  };

  // Helper formatting values
  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const getDueDateLabel = (dateStr) => {
    if (!dateStr) return 'No Due Date';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString(undefined, { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  // Render Functions
  const renderTextLesson = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="glass-card p-8 rounded-[32px] border border-white/5 bg-white/2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1.5 rounded-lg">
              Reading Material
            </span>
            {activeLesson.isCompleted && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider">
                <CheckCircle2 size={16} /> Completed
              </span>
            )}
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight">{activeLesson.title}</h2>
          
          <div className="prose prose-invert max-w-none text-white/70 leading-relaxed space-y-4 text-base font-medium">
            {activeLesson.content || activeLesson.description || 'No content provided in this text lesson.'}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          {!activeLesson.isCompleted ? (
            <button
              onClick={() => handleLessonComplete(activeLesson.lessonId)}
              className="px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-violet-600/20 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={18} /> Mark Complete & Unlock Next
            </button>
          ) : (
            <button
              onClick={() => navigateLesson('next')}
              className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
            >
              Next Lesson <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderQuizLesson = () => {
    const questions = activeLesson?.quizMeta?.questions || [];
    const passingScore = activeLesson?.quizMeta?.passingScore || 70;
    const timeLimit = activeLesson?.quizMeta?.timeLimitInMinutes || 0;

    if (questions.length === 0) {
      return (
        <div className="py-12 text-center bg-white/2 border border-white/5 rounded-3xl space-y-3">
          <AlertCircle className="text-amber-500 mx-auto" size={40} />
          <h3 className="text-lg font-bold text-white">No Assessment Questions</h3>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            This assessment doesn't have any questions configured yet.
          </p>
        </div>
      );
    }

    if (quizState === 'landing') {
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl bg-white/2 border border-white/5 text-center">
              <Award className="text-blue-400 mx-auto mb-2" size={28} />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Passing Threshold</p>
              <p className="text-2xl font-black text-white mt-1">{passingScore}%</p>
            </div>
            <div className="glass-card p-6 rounded-2xl bg-white/2 border border-white/5 text-center">
              <Clock className="text-blue-400 mx-auto mb-2" size={28} />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Time Limit</p>
              <p className="text-2xl font-black text-white mt-1">{timeLimit > 0 ? `${timeLimit} Min` : 'Unlimited'}</p>
            </div>
            <div className="glass-card p-6 rounded-2xl bg-white/2 border border-white/5 text-center">
              <FileText className="text-blue-400 mx-auto mb-2" size={28} />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Questions</p>
              <p className="text-2xl font-black text-white mt-1">{questions.length}</p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[32px] bg-white/2 border border-white/5 space-y-6">
            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <History size={20} className="text-blue-400" /> Attempt History
            </h3>
            {quizAttempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      <th className="py-4">Attempt</th>
                      <th className="py-4">Score</th>
                      <th className="py-4">Percentage</th>
                      <th className="py-4">Result</th>
                      <th className="py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-white/70">
                    {quizAttempts.map((att, idx) => (
                      <tr key={att.id || att._id}>
                        <td className="py-4 font-mono font-bold">#{att.attemptNumber}</td>
                        <td className="py-4">
                          {att.status === 'graded' ? `${att.score}/${att.maxScore}` : 'Pending Grade'}
                        </td>
                        <td className="py-4">
                          {att.status === 'graded' ? `${Math.round(att.percentage)}%` : '—'}
                        </td>
                        <td className="py-4">
                          {att.status === 'graded' ? (
                            att.passed ? (
                              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">Pass</span>
                            ) : (
                              <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider">Fail</span>
                            )
                          ) : (
                            <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-bold uppercase tracking-wider">Submitted</span>
                          )}
                        </td>
                        <td className="py-4 text-xs text-white/30">
                          {new Date(att.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center bg-white/1 rounded-2xl border border-white/5">
                <p className="text-xs text-white/30 italic">You have not attempted this quiz yet.</p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setQuizState('taking');
                setQuizAnswers({});
                setQuizAttachments({});
                setActiveQuestionIdx(0);
                if (timeLimit > 0) {
                  setQuizTimeLeft(timeLimit * 60);
                }
              }}
              className="px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3 cursor-pointer"
            >
              Begin Assessment <ArrowRight size={20} />
            </button>
          </div>
        </div>
      );
    }

    if (quizState === 'taking') {
      const q = questions[activeQuestionIdx];
      if (!q) return null;
      const ansVal = quizAnswers[q._id || q.id];
      const isLast = activeQuestionIdx === questions.length - 1;

      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top timer bar */}
          <div className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl">
            <span className="text-xs text-white/40 uppercase font-black tracking-widest">
              Question {activeQuestionIdx + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-2 text-blue-400 font-bold bg-blue-500/10 px-4 py-2 rounded-xl">
              <Clock size={16} />
              <span className="font-mono text-sm">
                {timeLimit > 0 ? formatTime(quizTimeLeft) : 'Unlimited'}
              </span>
            </div>
          </div>

          {/* Question Box */}
          <div className="glass-card p-8 rounded-[32px] bg-[#0f172a]/50 border border-white/10 space-y-6">
            <div className="flex items-start gap-4">
              <span className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 text-sm font-black font-mono">
                Q{activeQuestionIdx + 1}
              </span>
              <div>
                <h3 className="text-xl font-bold text-white leading-snug">{q.questionText}</h3>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2 block bg-blue-500/5 w-fit px-2 py-1 rounded">
                  {q.points || 1} Points · MCQ
                </span>
              </div>
            </div>

            {/* MCQ Options */}
            <div className="grid grid-cols-1 gap-4 pt-4">
              {(q.options || []).map((opt, oIdx) => {
                const isMultiple = q.isMultipleAnswer;
                const isSelected = isMultiple 
                  ? Array.isArray(ansVal) && ansVal.includes(oIdx)
                  : ansVal === oIdx;

                return (
                  <button
                    key={oIdx}
                    onClick={() => {
                      if (isMultiple) {
                        setQuizAnswers(prev => {
                          const current = Array.isArray(prev[q._id || q.id]) ? prev[q._id || q.id] : [];
                          let next;
                          if (current.includes(oIdx)) {
                            next = current.filter(i => i !== oIdx);
                          } else {
                            next = [...current, oIdx];
                          }
                          return { ...prev, [q._id || q.id]: next };
                        });
                      } else {
                        setQuizAnswers(prev => ({ ...prev, [q._id || q.id]: oIdx }));
                      }
                    }}
                    className={`flex items-center justify-between p-5 rounded-2xl border text-left transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/10 text-white font-black' 
                        : 'border-white/5 bg-white/2 text-white/60 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-bold">{opt.text}</span>
                    {isMultiple ? (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-blue-400 bg-blue-600' : 'border-white/20'
                      }`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    ) : (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-blue-400 bg-blue-600' : 'border-white/20'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
              disabled={activeQuestionIdx === 0}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-20 transition-all cursor-pointer"
            >
              Previous
            </button>

            {!isLast ? (
              <button
                onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={submitQuizAttempt}
                disabled={isSubmittingQuiz}
                className="px-10 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingQuiz ? 'Submitting...' : 'Submit Assessment'}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (quizState === 'results') {
      const att = currentAttempt || quizAttempts[0] || {};
      const answersList = att.answers || [];

      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Main Results Card */}
          <div className="glass-card p-10 rounded-[40px] border border-white/5 bg-gradient-to-br from-white/2 to-blue-500/5 text-center space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full border-4 flex items-center justify-center relative shadow-2xl bg-white/2">
              {att.status === 'graded' ? (
                att.passed ? (
                  <CheckCircle2 size={48} className="text-emerald-400" />
                ) : (
                  <XCircle size={48} className="text-red-400" />
                )
              ) : (
                <Clock size={48} className="text-yellow-400" />
              )}
            </div>

            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                {att.status === 'graded' 
                  ? (att.passed ? 'Passed Assessment!' : 'Attempt Failed') 
                  : 'Attempt Submitted'
                }
              </h2>
              <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-2">
                Attempt #{att.attemptNumber} · Graded status: {att.status}
              </p>
            </div>

            {att.status === 'graded' && (
              <div className="flex justify-center gap-12 py-4 border-t border-b border-white/5 max-w-sm mx-auto">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Score Awarded</p>
                  <p className="text-2xl font-black text-white mt-1">{att.score} / {att.maxScore}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Percentage</p>
                  <p className="text-2xl font-black text-white mt-1">{Math.round(att.percentage)}%</p>
                </div>
              </div>
            )}

            {att.feedback && (
              <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl text-left max-w-xl mx-auto">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Tutor Feedback
                </p>
                <p className="text-xs text-white/60 leading-relaxed italic">"{att.feedback}"</p>
              </div>
            )}
          </div>

          {/* Correct answer reviewer (only for graded MCQ elements) */}
          {att.status === 'graded' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Question Breakdown</h3>
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const sAns = answersList.find(a => String(a.questionId?._id || a.questionId) === String(q._id || q.id));
                  let isCorrect = false;
                  if (q.isMultipleAnswer) {
                    const correctIndexes = [];
                    q.options.forEach((o, i) => { if (o.isCorrect) correctIndexes.push(i); });
                    const selectedIndexes = sAns?.selectedOptionIndexes || [];
                    isCorrect = correctIndexes.length === selectedIndexes.length && correctIndexes.every(val => selectedIndexes.includes(val));
                  } else {
                    isCorrect = sAns && sAns.selectedOptionIndex === q.options.findIndex(o => o.isCorrect);
                  }

                  return (
                    <div key={q._id || q.id} className="p-6 bg-white/2 border border-white/5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-sm font-bold text-white">
                          Q{idx + 1}. {q.questionText}
                        </h4>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded uppercase tracking-widest">
                            <Check size={12} /> Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded uppercase tracking-widest">
                            <X size={12} /> Incorrect
                          </span>
                        )}
                      </div>

                      {/* Display MCQs responses */}
                      <div className="text-xs space-y-1.5 pl-4 border-l border-white/5">
                        <p className="text-white/40">
                          Your Choice: <span className="text-white font-semibold">
                            {q.isMultipleAnswer ? (
                              sAns?.selectedOptionIndexes?.length ? sAns.selectedOptionIndexes.map(i => q.options[i]?.text).join(', ') : 'Unanswered'
                            ) : (
                              sAns && q.options[sAns.selectedOptionIndex] ? q.options[sAns.selectedOptionIndex].text : 'Unanswered'
                            )}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-emerald-400/80">
                            Correct Choice: <span className="font-semibold">
                              {q.isMultipleAnswer 
                                ? q.options.map((o, i) => o.isCorrect ? o.text : null).filter(Boolean).join(', ')
                                : q.options.find(o => o.isCorrect)?.text
                              }
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Explanatory blocks */}
                      {q.explanation && (
                        <div className="text-xs bg-gray-100 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5 text-gray-600 dark:text-white/50 leading-relaxed">
                          <span className="font-black text-gray-900 dark:text-white/80 block mb-1 text-[10px] uppercase tracking-wider">Explanation:</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setQuizState('landing')}
              className="px-8 py-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/80 border border-gray-300 dark:border-white/10 rounded-2xl font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Back to Overview
            </button>
            {att.status === 'graded' && !att.passed && (
              <button
                onClick={() => setQuizState('landing')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 cursor-pointer"
              >
                Reattempt Quiz
              </button>
            )}
          </div>
        </div>
      );
    }
  };

  const renderAssignmentLesson = () => {
    const assignmentMeta = activeLesson?.assignmentMeta || {};
    const instructions = assignmentMeta.instructions || 'No instructions provided.';
    const maxMarks = assignmentMeta.maxMarks || 100;
    const dueDate = assignmentMeta.dueDate || null;
    const isLate = dueDate ? new Date() > new Date(dueDate) : false;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl bg-white/2 border border-white/5 text-center">
            <Award className="text-violet-400 mx-auto mb-2" size={28} />
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Maximum Score</p>
            <p className="text-2xl font-black text-white mt-1">{maxMarks} Points</p>
          </div>
          <div className="glass-card p-6 rounded-2xl bg-white/2 border border-white/5 text-center">
            <Clock className="text-violet-400 mx-auto mb-2" size={28} />
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Due Date</p>
            <p className={`text-xl font-black mt-1 ${isLate ? 'text-red-400' : 'text-white'}`}>
              {getDueDateLabel(dueDate)}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-8 rounded-[32px] bg-white/2 border border-white/5 space-y-4">
          <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1.5 rounded-lg w-fit block">
            Instructions
          </span>
          <p className="text-white/80 leading-relaxed text-sm whitespace-pre-line font-medium">{instructions}</p>
        </div>

        {/* Active Hand in uploader */}
        {(assignmentSubmissions.length === 0 || assignmentMeta.allowMultipleSubmissions) && (
          <form onSubmit={submitAssignmentSubmission} className="glass-card p-8 rounded-[32px] bg-white/2 border border-white/5 space-y-6">
            <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <UploadCloud size={20} className="text-violet-400" /> Hand in Submission
            </h3>

            {isLate && (
              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl text-xs font-bold leading-relaxed">
                <AlertCircle size={18} className="shrink-0" />
                Warning: The deadline has passed. Submitting now will flag this hand-in as late.
              </div>
            )}

            {/* Online Text submissions */}
            {(assignmentMeta.submissionType === 'text' || assignmentMeta.submissionType === 'both') && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  Submission Text Content
                </label>
                <textarea
                  value={assignmentContent}
                  onChange={(e) => setAssignmentContent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 h-40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all text-sm"
                  placeholder="Draft your solution description or answer sheets here..."
                />
              </div>
            )}

            {/* File upload submissions */}
            {(assignmentMeta.submissionType === 'file' || assignmentMeta.submissionType === 'both') && (
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">
                  Submission Attachments (Direct Cloudinary Upload)
                </label>
                
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-violet-500/40 transition-colors relative cursor-pointer group">
                  <input 
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleCloudinaryUpload(file, (uploaded) => {
                          setAssignmentFiles(prev => [...prev, uploaded]);
                        });
                      }
                    }}
                  />
                  <UploadCloud className="text-white/25 group-hover:text-violet-400 transition-colors mx-auto mb-3" size={32} />
                  <p className="text-xs font-bold text-white/60 mb-1">Drag and drop submission files here, or click to upload</p>
                  <p className="text-[10px] text-white/20">Supports PDF, DOCX, ZIP, PNG, JPG (Max 50MB)</p>
                </div>

                {/* Uploaded attachments list */}
                {assignmentFiles.length > 0 && (
                  <div className="space-y-2">
                    {assignmentFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl text-xs text-white/70">
                        <span className="flex items-center gap-2 truncate font-medium">
                          <Paperclip size={14} className="text-violet-400 shrink-0" />
                          {file.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAssignmentFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submittingAssignment}
                className="px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-violet-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingAssignment ? 'Submitting...' : 'Hand In Solution'}
              </button>
            </div>
          </form>
        )}

        {/* Submissions History */}
        <div className="glass-card p-8 rounded-[32px] bg-white/2 border border-white/5 space-y-6">
          <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <History size={20} className="text-violet-400" /> Your Hand-ins
          </h3>
          {assignmentSubmissions.length > 0 ? (
            <div className="space-y-6">
              {assignmentSubmissions.map((sub, idx) => (
                <div key={sub.id || sub._id} className="p-6 bg-white/2 border border-white/5 rounded-2xl space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/5 pb-3">
                    <span className="text-xs font-black text-white uppercase tracking-widest">
                      Attempt #{sub.attemptNumber}
                    </span>
                    <div className="flex items-center gap-2">
                      {sub.isLate && (
                        <span className="px-2.5 py-1 bg-red-500/10 text-red-400 rounded text-[10px] font-black uppercase tracking-widest">Late Hand-in</span>
                      )}
                      {sub.status === 'graded' ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-black uppercase tracking-widest">Graded: {sub.grade} / {maxMarks}</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 rounded text-[10px] font-black uppercase tracking-widest">Submitted</span>
                      )}
                    </div>
                  </div>

                  {sub.content && (
                    <div className="text-xs text-white/70 bg-white/1 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Submitted text:</p>
                      <p className="whitespace-pre-line leading-relaxed italic">"{sub.content}"</p>
                    </div>
                  )}

                  {sub.attachments && sub.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Submitted Files:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sub.attachments.map((file, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl text-xs text-violet-400"
                          >
                            <span className="flex items-center gap-2 truncate font-medium">
                              <FileText size={14} className="text-violet-400 shrink-0" />
                              {file.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sub.feedback && (
                    <div className="p-4 bg-violet-600/5 border border-violet-500/10 rounded-xl">
                      <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">Tutor Feedback</p>
                      <p className="text-xs text-white/60 leading-relaxed italic">"{sub.feedback}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center bg-white/1 rounded-2xl border border-white/5">
              <p className="text-xs text-white/30 italic">No submissions made yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVideoLessonDetails = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 animate-in fade-in duration-500">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {activeLesson?.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Module: {courseData?.modules.find(m => m.lessons.some(l => String(l.lessonId) === String(activeLesson?.lessonId)))?.title}
          </p>
          {activeLesson?.description && (
            <p className="mt-4 text-sm text-gray-600 dark:text-white/60 leading-relaxed">
              {activeLesson.description}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => navigateLesson('prev')}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors shadow-sm cursor-pointer"
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </button>
          <button
            onClick={() => navigateLesson('next')}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            Next <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] h-full bg-[#020617] text-white p-8">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 animate-pulse">Loading Course Player...</p>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] h-full bg-[#020617] text-white p-8 text-center">
        <AlertCircle size={48} className="text-white/20 mb-4" />
        <h3 className="text-xl font-bold mb-2">Unable to Load Course</h3>
        <p className="text-white/40 text-xs max-w-sm mb-6">We couldn't retrieve the course lessons. Please try again.</p>
        <button 
          onClick={() => navigate('/learner-dashboard/learning')} 
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg"
        >
          Return to My Learning
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden flex-col lg:flex-row -m-4 sm:-m-6 lg:-m-10">

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#0f172a] border-b border-white/10 shrink-0 text-white z-20">
        <button onClick={() => navigate('/learner-dashboard/learning')} className="text-white/80 hover:text-white flex items-center gap-1 font-bold text-xs">
          <ChevronLeft size={20} /> Back
        </button>
        <span className="font-bold text-sm text-white truncate px-3 min-w-0 flex-1 text-center">
          {activeLesson?.title || courseData?.title || 'Course Player'}
        </span>
        <button onClick={() => setSidebarOpen(true)} className="text-white/80 hover:text-white p-1">
          <List size={22} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative custom-scrollbar">
        {isTutorAuthor && (
          <div className="sticky top-0 z-30 w-full shrink-0 border-b border-violet-500/20 bg-gradient-to-r from-violet-600/95 via-fuchsia-600/90 to-violet-700/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-white/90" />
                <span className="text-sm font-black uppercase tracking-wider text-white">
                  Tutor Preview Mode
                </span>
                {previewAsStudent && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Student View
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <span className="text-xs font-bold text-white/80">View as Student</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={previewAsStudent}
                    onClick={() => setPreviewAsStudent((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      previewAsStudent ? 'bg-white' : 'bg-white/25'
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-block h-5 w-5 rounded-full bg-violet-600 shadow transition-transform ${
                        previewAsStudent ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
                <button
                  type="button"
                  onClick={() => navigate(`/tutor-dashboard/courses/edit/${courseId}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/25"
                >
                  <Pencil size={14} />
                  Edit Course
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Uniform Back to Dashboard Button Row (Outside & Above all content) */}
        <div className="hidden lg:block w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 shrink-0 animate-in fade-in duration-300">
          <button
            onClick={() => navigate(isTutorAuthor ? '/tutor-dashboard/courses' : -1)}
            className="inline-flex items-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl"
          >
            <ChevronLeft size={14} className="mr-1.5" /> {isTutorAuthor ? 'Back to My Courses' : 'Back to Dashboard'}
          </button>
        </div>

        {/* HLS Video player (only for video tab recordings or video type lessons) */}
        {(activeTab === 'recordings' || (activeLesson && activeLesson.type === 'video')) && (
          <div className="w-full bg-black shrink-0">
            <div className="max-w-6xl mx-auto">
              {activeTab === 'recordings' && activeRecording ? (
                <VideoPlayer
                  key={activeRecording.id || activeRecording._id}
                  url={activeRecording.playbackUrl || activeRecording.hlsUrl || activeRecording.muxPlaybackUrl}
                  lessonId={activeRecording.id || activeRecording._id}
                  videoStatus="Ready"
                  initialPosition={0}
                  disableProgressTracking
                  onProgressSave={({ watchTime }) => {
                    liveSessionService.saveRecordingProgress(activeRecording.id || activeRecording._id, { watchTime })
                      .catch((error) => console.error('Failed to save recording progress:', error));
                  }}
                  subtitleUrl={activeRecording.subtitleUrl || null}
                  userIdentifier={user?.email || user?.username || null}
                />
              ) : activeTab === 'recordings' ? (
                <div className="aspect-video flex items-center justify-center text-white/50 bg-[#080d19]">
                  {recordingsLoading ? 'Loading live recordings...' : 'No live recordings available yet.'}
                </div>
              ) : activeLesson && (() => {
                  const allLessons = [];
                  courseData?.modules?.forEach(mod => {
                    mod.lessons.forEach(lesson => allLessons.push(lesson));
                  });
                  const currentIndex = allLessons.findIndex(l => String(l.lessonId) === String(activeLesson.lessonId));
                  const nextLesson = currentIndex !== -1 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
                  const hasNext = nextLesson && !nextLesson.isLocked;

                  return (
                    <VideoPlayer
                      key={activeLesson.lessonId}
                      url={activeLesson.videoUrl}
                      lessonId={activeLesson.lessonId}
                      videoStatus={activeLesson.videoStatus}
                      videoProcessingError={activeLesson.videoProcessingError}
                      initialPosition={activeLesson.secondsWatched || 0}
                      isCompleted={activeLesson.isCompleted || false}
                      onComplete={handleLessonComplete}
                      hasNextLesson={!!hasNext}
                      nextLessonTitle={nextLesson?.title || ""}
                      onNextLesson={() => {
                        if (nextLesson) handleLessonSelect(nextLesson);
                      }}
                      subtitleUrl={activeLesson.subtitleUrl || null}
                      userIdentifier={user?.email || user?.username || null}
                    />
                  );
                })()}
            </div>
          </div>
        )}

        {/* Tab selection & Dynamic rendering pane */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pt-4">

          {activeTab === 'recordings' ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {activeRecording?.title || 'Live Recordings'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Live recordings are separate from course lessons and do not affect progress, locking, or certificates.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recordings.map((recording) => (
                  <button
                    key={recording.id || recording._id}
                    onClick={() => setActiveRecording(recording)}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      String(activeRecording?.id || activeRecording?._id) === String(recording.id || recording._id)
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <PlayCircle className="text-violet-500 mt-0.5" size={20} />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{recording.title || 'Live recording'}</p>
                        <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                          {recording.sessionTitle || recording.liveSession?.title || 'Recorded session'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === 'discussion' ? (
            <DiscussionTab
              courseId={courseId || 'course_123'}
              lessonId={activeLesson?.lessonId}
              activeLesson={activeLesson}
            />
          ) : (
            <>
              {activeLesson?.type === 'text' && renderTextLesson()}
              {activeLesson?.type === 'quiz' && renderQuizLesson()}
              {activeLesson?.type === 'assignment' && renderAssignmentLesson()}
              {activeLesson?.type === 'video' && renderVideoLessonDetails()}

              {/* Standard supplemental attachments for Video or Text lessons */}
              {activeLesson?.type === 'video' && Array.isArray(activeLesson?.attachments) && activeLesson.attachments.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lesson Resources</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeLesson.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.fileUrl || file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 bg-white dark:bg-white/2 border border-gray-200 dark:border-white/5 rounded-xl hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="p-2 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg shrink-0">
                            <FileText size={20} />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {file.title || file.name}
                          </span>
                        </div>
                        <Download size={18} className="text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 shrink-0 ml-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 shrink-0 z-20">
        <CourseSidebar
          courseData={courseData}
          activeLessonId={activeLesson?.lessonId}
          onLessonSelect={handleLessonSelect}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* Mobile Sidebar */}
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
              className="fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-[#0f172a] z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Curriculum</span>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CourseSidebar
                  courseData={courseData}
                  activeLessonId={activeLesson?.lessonId}
                  onLessonSelect={handleLessonSelect}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoursePlayer;
