import React, { useState, useEffect, useRef } from 'react';
import greenLogo from '../assets/green-logo.png';
import { useAuth } from '../context/useAuth';
import { useSearch } from '../context/SearchContext';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import {
  LogOut, User as UserIcon, BookOpen, Users, Clock,
  LayoutDashboard, BarChart3, DollarSign,   MessageSquare, MessagesSquare,
  Settings, Search, Bell, Star, MoreVertical, Play,
  ChevronDown, ExternalLink, GraduationCap, TrendingUp,
  CheckCheck, CalendarPlus, CalendarClock,
  Info, CheckCircle, AlertTriangle, AlertCircle, ClipboardList, Building, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/shared/ThemeToggle';
import toast from 'react-hot-toast';
import apiClient from '../services/api';

export default function TutorLayout() {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery, placeholder } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();

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
              } max-w-md w-full glass-panel border border-purple-500/20 shadow-2xl p-5 rounded-2xl pointer-events-auto flex items-start gap-3 backdrop-blur-md`}
              style={{ background: 'rgba(15, 23, 42, 0.9)' }}
            >
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <Bell size={20} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 leading-none mb-1.5">{newNotif.title}</h4>
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

  useEffect(() => {
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
        console.log('[SSE DISCONNECT] TutorLayout connection closed.');
      }
      document.removeEventListener('visibilitychange', handleVisibilitySync);
    };
  }, [user]);

  useEffect(() => {
    // Guard: prevent individual tutors from accessing attendance page
    if (user && user.accountType === 'individual_tutor' && location.pathname === '/tutor-dashboard/attendance') {
      navigate('/tutor-dashboard', { replace: true });
    }
  }, [user, navigate, location.pathname]);

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
        return <Play size={16} className="text-purple-400" />;
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
    if (meta.ticketId) {
      navigate(`/tutor-dashboard/support/${meta.ticketId}`);
    } else if (notif.type === 'submission') {
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
    
    // For 24 hours or older: display absolute date (e.g. "May 21")
    const options = { month: 'short', day: 'numeric' };
    if (now.getFullYear() !== date.getFullYear()) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString('en-US', options);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/tutor-dashboard' },
    { name: 'My Courses', icon: BookOpen, path: '/tutor-dashboard/courses' },
    { name: 'Grade Centre', icon: GraduationCap, path: '/tutor-dashboard/grade-centre' },
    { name: 'Discussions', icon: MessagesSquare, path: '/tutor-dashboard/discussions' },
    { name: 'Schedule Live Class', icon: CalendarPlus, path: '/tutor-dashboard/live-sessions/schedule' },
    { name: 'Manage Sessions', icon: CalendarClock, path: '/tutor-dashboard/live-sessions/manage' },
    ...(user && user.accountType !== 'individual_tutor' ? [
      { name: 'Attendance', icon: ClipboardList, path: '/tutor-dashboard/attendance' }
    ] : []),
    { name: 'Students', icon: Users, path: '/tutor-dashboard/students' },
    { name: 'Analytics', icon: BarChart3, path: '/tutor-dashboard/analytics' },
    { name: 'Earnings', icon: DollarSign, path: '/tutor-dashboard/earnings' },
    { name: 'Reviews', icon: Star, path: '/tutor-dashboard/reviews' },
    { name: 'Messages', icon: MessageSquare, path: '/tutor-dashboard/messages' },
    { name: 'Support', icon: HelpCircle, path: '/tutor-dashboard/support' },

    { name: 'Settings', icon: Settings, path: '/tutor-dashboard/settings' },
  ];

  const activeTab = (() => {
    if (location.pathname.startsWith('/tutor-dashboard/discussions')) {
      return 'Discussions';
    }
    return navItems.find((item) => item.path === location.pathname)?.name || 'Dashboard';
  })();

  return (
    <div className="theme-tutor dashboard-container mesh-bg flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 glass-panel border-r border-white/5 flex flex-col h-full sticky top-0 z-50">
        <Link to="/" className="p-6 flex items-center gap-4 mb-0 group cursor-pointer">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg border border-white/5 group-hover:border-purple-500/30 transition-all flex-shrink-0">
            <img
              src={greenLogo}
              alt="EduCore"
              className="w-14 h-14 object-contain"
            />
          </div>

          <div className="flex flex-col">
            <h1 className="text-[30px] font-bold mt-2 text-white tracking-tight font-elmessiri uppercase leading-none">EduCore</h1>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em] leading-tight opacity-60 mt-1">
              Online Learning Platform
            </p>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 mb-1 group ${activeTab === item.name
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
            >
              <item.icon size={20} className={activeTab === item.name ? 'text-purple-400' : 'group-hover:text-white transition-colors'} />
              <span className="text-sm font-medium tracking-wide">{item.name}</span>
              {activeTab === item.name && (
                <motion.div
                  layoutId="activePill"
                  className="ml-auto w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_10px_#a855f7]"
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-4">


          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-bold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-20 glass-panel border-b border-white/5 px-8 flex items-center justify-between z-40">
          {location.pathname === '/tutor-dashboard' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">
                  Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{user?.name?.split(' ')[0] || 'Tutor'}</span>
                </h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Let's inspire and empower more learners today!</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/grade-centre' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Grade Centre</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Review student scripts and submissions</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/discussions' || location.pathname.startsWith('/tutor-dashboard/discussions/') ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <MessagesSquare size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Discussions</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Browse and respond to lesson Q&A across your courses</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/live-sessions/schedule' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <CalendarPlus size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Schedule Live Class</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Google Meet · Create a real-time class for an enrolled course</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/live-sessions/manage' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <CalendarClock size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Manage Sessions</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Live Classes · View and organize scheduled virtual sessions</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/attendance' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Attendance</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Mark student participation and export class performance logs</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/students' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Students</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Monitor your students' learning progress and course enrollments</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/analytics' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Course Analytics</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Track completion rates, drop-offs, and learner metrics across your courses</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/earnings' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <DollarSign size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Earnings</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Monitor your revenue and payout history</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/reviews' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <Star size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Reviews</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Hear what your students have to say about your courses</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/messages' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Messages</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Direct communication with your students</p>
              </div>
            </div>
          ) : location.pathname.startsWith('/tutor-dashboard/support') ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <HelpCircle size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Help & Support</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Manage your service requests and technical support tickets.</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/settings' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">Settings</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Customize your tutor experience and account preferences</p>
              </div>
            </div>
          ) : location.pathname === '/tutor-dashboard/courses' ? (
            <div className="flex-1 max-w-xl relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/20 transition-all"
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-6 ml-8">
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
                  showNotifications ? 'text-purple-400 border-purple-500/30 bg-purple-500/5' : 'text-white/40 hover:text-white hover:bg-white/5 border-white/10'
                }`}
              >
                <Bell size={20} className={unreadCount > 0 ? 'animate-[swing_1.5s_ease-in-out_infinite]' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-purple-500 text-[10px] text-white font-black flex items-center justify-center rounded-full border-2 border-[#020617] ring-1 ring-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-pulse">
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
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            <CheckCheck size={12} className="text-purple-400" />
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
                                    <h4 className={`text-xs font-bold text-white leading-tight truncate pr-2 ${notif.isRead ? '' : 'text-purple-400 font-black'}`}>
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
                                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0 shadow-[0_0_8px_#a855f7] animate-pulse" />
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-white/5 pt-3.5 mt-2.5 flex justify-center">
                        <Link 
                          to="/tutor-dashboard/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-bold text-purple-400 hover:text-purple-300 hover:underline transition-colors py-1 px-4 cursor-pointer"
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
            <Link to="/profile" className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                  {user ? user.name : 'Guest User'}
                </p>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                  {user ? user.role : 'Public View'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/20 overflow-hidden">
                {user?.profile?.avatarUrl ? (
                  <img src={user.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-white" />
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
