import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, User as UserIcon, BookOpen, Users, Clock, 
  LayoutDashboard, BarChart3, DollarSign, MessageSquare, 
  Settings, Search, Bell, Star, MoreVertical, Play,
  ChevronDown, ExternalLink, GraduationCap, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api';

export default function TutorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalReviews: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await apiClient.get('/courses/my-courses?limit=100');
        const myCoursesData = response.data.data.courses || [];
        setCourses(myCoursesData);

        let totalStudents = 0;
        let totalEarnings = 0;
        let totalRatingSum = 0;
        let totalReviews = 0;
        let ratedCourses = 0;

        myCoursesData.forEach(c => {
          totalStudents += (c.enrollmentCount || 0);
          if (!c.isFree) {
            totalEarnings += (c.price || 0) * (c.enrollmentCount || 0);
          }
          if (c.averageRating > 0) {
            totalRatingSum += c.averageRating;
            ratedCourses++;
          }
          totalReviews += (c.reviewCount || 0);
        });

        setDashboardStats({
          totalCourses: myCoursesData.length,
          totalStudents,
          totalEarnings,
          averageRating: ratedCourses > 0 ? (totalRatingSum / ratedCourses).toFixed(1) : 0,
          totalReviews
        });
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    { label: 'Total Courses', value: dashboardStats.totalCourses.toString(), change: 'Lifetime', icon: BookOpen, color: 'text-purple-400' },
    { label: 'Total Students', value: dashboardStats.totalStudents.toLocaleString(), change: 'Lifetime', icon: Users, color: 'text-pink-400' },
    { label: 'Total Earnings', value: `$${dashboardStats.totalEarnings.toLocaleString()}`, change: 'Estimated', icon: DollarSign, color: 'text-violet-400' },
    { label: 'Average Rating', value: dashboardStats.averageRating.toString(), change: `${dashboardStats.totalReviews} reviews`, icon: Star, color: 'text-amber-400', stars: Math.round(dashboardStats.averageRating) },
  ];

  const recentReviews = []; // Keep empty for now as there's no reviews API yet

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'My Courses', icon: BookOpen },
    { name: 'Students', icon: Users },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Earnings', icon: DollarSign },
    { name: 'Reviews', icon: MessageSquare },
    { name: 'Messages', icon: MessageSquare },
    { name: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-[32px] p-6 border border-white/5 relative overflow-hidden group hover:border-purple-500/20 transition-all"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full -translate-y-12 translate-x-12 group-hover:bg-purple-500/10 transition-all" />
            
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
              {stat.stars && (
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className={i < stat.stars ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* My Courses */}
        <div className="lg:col-span-4 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white tracking-tight font-elmessiri">My Courses</h3>
            <button className="text-[10px] font-bold text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors">View all</button>
          </div>
          <div className="space-y-6">
            {courses.length === 0 ? (
              <div className="text-center py-6 text-white/40 text-sm font-bold">No courses published yet</div>
            ) : courses.slice(0, 3).map((course) => (
              <Link to={`/tutor-dashboard/courses/edit/${course._id}`} key={course._id} className="flex gap-4 group cursor-pointer p-2 rounded-2xl hover:bg-white/5 transition-all">
                <div className="w-16 h-16 rounded-xl overflow-hidden relative bg-white/5 flex items-center justify-center">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen size={20} className="text-white/20" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-bold text-white truncate group-hover:text-purple-400 transition-colors">{course.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] text-white/40">Students: <span className="text-white">{course.enrollmentCount || 0}</span></p>
                    <div className="flex items-center gap-1">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <p className="text-[10px] text-white/40">{course.averageRating ? course.averageRating.toFixed(1) : 'New'}</p>
                    </div>
                  </div>
                </div>
                <button className="self-center px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-lg shadow-purple-500/5">
                  Manage
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Students Overview */}
        <div className="lg:col-span-4 glass-card rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Students Overview</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <p className="text-xs text-white/40 font-medium">Real-time stats</p>
              </div>
            </div>
            <select className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-purple-500/30">
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </div>

          <div className="mb-6">
            <div className="flex items-end gap-3">
              <h4 className="text-3xl font-bold text-white">{dashboardStats.totalStudents.toLocaleString()}</h4>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mb-1">
                <TrendingUp size={14} /> Active
              </span>
            </div>
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Total Active Students</p>
          </div>

          <div className="h-40 relative">
            {/* SVG Chart Mockup */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100">
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d="M 0 80 Q 50 70 100 60 T 200 65 T 300 40 T 400 30 L 400 100 L 0 100 Z" 
                fill="url(#purpleGradient)" 
              />
              <path 
                d="M 0 80 Q 50 70 100 60 T 200 65 T 300 40 T 400 30" 
                fill="none" 
                stroke="#a855f7" 
                strokeWidth="3" 
                className="animate-dash"
              />
            </svg>
            <div className="flex justify-between mt-4 text-[8px] text-white/20 font-bold tracking-widest uppercase">
              <span>May 1</span>
              <span>May 8</span>
              <span>May 15</span>
              <span>May 22</span>
              <span>May 29</span>
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="lg:col-span-4 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white tracking-tight font-elmessiri">Recent Reviews</h3>
            <button className="text-[10px] font-bold text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors">View all</button>
          </div>
          <div className="space-y-6">
            {recentReviews.length === 0 ? (
              <div className="text-center py-6 text-white/40 text-sm font-bold">No reviews yet</div>
            ) : recentReviews.map((review) => (
              <div key={review.id} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ring-2 ring-white/5">
                  <span className="text-xs font-bold text-white/40">{review.user.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-bold text-white truncate">{review.course}</p>
                  <p className="text-[10px] text-white/40">by {review.user}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
