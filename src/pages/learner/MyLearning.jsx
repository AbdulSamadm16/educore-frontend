import { useCallback, useEffect, useState } from 'react';
import {
  Play,
  CheckCircle,
  BookOpen,
  AlertCircle,
  Zap,
  Download,
  Calendar,
  Clock,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useSearch } from '../../context/SearchContext';
import UniversalModal from '../../components/shared/UniversalModal';

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
];

const sortOptions = [
  { value: 'enrollmentDate', label: 'Enrollment Date' },
  { value: 'lastAccessed', label: 'Last Accessed' },
  { value: 'progress', label: 'Progress' }
];

const getCourseId = (course) => course?._id || course?.id;

const getProgress = (enrollment) => {
  const value = Number(enrollment?.progressPercentage);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
};

const getLearningState = (enrollment) => {
  const progress = getProgress(enrollment);
  if (enrollment?.status === 'completed' || progress >= 100) return 'completed';
  if (progress <= 0) return 'not_started';
  return 'in_progress';
};

const formatDate = (value, fallback = 'Not opened') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function MyLearning() {
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('enrollmentDate');
  const [openingCourseId, setOpeningCourseId] = useState(null);
  const [refundingCourseId, setRefundingCourseId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, config: {} });

  const fetchMyCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/enrollments/my-courses', {
        params: { limit: 50 }
      });
      // The API returns { success: true, data: { enrollments: [], pagination: {} } }
      setEnrollments(response.data.data.enrollments || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError('Failed to load your courses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPlaceholder('Search your library...');
    const timer = window.setTimeout(() => {
      fetchMyCourses();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      setPlaceholder('Search...');
      setSearchQuery('');
    };
  }, [fetchMyCourses, setPlaceholder, setSearchQuery]);

  const resolvePlayerLesson = async (courseId, enrollment) => {
    const [curriculumRes, progressRes] = await Promise.all([
      apiClient.get(`/courses/${courseId}/curriculum`),
      apiClient.get(`/progress/${courseId}`).catch(() => null)
    ]);

    const modules = curriculumRes.data?.data?.modules || [];
    const progressData = progressRes?.data?.data || {};
    const completedLessons = (progressData.completedLessons || []).map((lessonId) => String(lessonId));
    let resolvedLessonId = progressData.lastAccessedLesson || enrollment.lastLessonId || null;

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

  const handleOpenCourse = async (enrollment) => {
    if (['refund_pending', 'refund_processing', 'refund_failed'].includes(enrollment.paymentStatus)) {
      toast.error('Access is paused while your refund request is being resolved.');
      return;
    }

    const courseId = getCourseId(enrollment.course);
    if (!courseId) {
      toast.error('Course information is missing.');
      return;
    }

    setOpeningCourseId(courseId);
    try {
      const lessonId = await resolvePlayerLesson(courseId, enrollment);
      if (!lessonId) {
        toast.error('No lessons found in this course.');
        return;
      }
      navigate(`/learner-dashboard/player/${courseId}/${lessonId}`);
    } catch (err) {
      console.error('Failed to open course player:', err);
      toast.error('Failed to prepare the course player.');
    } finally {
      setOpeningCourseId(null);
    }
  };

  const handleCertificateDownload = (event, enrollment) => {
    event.stopPropagation();
    const certificateUrl = enrollment.certificateDownloadUrl
      || enrollment.certificateUrl
      || enrollment.certificate?.downloadUrl;

    if (!certificateUrl) {
      toast.error('Certificate download is not available yet.');
      return;
    }

    window.open(certificateUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRefundRequest = (event, enrollment) => {
    event.stopPropagation();
    
    setModalConfig({
      isOpen: true,
      config: {
        type: 'confirm',
        title: 'Request Refund',
        message: 'Are you sure you want to request a refund for this course? Your course access will be paused immediately while an admin reviews the request.',
        onConfirm: async () => {
          const courseId = getCourseId(enrollment.course);
          setRefundingCourseId(courseId);
          try {
            const response = await apiClient.post(`/enrollments/${courseId}/refund`);
            toast.success(response.data?.message || 'Refund request submitted');
            fetchMyCourses();
          } catch (err) {
            console.error('Refund request failed:', err);
            toast.error(err.response?.data?.message || 'Failed to process refund request');
          } finally {
            setRefundingCourseId(null);
          }
        }
      }
    });
  };

  const filteredEnrollments = enrollments
    .filter((enrollment) => {
      const courseTitle = enrollment.course?.title || '';
      const matchesFilter = filter === 'all' || getLearningState(enrollment) === filter;
      const matchesSearch = courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'progress') {
        return getProgress(b) - getProgress(a);
      }

      if (sortBy === 'lastAccessed') {
        return new Date(b.lastAccessedAt || 0) - new Date(a.lastAccessedAt || 0);
      }

      return new Date(b.enrolledAt || b.createdAt || 0) - new Date(a.enrolledAt || a.createdAt || 0);
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading My Courses</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 max-w-[1400px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
           <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-4"
          >
          </motion.div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter leading-none">
            My <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Learning</span>
          </h1>
          <p className="text-blue-200/40 text-lg font-medium">Continue your learning journey and track your progress across all active courses.</p>
        </div>

         <div className="flex flex-wrap items-center gap-4">
            <div className="flex overflow-x-auto max-w-full custom-scrollbar whitespace-nowrap bg-white/5 p-1 rounded-xl border border-white/5">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-4 sm:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === option.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0b0f1a]">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
         </div>
       </div>

      {/* Course Grid */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 rounded-[40px] border border-red-500/10 bg-red-500/5 flex flex-col items-center justify-center text-center"
          >
            <AlertCircle size={48} className="text-red-400/20 mb-4" />
            <p className="text-white/60 font-medium mb-6">{error}</p>
            <button 
              onClick={fetchMyCourses}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Try Again
            </button>
          </motion.div>
        ) : filteredEnrollments.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          >
            {filteredEnrollments.map((enrollment, idx) => (
              <LearningCard
                key={enrollment._id || enrollment.id || `${getCourseId(enrollment.course)}-${idx}`}
                enrollment={enrollment}
                index={idx}
                isOpening={openingCourseId === getCourseId(enrollment.course)}
                onOpenCourse={handleOpenCourse}
                onCertificateDownload={handleCertificateDownload}
                onRefundRequest={handleRefundRequest}
                isRefunding={refundingCourseId === getCourseId(enrollment.course)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-20 rounded-[48px] border border-white/5 border-dashed flex flex-col items-center justify-center text-center"
          >
            <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center text-white/10 mb-8 border border-white/5">
              <BookOpen size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No matching courses found</h3>
            <p className="text-white/20 max-w-sm mb-12 text-sm leading-relaxed">
              {searchQuery ? `No courses match "${searchQuery}" in your current filter.` : "Your course library is currently empty. Enroll in a course from the catalogue to begin."}
            </p>
            <Link 
              to="/learner-dashboard/catalogue" 
              className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-blue-600/30 flex items-center gap-3 group"
            >
              Explore Catalogue
              <Zap size={16} className="group-hover:animate-pulse" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <UniversalModal 
        isOpen={modalConfig.isOpen} 
        config={modalConfig.config} 
        onClose={() => setModalConfig({ isOpen: false, config: {} })} 
      />
    </div>
  );
}

function LearningCard({ enrollment, index, isOpening, onOpenCourse, onCertificateDownload, onRefundRequest, isRefunding }) {
  const { course } = enrollment;
  const progress = getProgress(enrollment);
  const learningState = getLearningState(enrollment);
  const isCompleted = learningState === 'completed';
  const certificateEligible = Boolean(
    enrollment.certificateEligible
    || enrollment.certificateIssued
    || enrollment.certificateDownloadUrl
    || enrollment.certificateUrl
    || enrollment.certificate?.downloadUrl
  );
  const statusLabel = learningState === 'not_started'
    ? 'Not Started'
    : learningState === 'in_progress'
      ? 'In Progress'
      : 'Completed';

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={() => onOpenCourse(enrollment)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenCourse(enrollment);
        }
      }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="glass-card rounded-[40px] border border-white/5 hover:border-blue-500/20 transition-all group overflow-hidden flex flex-col h-full shadow-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <div className="relative aspect-video overflow-hidden">
          <img 
            src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
            alt={course.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80" />
          
          <div className="absolute top-4 left-4 flex flex-col gap-2">
             <div className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-400 backdrop-blur-md font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
               <CheckCircle size={12} />
               Enrolled
              </div>
              <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-md font-black text-[9px] uppercase tracking-widest ${
                isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {statusLabel}
              </div>
           </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-600/50 scale-75 group-hover:scale-100 transition-transform">
              {isOpening ? (
                <Loader2 size={28} className="animate-spin" />
              ) : (
                <Play size={28} fill="currentColor" className="ml-1" />
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 flex-1 flex flex-col min-w-0">
          <div className="mb-4 sm:mb-6">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 sm:mb-2 block">{course.category}</span>
             <h3 className="text-base sm:text-xl font-bold text-white line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors break-words">{course.title}</h3>
          </div>

          <div className="mt-auto space-y-6">
            <div className="space-y-3">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Progress</span>
                  <span className="text-sm font-black text-blue-400">{progress}%</span>
               </div>
               <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, delay: 0.1 }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500"
                  />
               </div>
             </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
               <div className="flex items-center gap-2 text-white/30 min-w-0">
                  <Calendar size={14} className="shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest truncate">{formatDate(enrollment.enrolledAt || enrollment.createdAt, 'No date')}</span>
               </div>
               <div className="flex items-center gap-2 text-white/30 min-w-0 justify-end">
                  <Clock size={14} className="shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest truncate">{formatDate(enrollment.lastAccessedAt)}</span>
               </div>
            </div>

            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">
                     {course.authorSnapshot?.name?.[0] || 'T'}
                  </div>
                  <span className="text-xs font-bold text-white/40">{course.authorSnapshot?.name || 'Tutor'}</span>
               </div>
               <div className="flex items-center gap-2 text-white/20">
                  <BookOpen size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{course.totalLessons} Lessons</span>
               </div>
            </div>

            {isCompleted && certificateEligible && (
              <button
                type="button"
                onClick={(event) => onCertificateDownload(event, enrollment)}
                className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Download Certificate
              </button>
            )}

            {!isCompleted && enrollment.paymentStatus === 'success' && (
              <button
                type="button"
                disabled={isRefunding}
                onClick={(event) => onRefundRequest(event, enrollment)}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRefunding ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                {isRefunding ? 'Processing...' : 'Request Refund'}
              </button>
            )}

            {['refund_pending', 'refund_processing'].includes(enrollment.paymentStatus) && (
              <div className="w-full py-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Refund Under Review
              </div>
            )}

            {enrollment.paymentStatus === 'refund_failed' && (
              <div className="w-full py-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertCircle size={14} />
                Refund Retry Pending
              </div>
            )}
          </div>
        </div>
      </motion.article>
  );
}
