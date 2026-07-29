import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, UserCheck, GraduationCap, BookOpen, 
  Layers, ClipboardList, BarChart3, DollarSign, Wallet, 
  FileText, MessageSquare, Megaphone, Settings, Monitor, 
  Search, Bell, HelpCircle, ChevronDown, 
  ShieldCheck, CheckCircle2, ExternalLink 
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import PlatformDashboardView from './PlatformDashboard';
import PlatformTutors from './PlatformTutors';
import PlatformInstitutions from './PlatformInstitutions';
import PlatformCourses from './PlatformCourses';
import PlatformAnalytics from './PlatformAnalytics';
import PlatformSettings from './PlatformSettings';
import PlatformPlaceholder from './PlatformPlaceholder';
import UserManagement from '../../adminUsermanagement/UserManagement';

export default function PlatformAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [stats, setStats] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/platform/dashboard-stats');
        if (response.data?.success) {
          const fetchedStats = response.data.data.stats.map(s => ({
            ...s,
            icon: s.icon === 'Users' ? Users : 
                  s.icon === 'GraduationCap' ? GraduationCap : 
                  s.icon === 'UserCheck' ? UserCheck : 
                  s.icon === 'BookOpen' ? BookOpen : 
                  s.icon === 'Wallet' ? Wallet : BarChart3
          }));
          setStats(fetchedStats);
          setActivities(response.data.data.recentActivities);
        }
      } catch (error) {
        // Stats fetch error handled silently
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Users', icon: Users },
    { name: 'Tutors', icon: UserCheck },
    { name: 'Institutions', icon: GraduationCap },
    { name: 'Courses', icon: BookOpen },
    { name: 'Categories', icon: Layers },
    { name: 'Enrollments', icon: ClipboardList },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Subscriptions', icon: Wallet },
    { name: 'Payouts', icon: Wallet },
    { name: 'Reports', icon: FileText },
    { name: 'Support Tickets', icon: MessageSquare },
    { name: 'Announcements', icon: Megaphone },
    { name: 'Settings', icon: Settings },
    { name: 'System Logs', icon: Monitor },
  ];

  return (
    <div className="theme-platform dashboard-container mesh-bg flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-72 glass-panel border-r border-white/5 flex flex-col h-screen sticky top-0 z-50">
        <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <LayoutDashboard className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-elmessiri">EduCore</h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">LMS Platform</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 mb-1 group ${
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
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass-card p-4 rounded-2xl flex items-center gap-3 border border-amber-500/10">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center overflow-hidden">
              <span className="text-amber-400 font-bold">SA</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">Super Admin</p>
              <p className="text-[10px] text-white/40">Platform Administrator</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-white/20 hover:text-red-400 transition-colors"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-20 glass-panel border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex-1 max-w-xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-6 ml-8">
            <button className="relative p-2.5 text-white/40 hover:text-white glass-panel rounded-xl transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-4 h-4 bg-amber-500 text-[10px] text-black font-black flex items-center justify-center rounded-full border-2 border-[#020617] ring-1 ring-amber-500/50">
                12
              </span>
            </button>
            <button className="p-2.5 text-white/40 hover:text-white glass-panel rounded-xl transition-all">
              <Settings size={20} />
            </button>
            <button className="p-2.5 text-white/40 hover:text-white glass-panel rounded-xl transition-all">
              <HelpCircle size={20} />
            </button>
            <div className="h-8 w-[1px] bg-white/5" />
            <Link to="/profile" className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/20">
                <span className="text-black font-bold">SA</span>
              </div>
              <ChevronDown className="text-white/20 group-hover:text-amber-400 transition-colors" size={16} />
            </Link>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'Dashboard' && <PlatformDashboardView />}
          {activeTab === 'Users' && <UserManagement />}
          {activeTab === 'Tutors' && <PlatformTutors />}
          {activeTab === 'Institutions' && <PlatformInstitutions />}
          {activeTab === 'Courses' && <PlatformCourses />}
          {activeTab === 'Analytics' && <PlatformAnalytics />}
          {activeTab === 'Settings' && <PlatformSettings />}
          
          {['Categories', 'Enrollments', 'Subscriptions', 'Payouts', 'Reports', 'Support Tickets', 'Announcements', 'System Logs'].includes(activeTab) && (
            <PlatformPlaceholder 
              title={activeTab} 
              icon={navItems.find(i => i.name === activeTab)?.icon || Monitor} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
