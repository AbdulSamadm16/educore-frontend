import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { useSearch } from '../context/SearchContext';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LogOut, LayoutDashboard, Users, UserCheck, GraduationCap, 
  BookOpen, Layers, ClipboardList, BarChart3, DollarSign, 
  Wallet, FileText, MessageSquare, Megaphone, Settings, 
  Monitor, Search, Bell, HelpCircle, ChevronDown, ExternalLink,
  Info, CheckCircle, AlertTriangle, AlertCircle, Play, CheckCheck, ShieldAlert, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../services/api';
import ThemeToggle from '../components/shared/ThemeToggle';

export default function PlatformAdminLayout() {
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
              } max-w-md w-full glass-panel border border-amber-500/20 shadow-2xl p-5 rounded-2xl pointer-events-auto flex items-start gap-3 backdrop-blur-md`}
              style={{ background: 'rgba(15, 23, 42, 0.9)' }}
            >
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <Bell size={20} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 leading-none mb-1.5">{newNotif.title}</h4>
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
        console.log('[SSE DISCONNECT] PlatformAdminLayout connection closed.');
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
        return <Play size={16} className="text-amber-400" />;
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
      navigate(`/platform-admin/support/${meta.ticketId}`);
    } else if (notif.title === 'Course Submitted for Review' || notif.type === 'course' || notif.type === 'newLesson') {
      navigate('/platform-admin/courses');
    } else if (notif.title === 'New Tutor Registered!' || notif.title?.includes('Tutor') || notif.type === 'user') {
      navigate('/platform-admin/tutors');
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
    { name: 'Dashboard', icon: LayoutDashboard, path: '/platform-admin' },
    { name: 'Users', icon: Users, path: '/platform-admin/users' },
    { name: 'Tutors', icon: UserCheck, path: '/platform-admin/tutors' },
    { name: 'Institutions', icon: GraduationCap, path: '/platform-admin/institutions' },
    { name: 'Courses', icon: BookOpen, path: '/platform-admin/courses' },
    { name: 'Categories', icon: Layers, path: '/platform-admin/categories' },
    { name: 'Enrollments', icon: ClipboardList, path: '/platform-admin/enrollments' },
    { name: 'Analytics', icon: BarChart3, path: '/platform-admin/analytics' },
    { name: 'Revenue', icon: Wallet, path: '/platform-admin/revenue' },
    { name: 'Refunds', icon: Wallet, path: '/platform-admin/refunds' },
    { name: 'Certificates', icon: Award, path: '/platform-admin/certificates' },
    { name: 'Reports', icon: FileText, path: '/platform-admin/reports' },
    { name: 'Support Tickets', icon: MessageSquare, path: '/platform-admin/support' },
    { name: 'Announcements', icon: Megaphone, path: '/platform-admin/announcements' },
    { name: 'Settings', icon: Settings, path: '/platform-admin/settings' },
    { name: 'System Logs', icon: Monitor, path: '/platform-admin/logs' },
  ];

  const activeTab = navItems.find(item => item.path === location.pathname)?.name || 'Dashboard';

  const getHeaderContent = () => {
    switch(activeTab) {
      case 'Dashboard':
        return {
          title: 'Platform Dashboard',
          subtitle: 'Here is what is happening on your platform today.'
        };
      case 'Users':
        return {
          title: 'User Management',
          subtitle: 'Manage platform learners, tutors, and administrators.'
        };
      case 'Tutors':
        return {
          title: 'Tutor Approvals',
          subtitle: 'Review and manage independent platform tutors.'
        };
      case 'Institutions':
        return {
          title: 'Institution Management',
          subtitle: 'Manage onboarded institutions and their administrative owners.'
        };
      case 'Courses':
        return {
          title: 'Course Catalog',
          subtitle: 'Monitor and review all published and pending courses.'
        };
      case 'Categories':
        return {
          title: 'Course Categories',
          subtitle: 'Organize the platform curriculum hierarchy.'
        };
      case 'Enrollments':
        return {
          title: 'Global Enrollments',
          subtitle: 'Track learner access and course subscriptions.'
        };
      case 'Analytics':
        return {
          title: 'Platform Analytics',
          subtitle: 'Detailed insights into platform performance and user engagement.'
        };
      case 'Refunds':
        return {
          title: 'Pending Refunds',
          subtitle: 'Review and process learner refund requests.'
        };
      case 'Certificates':
        return {
          title: 'Certificate Templates',
          subtitle: 'Manage and customize default certificate designs for courses.'
        };
      default:
        return {
          title: `${activeTab}`,
          subtitle: `Manage and view ${activeTab.toLowerCase()} for the platform.`
        };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <div className="theme-platform dashboard-container mesh-bg flex min-h-screen bg-[#020617] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 glass-panel border-r border-white/5 flex flex-col h-screen sticky top-0 z-50 bg-black/20">
        <div className="p-8 pb-12 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center border border-gray-600/30 flex-shrink-0">
             <img src="/src/assets/green-logo.png" alt="EduCore" className="w-14 h-14 object-contain" />
          </div>
          <div className="flex flex-col">
             <h2 className="text-[25px] font-black text-amber-400 uppercase tracking-tighter leading-none font-elmessiri mb-1">EduCore</h2>
             <p className="text-[12px] text-white/30 font-bold uppercase tracking-widest leading-none font-elmessiri">LMS Platform</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 mb-1 group relative ${
                activeTab === item.name 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/5' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={activeTab === item.name ? 'text-amber-400' : 'group-hover:text-white transition-colors'} />
              <span className="text-sm font-medium tracking-wide">{item.name}</span>
              {activeTab === item.name && (
                <motion.div 
                  layoutId="activePill"
                  className="ml-auto w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_10px_#fbbf24]" 
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto">
           <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all`}
                    >
                      <LogOut size={22} />
                      { <span className="text-sm font-bold">Logout Session</span>}
                    </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-20 glass-panel border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-40 bg-black/10">
          <div>
            <h2 className="text-3xl font-bold text-slate-950 dark:text-white tracking-tight mb-2">
              {headerContent.title.split(' ')[0]} <span className="text-amber-500">{headerContent.title.split(' ').slice(1).join(' ')}</span>
            </h2>
            <p className="text-opacity-60 text-amber-500 text-lg font-medium hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              {headerContent.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-6 ml-auto">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  const nextShow = !showNotifications;
                  setShowNotifications(nextShow);
                  if (nextShow) {
                    fetchNotifications();
                  }
                }}
                className={`relative p-2.5 rounded-xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                  showNotifications ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' : 'text-white/40 hover:text-white hover:bg-white/5 border-white/5 bg-white/5'
                }`}
              >
                <Bell size={20} className={unreadCount > 0 ? 'animate-[swing_1.5s_ease-in-out_infinite]' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-[10px] text-black font-black flex items-center justify-center rounded-full border-2 border-[#020617] ring-1 ring-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse">
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
                      <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-wide font-outfit uppercase">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:underline animate-fade-in"
                          >
                            <CheckCheck size={12} className="text-amber-400" />
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
                                    <h4 className={`text-xs font-bold text-white leading-tight truncate pr-2 ${notif.isRead ? '' : 'text-amber-400 font-black'}`}>
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
                                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-white/5 pt-3.5 mt-2.5 flex justify-center">
                        <Link 
                          to="/platform-admin/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline transition-colors py-1 px-4 cursor-pointer"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button className="p-2.5 text-white/40 hover:text-white glass-panel rounded-xl transition-all border border-white/5 bg-white/5">
              <Settings size={20} />
            </button>
            <ThemeToggle />
            <div className="h-8 w-[1px] bg-white/5" />
            <Link to="/profile" className="cursor-pointer group block" data-tooltip="Manage Profile">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/20 group-hover:scale-105 group-hover:ring-amber-400/40 transition-all duration-300">
                <span className="text-black font-bold">SA</span>
              </div>
            </Link>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
