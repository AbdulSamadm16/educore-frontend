import React, { useState, useEffect, useRef } from 'react';
import greenLogo from '../assets/green-logo.png';
import { useAuth } from '../context/useAuth';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LogOut, LayoutDashboard, Users, BookOpen, 
  CreditCard, FileBarChart, Terminal, Settings, 
  Bell, ClipboardList, DollarSign, ShieldAlert, Menu, X,
  Info, CheckCircle, AlertTriangle, AlertCircle, Play, GraduationCap, CheckCheck,
  Layers, Award, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../services/api';
import ThemeToggle from '../components/shared/ThemeToggle';

export default function InsAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
              } max-w-md w-full glass-panel border border-emerald-500/20 shadow-2xl p-5 rounded-2xl pointer-events-auto flex items-start gap-3 backdrop-blur-md`}
              style={{ background: 'rgba(15, 23, 42, 0.9)' }}
            >
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Bell size={20} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 leading-none mb-1.5">{newNotif.title}</h4>
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
        console.log('[SSE DISCONNECT] InsAdminLayout connection closed.');
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
        return <Play size={16} className="text-emerald-400" />;
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
      navigate(`/ins-admin/support/${meta.ticketId}`);
    } else if (notif.title === 'Course Submitted for Review' || notif.type === 'course' || notif.type === 'newLesson') {
      navigate('/ins-admin/courses');
    } else if (notif.title === 'New Tutor Registered!' || notif.title?.includes('Tutor') || notif.type === 'user') {
      navigate('/ins-admin/users');
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
    
    const options = { month: 'short', day: 'numeric' };
    if (now.getFullYear() !== date.getFullYear()) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString('en-US', options);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/ins-admin' },
    { name: 'Users', icon: Users, path: '/ins-admin/users' },
    { name: 'Batches', icon: Layers, path: '/ins-admin/batches' },
    { name: 'Attendance', icon: ClipboardList, path: '/ins-admin/attendance' },
    { name: 'Tutor Assignments', icon: GraduationCap, path: '/ins-admin/tutor-assignments' },
    { name: 'Courses', icon: BookOpen, path: '/ins-admin/courses' },
    { name: 'Bulk Enrollment', icon: ClipboardList, path: '/ins-admin/bulk-enrollment' },
    { name: 'Transactions', icon: CreditCard, path: '/ins-admin/transactions' },
    { name: 'Revenue', icon: DollarSign, path: '/ins-admin/revenue' },
    { name: 'Reports', icon: FileBarChart, path: '/ins-admin/reports' },
    { name: 'Certificates', icon: Award, path: '/ins-admin/certificates' },
    { name: 'Moderation', icon: ShieldAlert, path: '/ins-admin/discussion-moderation' },
    { name: 'System Logs', icon: Terminal, path: '/ins-admin/logs' },
    { name: 'Support', icon: HelpCircle, path: '/ins-admin/support' },
    { name: 'Settings', icon: Settings, path: '/ins-admin/settings' },
  ];

  const activeTab = navItems.find(item => item.path === location.pathname)?.name || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-0 md:p-4 lg:p-8 font-inter overflow-hidden">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 glass-panel border-r border-white/10 flex flex-col z-50 lg:hidden bg-slate-900"
            >
              <div className="p-5 flex items-center justify-between border-b border-white/5">
                <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                  <img src={greenLogo} alt="EduCore" className="w-10 h-10 object-contain" />
                  <span className="text-xl font-bold font-elmessiri text-white">EDUCORE</span>
                </Link>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-white/60 hover:text-white rounded-xl bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                      activeTab === item.name 
                      ? 'bg-emerald-500 text-white font-bold' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={20} className={activeTab === item.name ? 'text-white' : ''} />
                    <span className="text-xs font-bold uppercase tracking-wide">{item.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-white/5 mt-auto">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 bg-red-500/10 border border-red-500/20"
                >
                  <LogOut size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Glass Container */}
      <div className="w-full h-screen md:h-[90vh] glass-panel border border-white/5 rounded-none md:rounded-[40px] flex overflow-hidden relative shadow-2xl">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 border-r border-white/5 flex-col h-full bg-black/20">
          {/* Logo Section */}
          <div className="p-8 pb-12 flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
               <img src={greenLogo} alt="EduCore" className="w-14 h-14 object-contain" />
            </div>
            <div className="flex flex-col">
               <h2 className="text-[25px] font-black text-emerald-400 uppercase tracking-tighter leading-none font-elmessiri mb-1">EduCore</h2>
               <p className="text-[12px] text-white/30 font-bold uppercase tracking-widest leading-none font-elmessiri">LMS Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-300 group ${
                  activeTab === item.name 
                  ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} className={activeTab === item.name ? 'text-white' : 'group-hover:text-emerald-400 transition-colors'} />
                <span className="text-xs font-bold tracking-wide uppercase">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all group"
            >
              <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Logout</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/10">
          {/* Header */}
          <header className="h-16 md:h-20 px-4 md:px-10 flex items-center justify-between border-b border-white/5 gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-white/80 hover:text-white glass-panel rounded-xl flex items-center justify-center shrink-0"
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0 flex-1">
                {(() => {
                  if (location.pathname === '/ins-admin') {
                    return (
                      <>
                        <h1 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight truncate">Welcome back, Admin 👋</h1>
                        <p className="text-[10px] sm:text-xs text-white/30 font-medium uppercase tracking-widest hidden sm:block truncate">Here's what's happening on your platform today.</p>
                      </>
                    );
                  } else if (location.pathname === '/ins-admin/users') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        User <span className="text-emerald-400">Management</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-emerald-400/60 font-bold uppercase tracking-widest hidden sm:flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                        Manage users and permissions
                      </p>
                    </>
                  );
                } else if (location.pathname === '/ins-admin/attendance') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Attendance <span className="text-emerald-400">Tracking</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-emerald-400/60 font-bold uppercase tracking-widest hidden sm:flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                        Mark student participation and export class performance logs
                      </p>
                    </>
                  );
                } else if (location.pathname === '/ins-admin/courses') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Course <span className="text-emerald-400">Management</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-white/30 font-medium uppercase tracking-widest hidden sm:block truncate">
                        Audit, moderate, and feature educational courses across the global network.
                      </p>
                    </>
                  );
                } else if (location.pathname === '/ins-admin/bulk-enrollment') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Bulk <span className="text-emerald-400">Enrollment</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-white/30 font-medium uppercase tracking-widest hidden sm:block truncate">
                        Enroll learner batches into published courses.
                      </p>
                    </>
                  );
                } else if (location.pathname === '/ins-admin/logs') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Brevo <span className="text-emerald-400">System Logs</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-white/30 font-medium uppercase tracking-widest hidden sm:block truncate">
                        Monitor real-time mail invites, verification tokens, and dispatch states.
                      </p>
                    </>
                  );
                } else if (location.pathname === '/ins-admin/revenue') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Platform <span className="text-emerald-400">Revenue</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-emerald-400/60 font-bold uppercase tracking-widest hidden sm:flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                        Monitor platform financial performance
                      </p>
                    </>
                  );
                } else if (location.pathname === '/ins-admin/discussion-moderation') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Discussion <span className="text-emerald-400">Moderation</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-emerald-400/60 font-bold uppercase tracking-widest hidden sm:flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                        Audit reported posts and unban appeals
                      </p>
                    </>
                  );
                } else if (location.pathname === '/ins-admin/certificates') {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Institution <span className="text-emerald-400">Certificates</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-emerald-400/60 font-bold uppercase tracking-widest hidden sm:flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                        Manage institution-wide certificate templates
                      </p>
                    </>
                  );
                } else if (location.pathname.startsWith('/ins-admin/support')) {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">
                        Help & <span className="text-emerald-400">Support</span>
                      </h1>
                      <p className="text-[10px] sm:text-xs text-emerald-400/60 font-bold uppercase tracking-widest hidden sm:flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                        Manage institution support tickets
                      </p>
                    </>
                  );
                } else {
                  return (
                    <>
                      <h1 className="text-xs sm:text-base md:text-2xl font-black text-white tracking-tight truncate">{activeTab}</h1>
                      <p className="text-[10px] sm:text-xs text-white/30 font-medium uppercase tracking-widest hidden sm:block truncate">Institution Administration Panel</p>
                    </>
                  );
                }
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  const nextShow = !showNotifications;
                  setShowNotifications(nextShow);
                  if (nextShow) {
                    fetchNotifications();
                  }
                }}
                className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                  showNotifications ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : 'text-white/40 hover:text-white hover:bg-white/5 border-white/5 bg-white/5'
                }`}
              >
                <Bell size={20} className={unreadCount > 0 ? 'animate-[swing_1.5s_ease-in-out_infinite]' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-[10px] text-black font-black flex items-center justify-center rounded-full border-2 border-[#020617] ring-1 ring-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse">
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
                      className="fixed sm:absolute top-16 sm:top-auto left-4 right-4 sm:left-auto sm:right-0 mt-3 sm:mt-3 w-auto sm:w-80 glass-panel notification-dropdown border border-white/10 rounded-[24px] shadow-2xl p-4 sm:p-5 z-50 flex flex-col max-h-[420px] overflow-hidden animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-wide font-outfit uppercase">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:underline animate-fade-in"
                          >
                            <CheckCheck size={12} className="text-emerald-400" />
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
                                    <h4 className={`text-xs font-bold text-white leading-tight truncate pr-2 ${notif.isRead ? '' : 'text-emerald-400 font-black'}`}>
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
                                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0 shadow-[0_0_8px_#10b981] animate-pulse" />
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-white/5 pt-3.5 mt-2.5 flex justify-center">
                        <Link 
                          to="/ins-admin/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors py-1 px-4 cursor-pointer"
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
              <Link to="/profile" className="cursor-pointer group block">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/20 overflow-hidden group-hover:scale-105 group-hover:ring-emerald-400/40 transition-all duration-300">
                  {user?.profile?.avatarUrl ? (
                    <img src={user.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-black font-extrabold uppercase text-xs">{user?.name?.slice(0, 2) || 'AD'}</span>
                  )}
                </div>
              </Link>
            </div>
          </header>

          {/* Main Content View */}
          <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar">
             <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
