import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { useSearch } from '../context/SearchContext';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LogOut, LogIn, LayoutDashboard, Search, Book, 
  ClipboardList, StickyNote, Award, Settings, 
  Bell, ChevronDown, Menu, X, Heart, CheckCheck, CalendarDays, Receipt,
  Info, CheckCircle, AlertTriangle, AlertCircle, Play, BookOpen, Users, GraduationCap, Building, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../services/api';
import ThemeToggle from '../components/shared/ThemeToggle';
import { resolvePlayerLesson } from '../utils/coursePlayer';

export default function LearnerLayout() {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery, placeholder } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Block non-learners from accessing learner private routes
  React.useEffect(() => {
    if (user && user.role !== 'learner') {
      const isPublicPath = location.pathname === '/learner-dashboard/catalogue' || 
                           location.pathname.startsWith('/learner-dashboard/catalogue/');
      const isPlayerPath = location.pathname.startsWith('/learner-dashboard/player/');
      if (!isPublicPath && !isPlayerPath) {
        const target = user.role === 'tutor' 
          ? '/tutor-dashboard' 
          : (['platform_admin', 'super_admin', 'platform_owner'].includes(user.role) ? '/platform-admin' : '/ins-admin');
        navigate(target, { replace: true });
      }
    }


  }, [user, navigate, location.pathname]);

  const [wishlistCount, setWishlistCount] = useState(0);

  React.useEffect(() => {
    const fetchWishlistCount = async () => {
      if (user) {
        try {
          const response = await apiClient.get('/wishlist');
          setWishlistCount(response.data.data.length);
        } catch (err) {
          console.error('Error fetching wishlist count:', err);
        }
      } else {
        setWishlistCount(0);
      }
    };
    
    fetchWishlistCount();
    
    const handleUpdate = () => fetchWishlistCount();
    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, [user]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});
  const lastEventIdRef = useRef('');
  const notificationRef = useRef(null);

  // Helper to establish real-time SSE stream connection
  const connectSSE = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const baseUrl = apiClient.defaults.baseURL || 'http://localhost:4000/api/v1';
    
    // Construct stream URL with JWT token and Last-Event-ID parameters for recovery syncs
    const sseUrl = `${baseUrl}/notifications/stream?token=${token}${
      lastEventIdRef.current ? `&lastEventId=${lastEventIdRef.current}` : ''
    }`;
    
    console.log('[SSE CONNECTION] Establishing notification channel stream:', sseUrl);
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        console.log('[SSE EVENT] Pushed live notification alert:', newNotif);
        
        setNotifications(prev => {
          // Double check to prevent duplicates during network sync catchups
          const exists = prev.some(n => (n._id === newNotif._id || n.id === newNotif.id));
          if (exists) return prev;
          return [newNotif, ...prev];
        });

        // Set Last-Event-ID baseline
        if (newNotif._id || newNotif.id) {
          lastEventIdRef.current = String(newNotif._id || newNotif.id);
        }

        // Trigger slide-in alert notification toast
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full glass-panel border border-blue-500/20 shadow-2xl p-5 rounded-2xl pointer-events-auto flex items-start gap-3 backdrop-blur-md`}
              style={{ background: 'rgba(15, 23, 42, 0.9)' }}
            >
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                <Bell size={20} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 leading-none mb-1.5">{newNotif.title}</h4>
                <p className="text-xs text-white/80 leading-relaxed font-medium">{newNotif.message}</p>
              </div>
            </div>
          ),
          { duration: 5000, position: 'bottom-right' }
        );
      } catch (err) {
        console.error('[SSE EVENT ERROR] Failed parsing payload:', err);
      }
    };

    // Keep active client tabs read state synchronized
    eventSource.addEventListener('state_sync', (event) => {
      try {
        const sync = JSON.parse(event.data);
        console.log('[SSE STATE SYNC] Pushed tab sync command:', sync);
        if (sync.type === 'read') {
          setNotifications(prev => prev.map(n => 
            (n.id === sync.id || n._id === sync.id) ? { ...n, isRead: true } : n
          ));
        } else if (sync.type === 'read_all') {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
      } catch (err) {
        console.error('[SSE SYNC ERROR] Failed to parse cross-tab sync:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('[SSE CONNECTION ERROR] Notification channel disconnected. Re-establishing connection in background...');
      eventSource.close();
    };

    return eventSource;
  };

  React.useEffect(() => {
    if (!user) return;

    let activeES = null;
    let isMounted = true;

    // Define handleVisibilitySync inside useEffect scope so cleanup has access to it
    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        console.log('[SSE RESUME] Tab focused. Syncing stream to catch up on any missed notifications...');
        if (activeES) activeES.close();
        activeES = connectSSE();
      }
    };

    // 1. Fetch initial notification log history (Reconciliation baseline)
    const initHistory = async () => {
      try {
        const res = await apiClient.get('/notifications');
        const list = res.data.data || [];
        if (isMounted) {
          setNotifications(list);
          
          // Seed Last-Event-ID reference with newest item ID
          if (list.length > 0) {
            lastEventIdRef.current = String(list[0]._id || list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to sync history baseline:', err);
      }
    };

    initHistory().then(() => {
      if (isMounted) {
        // 2. Open Server-Sent Events push channel
        activeES = connectSSE();
        
        // 3. Tab focused visibility resume handler to sync any missed events instantly!
        document.addEventListener('visibilitychange', handleVisibilitySync);
      }
    });

    return () => {
      isMounted = false;
      if (activeES) {
        activeES.close();
        console.log('[SSE DISCONNECT] LearnerLayout connection closed.');
      }
      document.removeEventListener('visibilitychange', handleVisibilitySync);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      const list = res.data.data || [];
      setNotifications(list);
      if (list.length > 0) {
        lastEventIdRef.current = String(list[0]._id || list[0].id);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-emerald-400" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      case 'video_ready':
        return <Play size={16} className="text-blue-400" />;
      case 'course':
        return <BookOpen size={16} className="text-indigo-400" />;
      case 'enrollment':
        return <Users size={16} className="text-cyan-400" />;
      case 'submission':
        return <ClipboardList size={16} className="text-purple-400" />;
      case 'grade':
        return <GraduationCap size={16} className="text-emerald-400" />;
      default:
        return <Info size={16} className="text-white/40" />;
    }
  };

  const handleNotificationClick = async (notif) => {
    const notifId = notif._id || notif.id;
    if (!notif.isRead) {
      await handleMarkAsRead(notifId);
    }
    setExpandedIds(prev => ({ ...prev, [notifId]: !prev[notifId] }));
    
    // Navigate based on type & metadata
    const meta = notif.metadata || {};
    const title = notif.title || '';

    if (meta.ticketId) {
      navigate(`/learner-dashboard/support/${meta.ticketId}`);
    } else if (notif.type === 'grade' || notif.type === 'quiz') {
      // Quiz/grade result → Assignments page
      navigate('/learner-dashboard/assignments');

    } else if (notif.type === 'live_session' || title.includes('Live Class') || meta.sessionId || meta.eventType?.startsWith('LIVE_CLASS')) {
      // Live class notification → Live Sessions
      if (meta.sessionId) {
        navigate(`/learner-dashboard/live-sessions/${meta.sessionId}`);
      } else {
        navigate('/learner-dashboard/live-sessions');
      }

    } else if (meta.courseId) {
      // Notifications about a new published course or system-level course events
      // should go to the catalogue/detail page (learner may not be enrolled yet).
      const isCatalogueNotif =
        notif.type === 'system' ||
        title === 'New Course Sale!' ||
        title === 'New Course Published' ||
        title === 'Course Published' ||
        (notif.type === 'course' && title !== 'Enrollment Confirmed!');

      if (isCatalogueNotif) {
        navigate(`/learner-dashboard/catalogue/${meta.courseId}`);
      } else {
        // Course-content update (new lesson, module, video, enrollment confirmed)
        // → open player at the learner's current progress position
        resolvePlayerLesson(meta.courseId)
          .then((lessonId) => {
            if (lessonId) {
              navigate(`/learner-dashboard/player/${meta.courseId}/${lessonId}`);
            } else {
              navigate(`/learner-dashboard/catalogue/${meta.courseId}`);
            }
          })
          .catch(() => navigate(`/learner-dashboard/catalogue/${meta.courseId}`));
      }
    }
    setShowNotifications(false);
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
    return date.toLocaleDateString();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Automatically redirect to Catalogue page if searching from another page
    if (location.pathname !== '/learner-dashboard/catalogue') {
      navigate('/learner-dashboard/catalogue');
    }
  };

  const navItems = [
    { id: 'Catalogue', icon: Search, label: 'Catalogue', path: '/learner-dashboard/catalogue' },
    { id: 'Overview', icon: LayoutDashboard, label: 'Overview', path: '/learner-dashboard', protected: true },
    { id: 'MyLearning', icon: Book, label: 'My Learning', path: '/learner-dashboard/learning', protected: true },
    { id: 'LiveSessions', icon: CalendarDays, label: 'Live Sessions', path: '/learner-dashboard/live-sessions', protected: true },
    { id: 'Assignments', icon: ClipboardList, label: 'Assignments', path: '/learner-dashboard/assignments', protected: true },
    { id: 'Notes', icon: StickyNote, label: 'My Notes', path: '/learner-dashboard/notes', protected: true },
    { id: 'Certificates', icon: Award, label: 'Certificates', path: '/learner-dashboard/certificates', protected: true },

    { id: 'PaymentHistory', icon: Receipt, label: 'Payments', path: '/learner-dashboard/payment-history', protected: true },
    { id: 'Settings', icon: Settings, label: 'Settings', path: '/learner-dashboard/settings', protected: true },
    { id: 'Support', icon: HelpCircle, label: 'Help & Support', path: '/learner-dashboard/support', protected: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.protected || user);
  const activeTab = navItems.find(item => item.path === location.pathname)?.id || 'Overview';

  return (
    <div className="theme-learner dashboard-container mesh-bg flex h-screen overflow-hidden">
      {/* Background Blobs */}
      <div className="glow-blob bg-blue-600 w-[600px] h-[600px] -top-20 -left-20 opacity-10"></div>
      <div className="glow-blob bg-cyan-600 w-[500px] h-[500px] bottom-0 right-0 opacity-10"></div>

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={`${
          isSidebarOpen ? 'w-72' : 'w-24'
        } glass-panel border-r border-white/5 flex flex-col h-full transition-all duration-500 relative z-50`}
      >
        {/* Logo Section */}
        <Link to="/" className="p-6 flex items-center gap-4 mb-0 group cursor-pointer">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg border border-white/5 group-hover:border-blue-500/30 transition-all flex-shrink-0">
            <img 
              src="/src/assets/green-logo.png" 
              alt="EduCore" 
              className="w-14 h-14 object-contain"
            />
          </div>
          
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <h1 className="text-[30px] font-bold mt-2 text-white tracking-tight font-elmessiri uppercase leading-none">EduCore</h1>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] leading-tight opacity-60 mt-1">
                  Online Learning Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-2 mt-8 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'text-blue-400' : 'group-hover:text-white transition-colors'} />
              {isSidebarOpen && (
                <span className="text-sm font-bold tracking-wide">{item.label}</span>
              )}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" 
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 mt-auto">
          {user ? (
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all`}
            >
              <LogOut size={22} />
              {isSidebarOpen && <span className="text-sm font-bold">Log Out</span>}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/5 transition-all`}
            >
              <LogIn size={22} />
              {isSidebarOpen && <span className="text-sm font-bold">Log In</span>}
            </button>
          )}
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-4 border-[#020617] text-white hover:scale-110 transition-transform shadow-lg shadow-blue-600/40"
        >
          {isSidebarOpen ? <X size={12} /> : <Menu size={12} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="h-20 glass-panel border-b border-white/5 px-8 flex items-center justify-between z-40">
          {location.pathname !== '/learner-dashboard/payment-history' ? (
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-2.5 w-full max-w-md group focus-within:border-blue-500/50 transition-all">
              <Search className="text-white/20 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder={placeholder}
                value={searchQuery}
                onChange={handleSearchChange}
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-white/20"
              />
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/learner-dashboard/wishlist')}
              className="relative p-2.5 text-white/40 hover:text-white transition-colors group"
            >
              <Heart size={22} className="group-hover:fill-red-500 group-hover:text-red-500 transition-all" />
              {wishlistCount > 0 && (
                <span className="absolute top-1.5 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#020617] text-[9px] font-black text-white flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  const nextShow = !showNotifications;
                  setShowNotifications(nextShow);
                  if (nextShow) {
                    fetchNotifications();
                  }
                }}
                className={`relative p-2.5 glass-panel rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                  showNotifications ? 'text-blue-400 border-blue-500/30 bg-blue-500/5' : 'text-white/40 hover:text-white hover:bg-white/5 border-white/10'
                }`}
              >
                <Bell size={20} className={unreadCount > 0 ? 'animate-[swing_1.5s_ease-in-out_infinite]' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-500 text-[10px] text-white font-black flex items-center justify-center rounded-full border-2 border-[#020617] ring-1 ring-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute right-0 mt-3 w-80 glass-panel notification-dropdown border border-white/10 rounded-[24px] shadow-2xl p-5 z-50 flex flex-col max-h-[420px] overflow-hidden"
                    >
                      <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-wide font-outfit uppercase">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            <CheckCheck size={12} className="text-blue-400" />
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 max-h-[300px]">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center text-white/30 text-xs flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 text-white/20">
                              <Bell size={20} />
                            </div>
                            <span className="font-medium tracking-wide">All caught up! No notifications.</span>
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((notif) => {
                            const notifId = notif._id || notif.id;
                            const isExpanded = !!expandedIds[notifId];

                            return (
                              <motion.div 
                                layout
                                key={notifId}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex gap-3 relative overflow-hidden group hover:scale-[1.01] duration-200 ${
                                  notif.isRead 
                                    ? 'notification-item-read' 
                                    : 'notification-item-unread'
                                }`}
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {getNotificationIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className={`text-xs font-bold text-white leading-tight truncate pr-2 ${notif.isRead ? '' : 'text-blue-400 font-black'}`}>
                                      {notif.title}
                                    </h4>
                                    <span className="text-[9px] text-white/30 font-semibold tracking-wide whitespace-nowrap flex-shrink-0 mt-0.5">
                                      {formatRelativeTime(notif.createdAt)}
                                    </span>
                                  </div>
                                  <p className={`text-xs text-white/60 mt-1 leading-relaxed break-words ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {notif.message}
                                  </p>
                                </div>
                                {!notif.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 shadow-[0_0_8px_#3b82f6] animate-pulse" />
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-white/5 pt-3.5 mt-2.5 flex justify-center">
                        <Link 
                          to="/learner-dashboard/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors py-1 px-4 cursor-pointer"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <ThemeToggle />
            <div className="h-8 w-[1px] bg-white/5" />
            <div 
              onClick={() => user ? navigate('/profile') : navigate('/login')} 
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  {user ? user.name : 'Guest User'}
                </p>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                  {user ? user.role : 'Public View'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-[1px]">
                 <div className="w-full h-full rounded-[15px] bg-[#020617] flex items-center justify-center overflow-hidden">
                    {user?.profile?.avatarUrl ? (
                      <img src={user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-blue-400">
                        {user ? user.name?.[0] : '?'}
                      </span>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 h-full">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
