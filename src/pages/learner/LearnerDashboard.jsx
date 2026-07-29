import { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { 
  Clock, CheckCircle, Award, Layers,
  Search, BookOpen, AlertCircle, Flame, GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../../services/api';
import { Link } from 'react-router-dom';

export default function LearnerDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [enrollmentsRes, analyticsRes] = await Promise.all([
          apiClient.get('/enrollments/my-courses', { params: { limit: 50 } }),
          apiClient.get('/progress/learner/analytics').catch(() => null)
        ]);
        setEnrollments(enrollmentsRes.data?.data?.enrollments || []);
        setAnalytics(analyticsRes?.data?.data || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load your learning dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / enrollments.length)
    : 0;

  const completedCourses = analytics?.coursesCount?.completed ?? enrollments.filter(e => e.status === 'completed').length;
  const inProgressCourses = analytics?.coursesCount?.inProgress ?? enrollments.filter(e => e.status === 'active').length;
  const totalHoursWatched = analytics?.totalHoursWatched ?? 0;
  const quizAverage = analytics?.quizAverage ?? 0;
  const streak = analytics?.streak ?? { currentStreak: 0, maxStreak: 0, activeDaysCount: 0 };
  const heatmapData = analytics?.activityHeatmap || [];

  // Heatmap configuration
  const weekdays = [
    { label: 'Mon', index: 1 },
    { label: 'Tue', index: 2 },
    { label: 'Wed', index: 3 },
    { label: 'Thu', index: 4 },
    { label: 'Fri', index: 5 },
    { label: 'Sat', index: 6 },
    { label: 'Sun', index: 0 }
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxActivityCount = heatmapData.length > 0 
    ? Math.max(...heatmapData.map(d => d.count), 0) 
    : 0;

  const getIntensityClass = (count) => {
    if (count === 0) return 'bg-white/5 border border-white/[0.02] hover:bg-white/10 text-white/10';
    const ratio = count / (maxActivityCount || 1);
    if (ratio < 0.25) return 'bg-blue-500/20 border border-blue-500/15 hover:bg-blue-500/30 text-blue-300';
    if (ratio < 0.5) return 'bg-blue-500/40 border border-blue-500/30 hover:bg-blue-500/50 text-blue-200';
    if (ratio < 0.75) return 'bg-cyan-500/60 border border-cyan-500/50 hover:bg-cyan-500/70 text-white';
    return 'bg-cyan-400 border border-cyan-400 hover:bg-cyan-300 text-[#020617]';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading Dashboard</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter leading-none">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-blue-200/40 text-xl font-medium">Continue your learning path and track your progress.</p>
        </div>

        {/* Streak Motivator Banner */}
        {streak.currentStreak > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 px-6 py-4 rounded-3xl border border-orange-500/20 bg-orange-500/5 backdrop-blur-md shrink-0 shadow-xl shadow-orange-500/5"
          >
            <div className="relative flex items-center justify-center">
              <Flame size={32} className="text-orange-500 animate-[pulse_1.5s_infinite]" fill="currentColor" />
              <span className="absolute inset-0 bg-orange-500/20 blur-md rounded-full -z-10 animate-ping"></span>
            </div>
            <div>
              <p className="text-lg font-black text-white leading-none">{streak.currentStreak} Day Streak!</p>
              <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mt-1">Keep the momentum going 🔥</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard label="Active Courses" value={inProgressCourses} subtitle="Ongoing learning" icon={Layers} color="blue" delay={0.1} />
        <StatCard label="Completed" value={completedCourses} subtitle="Total finished" icon={Award} color="indigo" delay={0.2} />
        <StatCard label="Quiz Average" value={`${quizAverage}%`} subtitle="Assessment score" icon={GraduationCap} color="cyan" delay={0.3} />
        <StatCard label="Streak" value={`${streak.currentStreak} Days`} subtitle={`Max streak: ${streak.maxStreak}d`} icon={Flame} color="orange" delay={0.4} />
        <StatCard label="Learning Time" value={`${totalHoursWatched}h`} subtitle="Total watch time" icon={Clock} color="purple" delay={0.5} />
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column (Courses & Activity Heatmap) */}
        <div className="lg:col-span-8 space-y-12">
          {/* Recently Enrolled Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-white flex items-center gap-4 tracking-tight">
                <span className="w-1.5 h-10 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
                Recently Enrolled
              </h2>
              {enrollments.length > 0 && (
                <Link 
                  to="/learner-dashboard/learning" 
                  className="text-xs font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                >
                  View All Courses
                </Link>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {error ? (
                <div className="glass-card p-12 rounded-[40px] border border-red-500/10 bg-red-500/5 flex flex-col items-center justify-center">
                  <AlertCircle size={48} className="text-red-400/20 mb-4" />
                  <p className="text-white/60 font-medium">{error}</p>
                </div>
              ) : enrollments.length > 0 ? (
                enrollments.slice(0, 3).map((enrollment, idx) => (
                  <CourseCard key={enrollment._id || idx} enrollment={enrollment} index={idx} />
                ))
              ) : (
                <div className="glass-card p-20 rounded-[40px] border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                  <div className="p-6 bg-white/5 rounded-[32px] text-white/10 mb-6">
                    <BookOpen size={64} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">No Active Courses Found</h3>
                  <p className="text-white/20 max-w-sm mb-10">You haven't enrolled in any courses yet. Start exploring the catalogue to begin your journey.</p>
                  <Link 
                    to="/learner-dashboard/catalogue" 
                    className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3"
                  >
                    <Search size={18} />
                    Explore Catalogue
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Activity Heatmap Section */}
          <div className="glass-card p-8 rounded-[40px] border border-white/5 relative overflow-hidden bg-white/2">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.01] blur-3xl rounded-full -translate-y-16 translate-x-16" />
             
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                   <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                     <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
                     Weekly Activity Pattern
                   </h3>
                   <p className="text-xs text-white/30 font-medium mt-1">Heatmap of your study sessions by weekday and hour of the day.</p>
                </div>
                {/* Heatmap Legend */}
                <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                   <span>Less</span>
                   <div className="w-2.5 h-2.5 rounded bg-white/5 border border-white/10"></div>
                   <div className="w-2.5 h-2.5 rounded bg-blue-500/20"></div>
                   <div className="w-2.5 h-2.5 rounded bg-blue-500/40"></div>
                   <div className="w-2.5 h-2.5 rounded bg-cyan-500/60"></div>
                   <div className="w-2.5 h-2.5 rounded bg-cyan-400"></div>
                   <span>More</span>
                </div>
             </div>

             {/* Grid layout with horizontal scrolling for smaller screens */}
             <div className="overflow-x-auto custom-scrollbar pb-2">
                <div className="min-w-[700px] space-y-2">
                   {/* Hour Headers row */}
                   <div className="flex items-center gap-1.5 pl-12 text-[10px] font-bold text-white/20 uppercase tracking-widest pb-1 border-b border-white/5 mb-3">
                      {hours.map(h => (
                         <div key={h} className="w-6 text-center shrink-0">
                            {h === 0 ? '12a' : h === 12 ? '12p' : h % 12}
                         </div>
                      ))}
                   </div>

                   {/* Heatmap Rows */}
                   <div className="space-y-1.5">
                      {weekdays.map(day => (
                         <div key={day.index} className="flex items-center gap-1.5">
                            {/* Day label */}
                            <div className="w-10 text-[10px] font-black text-white/40 uppercase tracking-widest shrink-0 text-left pr-2">
                               {day.label}
                            </div>
                            
                            {/* 24 Hour cells */}
                            {hours.map(hour => {
                               const cell = heatmapData.find(d => d.day === day.index && d.hour === hour);
                               const count = cell ? cell.count : 0;
                               const intensityClass = getIntensityClass(count);
                               const hourLabel = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                               
                               return (
                                  <div
                                     key={hour}
                                     title={`${day.label}s at ${hourLabel}: ${count} active learning logs`}
                                     className={`w-6 h-6 rounded-md transition-all cursor-pointer relative group flex items-center justify-center text-[9px] font-bold ${intensityClass}`}
                                  >
                                     {count > 0 && <span>{count}</span>}
                                  </div>
                               );
                            })}
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column (Goals & Milestones) */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-card p-8 rounded-[40px] border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -translate-y-16 translate-x-16" />
             <h3 className="text-xl font-bold text-white mb-6">Learning Goals</h3>
             <div className="space-y-6">
                <GoalItem label="Build course skills" progress={totalProgress} />
                <GoalItem label="Complete active modules" progress={enrollments.length > 0 ? (completedCourses / enrollments.length) * 100 : 0} />
             </div>
          </div>
          
          <div className="glass-card p-8 rounded-[40px] border border-white/5 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 group hover:border-blue-500/30 transition-all cursor-pointer">
             <h4 className="text-white font-bold mb-4">Upcoming Milestone</h4>
             <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xs flex-col shadow-lg shadow-blue-600/20">
                   <span>JUN</span>
                   <span className="text-lg">30</span>
                </div>
                <div>
                   <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Course Completion</p>
                   <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none mt-1">Target Milestone Deadline</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, icon: Icon, color, delay }) {
  const colors = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-8 rounded-[36px] border border-white/5 hover:border-white/10 transition-all group"
    >
      <div className={`p-3 rounded-2xl w-fit mb-6 border transition-all group-hover:scale-110 ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <h4 className="text-3xl font-black text-white mb-2 tracking-tighter truncate">{value}</h4>
      <p className="text-sm font-bold text-white/60 mb-1">{label}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">{subtitle}</p>
    </motion.div>
  );
}

function CourseCard({ enrollment, index }) {
  const { course, progressPercentage: progress } = enrollment;

  return (
    <Link to={`/learner-dashboard/catalogue/${course._id || course.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="glass-card p-6 rounded-[32px] border border-white/5 hover:border-blue-500/20 transition-all group flex flex-col md:flex-row gap-8 items-center"
      >
        <div className="w-full md:w-56 h-36 rounded-2xl overflow-hidden relative shadow-2xl shrink-0">
          <img 
            src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
            alt={course.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-60"></div>
          <div className="absolute bottom-3 left-3">
             <span className="px-2 py-1 bg-blue-600 text-[8px] font-black text-white uppercase rounded-md tracking-tighter">
               {course.level || 'Beginner'}
             </span>
          </div>
          <div className="absolute bottom-3 right-3">
             <span className="w-fit px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-md backdrop-blur-md border border-emerald-500/30 flex items-center gap-1 shadow-lg">
                <CheckCircle size={10} />
                Enrolled
             </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
             <h3 className="text-xl font-bold text-white truncate leading-tight group-hover:text-blue-400 transition-colors">{course.title}</h3>
             <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg uppercase tracking-widest border border-blue-500/20">
               {progress}%
             </span>
          </div>
          
          <p className="text-sm text-white/40 line-clamp-1 mb-6 font-medium">
            {course.category} • {course.totalLessons} Lessons
          </p>

          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progress}%` }}
               transition={{ duration: 1.5, delay: 0.2 }}
               className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
             />
          </div>
        </div>

      </motion.div>
    </Link>
  );
}

function GoalItem({ label, progress }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold tracking-tight">
        <span className="text-white/60">{label}</span>
        <span className="text-blue-400">{Math.round(progress)}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
