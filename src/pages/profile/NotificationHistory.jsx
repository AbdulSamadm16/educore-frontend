import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Bell, CheckCheck, Search, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, AlertCircle, Play, BookOpen, Users, 
  ClipboardList, GraduationCap, Info 
} from 'lucide-react';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';
import { resolvePlayerLesson } from '../../utils/coursePlayer';

export default function NotificationHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState({});
  const [error, setError] = useState(null);
  const [unreadTotalCount, setUnreadTotalCount] = useState(0);

  // Fetch notifications based on query/filter
  const fetchNotifications = async (page = 1, currentFilter = filter, searchVal = searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10
      };

      if (currentFilter === 'unread') {
        params.unread = true;
      }

      if (searchVal.trim() !== '') {
        params.search = searchVal.trim();
      }

      // Backend GET /notifications supports page & limit parameters
      const response = await apiClient.get('/notifications', { params });
      
      const responseData = response.data.data;
      if (responseData && responseData.notifications) {
        setNotifications(responseData.notifications);
        setPagination(responseData.pagination || { page, limit: 10, total: responseData.notifications.length, pages: 1 });
      } else if (Array.isArray(responseData)) {
        // Fallback for simple list envelope
        setNotifications(responseData);
        setPagination({ page: 1, limit: 10, total: responseData.length, pages: 1 });
      } else {
        setNotifications([]);
        setPagination({ page: 1, limit: 10, total: 0, pages: 1 });
      }

      // Fetch global unread count
      const unreadResponse = await apiClient.get('/notifications', {
        params: { page: 1, limit: 1, unread: true }
      });
      const unreadData = unreadResponse.data.data;
      if (unreadData && unreadData.pagination) {
        setUnreadTotalCount(unreadData.pagination.total);
      } else if (Array.isArray(unreadData)) {
        setUnreadTotalCount(unreadData.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to load notifications history:', err);
      setError('Failed to fetch notification history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchNotifications(1, filter, searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [filter, searchTerm]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchNotifications(newPage, filter, searchTerm);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, isRead: true } : n));
      setUnreadTotalCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadTotalCount(0);
      if (filter === 'unread') {
        setNotifications([]);
        setPagination(prev => ({ ...prev, total: 0, pages: 1 }));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    const notifId = notif._id || notif.id;
    if (!notif.isRead) {
      await handleMarkAsRead(notifId);
    }
    setExpandedIds(prev => ({ ...prev, [notifId]: !prev[notifId] }));
    
    // Navigate based on type & metadata & user role
    const meta = notif.metadata || {};
    const role = user?.role;

    if (role === 'learner') {
      if (notif.type === 'grade') {
        navigate('/learner-dashboard/assignments');
      } else if (meta.courseId) {
        if (meta.lessonId) {
          navigate(`/learner-dashboard/player/${meta.courseId}/${meta.lessonId}`);
        } else {
          // Dynamically resolve target lesson for player navigation
          resolvePlayerLesson(meta.courseId)
            .then((lessonId) => {
              if (lessonId) {
                navigate(`/learner-dashboard/player/${meta.courseId}/${lessonId}`);
              } else {
                navigate(`/learner-dashboard/catalogue/${meta.courseId}`);
              }
            })
            .catch((err) => {
              console.error('Failed to resolve target player lesson:', err);
              navigate(`/learner-dashboard/catalogue/${meta.courseId}`);
            });
        }
      } else if (notif.type === 'live_session' || notif.title?.includes('Live Class') || meta.sessionId || meta.eventType?.startsWith('LIVE_CLASS')) {
        if (meta.sessionId) {
          navigate(`/learner-dashboard/live-sessions/${meta.sessionId}`);
        } else {
          navigate('/learner-dashboard/live-sessions');
        }
      }
    } else if (role === 'tutor') {
      if (notif.type === 'submission') {
        navigate('/tutor-dashboard/grade-centre');
      } else if (notif.type === 'success' || notif.title === 'New Course Sale!' || notif.title?.includes('Sale')) {
        navigate('/tutor-dashboard/earnings');
      } else if (notif.title?.includes('Live Class') || meta.eventType?.startsWith('LIVE_CLASS')) {
        navigate('/tutor-dashboard/live-sessions/manage');
      } else if (notif.type === 'discussion' && meta.courseId && meta.lessonId) {
        navigate(`/tutor-dashboard/discussions/${meta.courseId}/${meta.lessonId}`);
      } else if (notif.type === 'discussion' && meta.courseId) {
        navigate('/tutor-dashboard/discussions');
      } else if (meta.courseId) {
        navigate(`/tutor-dashboard/courses/edit/${meta.courseId}`);
      }
    } else if (role === 'platform_owner') {
      if (notif.title === 'Course Submitted for Review' || notif.type === 'course' || notif.type === 'newLesson') {
        navigate('/platform-admin/courses');
      } else if (notif.title === 'New Tutor Registered!' || notif.title?.includes('Tutor') || notif.type === 'user') {
        navigate('/platform-admin/tutors');
      }
    } else if (role === 'admin' || role === 'super_admin') {
      if (notif.title === 'Course Submitted for Review' || notif.type === 'course' || notif.type === 'newLesson') {
        navigate('/ins-admin/courses');
      } else if (notif.title === 'New Tutor Registered!' || notif.title?.includes('Tutor') || notif.type === 'user') {
        navigate('/ins-admin/users');
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-emerald-400" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-400" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-400" />;
      case 'video_ready':
        return <Play size={18} className="text-blue-400" />;
      case 'course':
        return <BookOpen size={18} className="text-indigo-400" />;
      case 'enrollment':
        return <Users size={18} className="text-cyan-400" />;
      case 'submission':
        return <ClipboardList size={18} className="text-purple-400" />;
      case 'grade':
        return <GraduationCap size={18} className="text-emerald-400" />;
      default:
        return <Info size={18} className="text-white/40" />;
    }
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
  };

  // Get dynamic colors based on user role
  const getRoleTheme = (role) => {
    switch (role) {
      case 'learner':
        return {
          text: 'text-blue-400',
          bg: 'bg-blue-500',
          bgGlow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]',
          border: 'border-blue-500/20 focus:border-blue-500/50',
          bgSoft: 'bg-blue-500/10',
          hoverSoft: 'hover:bg-blue-500/5',
          themeClass: 'theme-learner'
        };
      case 'tutor':
        return {
          text: 'text-purple-400',
          bg: 'bg-purple-500',
          bgGlow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]',
          border: 'border-purple-500/20 focus:border-purple-500/50',
          bgSoft: 'bg-purple-500/10',
          hoverSoft: 'hover:bg-purple-500/5',
          themeClass: 'theme-tutor'
        };
      case 'platform_owner':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500',
          bgGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]',
          border: 'border-amber-500/20 focus:border-amber-500/50',
          bgSoft: 'bg-amber-500/10',
          hoverSoft: 'hover:bg-amber-500/5',
          themeClass: 'theme-platform'
        };
      default:
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500',
          bgGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]',
          border: 'border-emerald-500/20 focus:border-emerald-500/50',
          bgSoft: 'bg-emerald-500/10',
          hoverSoft: 'hover:bg-emerald-500/5',
          themeClass: 'theme-admin'
        };
    }
  };

  const theme = getRoleTheme(user?.role);

  // Apply frontend search and filter states
  const filteredNotifications = notifications;

  return (
    <div className="w-full relative z-10 min-h-[70vh] flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 hover:text-slate-950 dark:text-white/70 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold transition-all mb-4 group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
            Notification <span className={theme.text}>History</span>
          </h1>
          <p className="text-slate-500 dark:text-white/40 text-sm font-medium">
            Browse and manage all notifications received on your account.
          </p>
        </div>

        {unreadTotalCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white transition-all cursor-pointer"
          >
            <CheckCheck size={16} className={theme.text} />
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 glass-panel border border-slate-200/60 dark:border-white/5 rounded-3xl">
        {/* Tabs */}
        <div className="flex bg-slate-100/80 dark:bg-white/5 p-1 rounded-2xl w-full sm:w-auto border border-slate-200/60 dark:border-none">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all' 
                ? `${theme.bg} text-white keep-white ${theme.bgGlow}` 
                : 'dark:text-white/55 dark:hover:text-white text-slate-500 hover:text-slate-800'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              filter === 'unread' 
                ? `${theme.bg} text-white keep-white ${theme.bgGlow}` 
                : 'dark:text-white/55 dark:hover:text-white text-slate-500 hover:text-slate-800'
            }`}
          >
            Unread
            {unreadTotalCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 ${theme.bg} text-[10px] text-white keep-white font-black flex items-center justify-center rounded-full border border-white dark:border-[#020617]`}>
                {unreadTotalCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-2.5 w-full sm:max-w-xs focus-within:border-slate-300 dark:focus-within:border-white/20 transition-all">
          <Search size={16} className="text-slate-400 dark:text-white/30" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 w-full"
          />
        </div>
      </div>

      {/* Notification List Container */}
      <div className="flex-1 min-h-[40vh] flex flex-col justify-between">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-slate-200/30 dark:border-white/5 rounded-full"></div>
              <div className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-spin border-l-transparent border-r-transparent ${theme.text}`}></div>
            </div>
            <p className="text-xs text-slate-400 dark:text-white/40 font-bold uppercase tracking-wider animate-pulse">Loading list...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle size={40} className="text-red-500 mb-4" />
            <p className="text-slate-800 dark:text-white font-bold mb-2">{error}</p>
            <button
              onClick={() => fetchNotifications(pagination.page)}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/10 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center glass-panel border border-slate-150 dark:border-white/5 rounded-[32px] gap-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center border border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/20">
              <Bell size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">No notifications found</h3>
              <p className="text-xs text-slate-400 dark:text-white/30 max-w-xs mx-auto leading-relaxed">
                {searchTerm.trim() !== '' 
                  ? "We couldn't find any notifications matching your search term."
                  : filter === 'unread'
                    ? "Congratulations! You have read all notifications."
                    : "No notification records are available in your account history yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((notif) => {
                const notifId = notif._id || notif.id;
                const isExpanded = !!expandedIds[notifId];

                return (
                  <motion.div
                    layout
                    key={notifId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-5 rounded-[24px] border text-left cursor-pointer flex items-start gap-4 relative overflow-hidden transition-all duration-300 group hover:-translate-y-0.5 dark:hover:bg-white/[0.02] hover:bg-slate-50/50 ${
                      notif.isRead 
                        ? 'bg-white/[0.01] border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.01)]' 
                        : `${theme.bgSoft} ${theme.border} ${theme.bgGlow}`
                    }`}
                  >
                    {/* Unread indicator glow */}
                    {!notif.isRead && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.bg}`} />
                    )}

                    <div className="flex-shrink-0 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5 group-hover:border-slate-300 dark:group-hover:border-white/10 transition-colors">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                        <h4 className={`text-sm font-bold text-slate-800 dark:text-white tracking-wide ${notif.isRead ? '' : `${theme.text} font-black`}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 dark:text-white/30 font-semibold tracking-wide whitespace-nowrap">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className={`text-xs text-slate-600 dark:text-white/60 leading-relaxed break-words font-medium ${isExpanded ? '' : 'line-clamp-2 sm:line-clamp-1'}`}>
                        {notif.message}
                      </p>
                    </div>

                    {!notif.isRead && (
                      <div className={`w-2 h-2 rounded-full ${theme.bg} mt-3.5 flex-shrink-0 animate-pulse`} />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && filteredNotifications.length > 0 && pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-8 p-4 glass-panel border border-slate-200/60 dark:border-white/5 rounded-3xl">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-white/70 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all ${
                pagination.page <= 1 
                  ? 'opacity-40 cursor-not-allowed' 
                  : 'hover:text-slate-900 dark:hover:text-white cursor-pointer'
              }`}
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span className="text-xs text-slate-500 dark:text-white/45 font-bold tracking-wide">
              Page <span className="text-slate-800 dark:text-white">{pagination.page}</span> of <span className="text-slate-800 dark:text-white">{pagination.pages}</span>
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-white/70 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all ${
                pagination.page >= pagination.pages 
                  ? 'opacity-40 cursor-not-allowed' 
                  : 'hover:text-slate-900 dark:hover:text-white cursor-pointer'
              }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
