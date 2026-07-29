import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Flag,
  History,
  Layers,
  Loader2,
  PlayCircle,
  Search,
  Shield,
  Star,
  Users,
  Video,
  X,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

const reviewTabs = [
  { key: 'all', label: 'All Courses' },
  { key: 'published', label: 'Published' },
  { key: 'suspended', label: 'Suspended' }
];

const categories = [
  'Development',
  'Design',
  'Business',
  'Marketing',
  'Photography',
  'Music',
  'Finance',
  'Data Science',
  'Artificial Intelligence',
  'Cybersecurity',
  'Health & Fitness',
  'Language Learning'
];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const labelize = (value) => (value || 'unknown').replaceAll('_', ' ');

export default function PlatformCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewCourse, setReviewCourse] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [history, setHistory] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [rejectCourse, setRejectCourse] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [flagCourse, setFlagCourse] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/courses/admin/all', {
        params: {
          status: activeTab === 'all' ? undefined : activeTab,
          category: filterCategory === 'all' ? undefined : filterCategory,
          search: searchTerm || undefined,
          limit: 50
        }
      });
      setCourses(response.data?.data?.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterCategory, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(fetchCourses, searchTerm ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchCourses, searchTerm]);

  const queueCount = 0;

  const loadReviewDetails = async (course) => {
    setReviewCourse(course);
    setCurriculum([]);
    setHistory([]);
    setReviewLoading(true);
    try {
      const [curriculumResponse, historyResponse] = await Promise.all([
        apiClient.get(`/courses/${course._id}/curriculum`),
        apiClient.get(`/courses/${course._id}/audit-logs`)
      ]);
      setCurriculum(curriculumResponse.data?.data?.modules || []);
      setHistory(historyResponse.data?.data || []);
    } catch (error) {
      console.error('Failed to load review details:', error);
      toast.error('Failed to load full course review');
    } finally {
      setReviewLoading(false);
    }
  };

  const updateCourseInList = (courseId, patch) => {
    setCourses(prev => prev.map(course => course._id === courseId ? { ...course, ...patch } : course));
    setReviewCourse(prev => prev && prev._id === courseId ? { ...prev, ...patch } : prev);
  };

  const handleToggleFeature = async (courseId) => {
    try {
      await apiClient.patch(`/courses/${courseId}/feature`);
      setCourses(prev => prev.map(course => course._id === courseId ? { ...course, featured: !course.featured } : course));
    } catch (error) {
      console.error('Error featuring course:', error);
      toast.error('Failed to update featured state');
    }
  };

  const handleApprove = async (courseId) => {
    setActionLoading(`approve-${courseId}`);
    try {
      await apiClient.patch(`/courses/${courseId}/approve`);
      updateCourseInList(courseId, { status: 'published', reviewedAt: new Date().toISOString(), reviewNotes: 'Course approved by administrator' });
      toast.success('Course approved and published');
      await fetchCourses();
      if (reviewCourse?._id === courseId) setReviewCourse(null);
    } catch (error) {
      console.error('Error approving course:', error);
      toast.error('Failed to approve course');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    if (!rejectCourse) return;
    setActionLoading(`reject-${rejectCourse._id}`);
    try {
      await apiClient.patch(`/courses/${rejectCourse._id}/reject-review`, { feedback: rejectFeedback.trim() });
      updateCourseInList(rejectCourse._id, { status: 'unpublished', reviewNotes: rejectFeedback.trim(), reviewedAt: new Date().toISOString() });
      toast.success('Course rejected with feedback');
      setRejectCourse(null);
      setRejectFeedback('');
      setReviewCourse(null);
      await fetchCourses();
    } catch (error) {
      console.error('Error rejecting course:', error);
      toast.error(error.response?.data?.message || 'Failed to reject course');
    } finally {
      setActionLoading('');
    }
  };

  const handleFlag = async () => {
    if (!flagCourse) return;
    setActionLoading(`flag-${flagCourse._id}`);
    try {
      await apiClient.patch(`/courses/${flagCourse._id}/flag-review`, { reason: flagReason.trim() });
      updateCourseInList(flagCourse._id, {
        flaggedForReview: true,
        flagReviewReason: flagReason.trim(),
        flaggedAt: new Date().toISOString()
      });
      toast.success('Course flagged for periodic review');
      setFlagCourse(null);
      setFlagReason('');
    } catch (error) {
      console.error('Error flagging course:', error);
      toast.error(error.response?.data?.message || 'Failed to flag course');
    } finally {
      setActionLoading('');
    }
  };

  const handleSuspend = async () => {
    if (!showSuspendModal || !suspendReason.trim()) return;
    setActionLoading(`suspend-${showSuspendModal}`);
    try {
      await apiClient.patch(`/courses/${showSuspendModal}/suspend`, { reason: suspendReason.trim() });
      updateCourseInList(showSuspendModal, { status: 'suspended', reviewNotes: suspendReason.trim() });
      setShowSuspendModal(null);
      setSuspendReason('');
      toast.success('Course suspended');
    } catch (error) {
      console.error('Error suspending course:', error);
      toast.error('Failed to suspend course');
    } finally {
      setActionLoading('');
    }
  };

  const handleUnsuspend = async (courseId) => {
    setActionLoading(`unsuspend-${courseId}`);
    try {
      await apiClient.patch(`/courses/${courseId}/unsuspend`);
      updateCourseInList(courseId, { status: 'published', reviewNotes: 'Course unsuspended by administrator' });
      toast.success('Course unsuspended');
    } catch (error) {
      console.error('Error unsuspending course:', error);
      toast.error('Failed to unsuspend course');
    } finally {
      setActionLoading('');
    }
  };

  const statusPill = (status) => (
    <div className={`flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded-full border capitalize ${
      status === 'published' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
      status === 'suspended' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' :
      status === 'draft' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
      'text-white/40 border-white/10 bg-white/5'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
        status === 'published' ? 'bg-emerald-400' :
        status === 'suspended' ? 'bg-rose-400' :
        status === 'draft' ? 'bg-blue-400' : 'bg-white/20'
      }`} />
      {labelize(status)}
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-5">

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex rounded-2xl bg-white/5 border border-white/10 p-1 overflow-x-auto">
            {reviewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeTab === tab.key ? 'bg-amber-500 text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[10px] text-white font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f1a]">Category: All</option>
            {categories.map((category) => (
              <option key={category} value={category} className="bg-[#0b0f1a]">{category}</option>
            ))}
          </select>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search courses or tutors..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all w-full lg:w-72 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="glass-card rounded-[28px] p-6 border border-white/5">
          <div className="p-3 rounded-2xl w-fit border mb-5 text-amber-400 bg-amber-500/10 border-amber-500/20">
            <Clock size={24} />
          </div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">Awaiting Review</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{queueCount}</h3>
        </div>
        <div className="glass-card rounded-[28px] p-6 border border-white/5">
          <div className="p-3 rounded-2xl w-fit border mb-5 text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">Live Approval</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">Immediate</h3>
        </div>
        <div className="glass-card rounded-[28px] p-6 border border-white/5">
          <div className="p-3 rounded-2xl w-fit border mb-5 text-blue-400 bg-blue-500/10 border-blue-500/20">
            <History size={24} />
          </div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">Review History</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">Audit Trail</h3>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, index) => (
            <div key={index} className="glass-card rounded-[32px] p-6 border border-white/5 animate-pulse flex gap-6">
              <div className="w-48 h-28 rounded-2xl bg-white/5" />
              <div className="flex-1 space-y-4 py-2">
                <div className="h-4 bg-white/5 rounded w-1/4" />
                <div className="h-6 bg-white/5 rounded w-1/2" />
                <div className="h-4 bg-white/5 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : courses.length > 0 ? (
          courses.map((course, index) => (
            <motion.div
              key={course._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`glass-card rounded-[32px] p-6 border transition-all group flex flex-col xl:flex-row xl:items-center gap-6 ${
                course.status === 'suspended' ? 'border-rose-500/20 bg-rose-500/5' : 'border-white/5 hover:border-amber-500/20'
              }`}
            >
              <div className="w-full xl:w-48 h-36 xl:h-28 rounded-2xl bg-white/5 overflow-hidden relative flex-shrink-0 border border-white/10">
                <img
                  src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-2 left-2 flex gap-2">
                  {course.featured && (
                    <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-xl">
                      <Star size={12} fill="currentColor" />
                    </div>
                  )}
                  {course.flaggedForReview && (
                    <div className="bg-blue-500 text-white p-1.5 rounded-lg shadow-xl">
                      <Flag size={12} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">
                    {course.category || 'Uncategorized'}
                  </span>
                  {statusPill(course.status)}
                  {course.flaggedForReview && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full border text-blue-400 border-blue-500/20 bg-blue-500/5 uppercase tracking-widest">
                      flagged
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white truncate mb-2 group-hover:text-amber-400 transition-colors">
                  {course.title}
                </h3>

                <p className="text-sm text-white/35 line-clamp-1 mb-3">{course.shortDescription || 'No short description provided.'}</p>

                <div className="flex flex-wrap items-center gap-6 text-white/40">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-[10px] font-black text-amber-500 border border-amber-500/20">
                      {course.authorId?.name?.[0] || 'T'}
                    </div>
                    <span className="text-xs font-bold">{course.authorId?.name || 'Unknown Tutor'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Users size={14} className="text-amber-500/60" />
                    <span>{course.enrollmentCount || 0} learners</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Clock size={14} className="text-amber-500/60" />
                    <span>{formatDate(course.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:ml-auto xl:border-l xl:border-white/5 xl:pl-8">
                <button
                  type="button"
                  onClick={() => loadReviewDetails(course)}
                  className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-black transition-all"
                  data-tooltip="Review Course"
                >
                  <Eye size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleFeature(course._id)}
                  data-tooltip={course.featured ? 'Remove from Featured' : 'Feature this course'}
                  className={`p-3 rounded-2xl transition-all border ${
                    course.featured ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/5 text-white/20 border-white/10 hover:text-amber-400'
                  }`}
                >
                  <Star size={20} fill={course.featured ? 'currentColor' : 'none'} />
                </button>

                <a
                  href={`/learner-dashboard/catalogue/${course._id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-2xl bg-white/5 text-white/20 hover:text-white border border-white/10 hover:bg-white/10 transition-all"
                  data-tooltip="Preview Course"
                >
                  <PlayCircle size={20} />
                </a>

                {course.status === 'review_pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(course._id)}
                      disabled={actionLoading === `approve-${course._id}`}
                      className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                      data-tooltip="Approve & Publish"
                    >
                      {actionLoading === `approve-${course._id}` ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectCourse(course)}
                      className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                      data-tooltip="Reject with Feedback"
                    >
                      <XCircle size={20} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setFlagCourse(course)}
                  className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                  data-tooltip="Flag for Review"
                >
                  <Flag size={20} />
                </button>

                {course.status === 'suspended' ? (
                  <button
                    type="button"
                    onClick={() => handleUnsuspend(course._id)}
                    disabled={actionLoading === `unsuspend-${course._id}`}
                    className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                    data-tooltip="Unsuspend"
                  >
                    {actionLoading === `unsuspend-${course._id}` ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  </button>
                ) : course.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => setShowSuspendModal(course._id)}
                    className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                    data-tooltip="Suspend Course"
                  >
                    <XCircle size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-24 text-center glass-card rounded-[48px] border border-white/5 bg-white/2">
            <div className="w-20 h-20 rounded-3xl bg-white/5 text-white/10 flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Shield size={40} />
            </div>
            <p className="text-white/20 font-black text-xl uppercase tracking-widest">No courses found</p>
            <p className="text-white/10 text-sm mt-2">Adjust the status, category, or search filters.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {reviewCourse && (
          <div className="fixed inset-0 z-[240] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-[36px] p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10 relative"
            >
              <button
                type="button"
                onClick={() => setReviewCourse(null)}
                className="absolute top-7 right-7 p-2 text-white/30 hover:text-white transition-colors"
              >
                <X size={26} />
              </button>

              <div className="pr-12 mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400 mb-2">Full Course Review</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{reviewCourse.title}</h3>
                <p className="text-sm text-white/40 font-semibold mt-1">{reviewCourse.shortDescription || 'No short description provided.'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                {[
                  ['Status', labelize(reviewCourse.status)],
                  ['Tutor', reviewCourse.authorId?.name || 'Unknown Tutor'],
                  ['Category', reviewCourse.category || 'N/A'],
                  ['Level', reviewCourse.level || 'N/A'],
                  ['Created', formatDate(reviewCourse.createdAt)]
                ].map(([label, value]) => (
                  <div key={label} className="glass-panel rounded-2xl border border-white/5 p-4">
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-white text-sm font-bold capitalize truncate">{value}</p>
                  </div>
                ))}
              </div>

              {reviewCourse.flaggedForReview && (
                <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4">
                  <p className="text-blue-300 text-xs font-black uppercase tracking-widest mb-1">Flagged for periodic review</p>
                  <p className="text-white/60 text-sm">{reviewCourse.flagReviewReason || 'No reason provided'}</p>
                </div>
              )}

              {reviewLoading ? (
                <div className="py-24 flex items-center justify-center text-white/30">
                  <Loader2 size={30} className="animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <section className="xl:col-span-2 glass-panel rounded-[28px] border border-white/5 p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <Layers size={20} className="text-amber-400" />
                      <h4 className="text-white font-black">Modules, Lessons, and Videos</h4>
                    </div>

                    <div className="space-y-4">
                      {curriculum.length > 0 ? curriculum.map((module, moduleIndex) => (
                        <div key={module.id || module._id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <p className="text-white font-black">{moduleIndex + 1}. {module.title}</p>
                              <p className="text-xs text-white/35 mt-1">{module.description || 'No module description'}</p>
                            </div>
                            <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">{module.lessons?.length || 0} lessons</span>
                          </div>

                          <div className="space-y-2">
                            {(module.lessons || []).map((lesson, lessonIndex) => (
                              <div key={lesson.id || lesson._id} className="rounded-xl bg-black/10 border border-white/5 p-3 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="text-sm text-white font-bold truncate">{moduleIndex + 1}.{lessonIndex + 1} {lesson.title}</p>
                                  <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                                    {lesson.type} - {lesson.durationFormatted || lesson.duration || 'No duration'} - {lesson.isPublished ? 'published' : 'hidden'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {lesson.videoUrl || lesson.hlsUrl ? (
                                    <a
                                      href={lesson.videoUrl || lesson.hlsUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      title="Open video"
                                    >
                                      <Video size={16} />
                                    </a>
                                  ) : (
                                    <span className="p-2 rounded-xl bg-white/5 text-white/15 border border-white/5">
                                      <Video size={16} />
                                    </span>
                                  )}
                                  <span className="text-[10px] text-white/30 font-bold capitalize">{lesson.videoStatus || 'no video'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )) : (
                        <div className="py-16 text-center">
                          <BookOpen size={34} className="text-white/10 mx-auto mb-3" />
                          <p className="text-sm text-white/30 font-bold">No modules or lessons found.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="glass-panel rounded-[28px] border border-white/5 p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <History size={20} className="text-blue-400" />
                      <h4 className="text-white font-black">Course History</h4>
                    </div>

                    <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                      {history.length > 0 ? history.map((item) => (
                        <div key={item._id || `${item.action}-${item.createdAt}`} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                          <p className="text-sm text-white font-black capitalize">{labelize(item.action)}</p>
                          <p className="text-[10px] text-white/25 font-black uppercase tracking-widest mt-1">{formatDate(item.createdAt)}</p>
                          {(item.metadata?.feedback || item.metadata?.reason) && (
                            <p className="text-xs text-white/45 mt-2">{item.metadata.feedback || item.metadata.reason}</p>
                          )}
                        </div>
                      )) : (
                        <div className="py-16 text-center">
                          <FileText size={34} className="text-white/10 mx-auto mb-3" />
                          <p className="text-sm text-white/30 font-bold">No review history found.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFlagCourse(reviewCourse)}
                  className="px-6 py-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-widest"
                >
                  Flag Review
                </button>
                {reviewCourse.status === 'review_pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectCourse(reviewCourse)}
                      className="px-6 py-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all text-xs font-black uppercase tracking-widest"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(reviewCourse._id)}
                      className="px-6 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all text-xs font-black uppercase tracking-widest"
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectCourse && (
          <DecisionModal
            title="Reject Course"
            description="The tutor will be notified with this feedback and can resubmit after changes."
            value={rejectFeedback}
            setValue={setRejectFeedback}
            placeholder="Explain what must be fixed before approval..."
            actionLabel={actionLoading === `reject-${rejectCourse._id}` ? 'Rejecting...' : 'Reject Course'}
            tone="rose"
            onCancel={() => {
              setRejectCourse(null);
              setRejectFeedback('');
            }}
            onConfirm={handleReject}
            disabled={!rejectFeedback.trim() || actionLoading === `reject-${rejectCourse._id}`}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flagCourse && (
          <DecisionModal
            title="Flag for Periodic Review"
            description="Mark this course for future reassessment without taking it offline."
            value={flagReason}
            setValue={setFlagReason}
            placeholder="Reason for periodic reassessment..."
            actionLabel={actionLoading === `flag-${flagCourse._id}` ? 'Flagging...' : 'Flag Course'}
            tone="blue"
            onCancel={() => {
              setFlagCourse(null);
              setFlagReason('');
            }}
            onConfirm={handleFlag}
            disabled={!flagReason.trim() || actionLoading === `flag-${flagCourse._id}`}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuspendModal && (
          <DecisionModal
            title="Suspend Course"
            description="This will take the course offline until an administrator restores it."
            value={suspendReason}
            setValue={setSuspendReason}
            placeholder="Specify policy violation or quality issue..."
            actionLabel={actionLoading === `suspend-${showSuspendModal}` ? 'Suspending...' : 'Suspend'}
            tone="rose"
            icon={AlertTriangle}
            onCancel={() => {
              setShowSuspendModal(null);
              setSuspendReason('');
            }}
            onConfirm={handleSuspend}
            disabled={!suspendReason.trim() || actionLoading === `suspend-${showSuspendModal}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DecisionModal({
  title,
  description,
  value,
  setValue,
  placeholder,
  actionLabel,
  tone,
  icon: Icon = XCircle,
  onCancel,
  onConfirm,
  disabled
}) {
  const toneClass = tone === 'blue'
    ? 'border-blue-500/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
    : 'border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20';

  return (
    <div className="fixed inset-0 z-[260] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-card rounded-[32px] p-7 w-full max-w-lg border border-white/10 relative overflow-hidden"
      >
        <div className="absolute top-6 right-6 text-white/5">
          <Icon size={72} />
        </div>
        <h3 className="text-2xl font-bold text-white tracking-tight mb-2">{title}</h3>
        <p className="text-sm text-white/40 mb-5">{description}</p>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={`px-5 py-3 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 ${toneClass}`}
          >
            {actionLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
