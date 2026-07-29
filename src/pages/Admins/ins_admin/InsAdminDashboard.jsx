import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Layers, GraduationCap, Trophy, 
  Calendar, Clock, BookOpen, UserPlus, 
  RefreshCw, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function InsAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const response = await apiClient.get('/institution/dashboard');
      if (response.data?.success) {
        setData(response.data.data);
        if (showToast) {
          toast.success('Dashboard metrics refreshed!');
        }
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Time formatting helper
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Time elapsed helper
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-white/10 rounded" />
            <div className="h-3 w-32 bg-white/10 rounded" />
          </div>
          <div className="h-10 w-28 bg-white/10 rounded-xl" />
        </div>

        {/* KPI Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 rounded-[32px] border border-white/5 bg-white/2 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-white/10 rounded" />
                  <div className="h-8 w-24 bg-white/10 rounded" />
                </div>
                <div className="w-14 h-14 bg-white/10 rounded-2xl animate-pulse" />
              </div>
              <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
          ))}
        </div>

        {/* Content Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upcoming Live Sessions Skeleton */}
          <div className="lg:col-span-8 glass-card p-8 rounded-[32px] border border-white/5 bg-white/2 space-y-6">
            <div className="h-6 w-48 bg-white/10 rounded" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="h-3 w-48 bg-white/10 rounded" />
                  </div>
                  <div className="h-10 w-24 bg-white/10 rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Top courses Skeleton */}
          <div className="lg:col-span-4 glass-card p-8 rounded-[32px] border border-white/5 bg-white/2 space-y-6">
            <div className="h-6 w-40 bg-white/10 rounded" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-36 bg-white/10 rounded" />
                    <div className="h-4 w-12 bg-white/10 rounded" />
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || { totalStudents: 0, activeBatches: 0, activeTutors: 0, averageCompletionRate: 0 };
  const recentActivity = data?.recentEnrollmentActivity || [];
  const upcomingSessions = data?.upcomingLiveSessions || [];
  const topCourses = data?.topPerformingCourses || [];
  const isAllZeros = kpis.totalStudents === 0 && kpis.activeBatches === 0 && kpis.activeTutors === 0;

  const kpiCards = [
    { label: 'Total Students', value: kpis.totalStudents.toLocaleString(), icon: Users, change: 'Enrolled in courses', color: 'emerald' },
    { label: 'Active Batches', value: kpis.activeBatches.toLocaleString(), icon: Layers, change: 'Currently managed', color: 'emerald' },
    { label: 'Active Tutors', value: kpis.activeTutors.toLocaleString(), icon: GraduationCap, change: 'Approved instructors', color: 'emerald' },
    { label: 'Avg Progress', value: `${kpis.averageCompletionRate}%`, icon: Trophy, change: 'Course completion rate', color: 'emerald' },
  ];

  return (
    <div className="animate-in fade-in duration-500 space-y-10">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Institution Overview</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Real-time performance analytics</p>
        </div>
        <button 
          onClick={() => fetchDashboardData(true)} 
          disabled={refreshing}
          className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20 px-4 py-2.5 rounded-xl hover:bg-emerald-500/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Onboarding Checklist (Point 9) */}
      {isAllZeros && (
        <div className="glass-card p-8 rounded-[32px] border border-amber-500/25 bg-amber-500/5 space-y-6 animate-in slide-in-from-top duration-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20 shrink-0">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                Getting Started: Administrator Setup Checklist
              </h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Welcome to your new educational institution dashboard! Complete the steps below to populate your platform data and schedule live classes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
            <div 
              onClick={() => navigate('/ins-admin/tutor-assignments')}
              className="p-5 bg-white/2 border border-white/5 hover:border-emerald-500/20 rounded-2xl cursor-pointer transition-all hover:bg-white/3 group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="w-5 h-5 border-2 border-white/20 rounded-md flex items-center justify-center text-[10px] text-white/40 font-bold group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">1</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Step 1</span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Add Tutors</h4>
              <p className="text-[10px] text-white/40 leading-relaxed">Link educators to your institution dashboard so they can teach.</p>
            </div>

            <div 
              onClick={() => navigate('/ins-admin/batches')}
              className="p-5 bg-white/2 border border-white/5 hover:border-emerald-500/20 rounded-2xl cursor-pointer transition-all hover:bg-white/3 group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="w-5 h-5 border-2 border-white/20 rounded-md flex items-center justify-center text-[10px] text-white/40 font-bold group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">2</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Step 2</span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Create Batches</h4>
              <p className="text-[10px] text-white/40 leading-relaxed">Set up learner cohort groups for course tracks.</p>
            </div>

            <div 
              onClick={() => navigate('/ins-admin/batches')}
              className="p-5 bg-white/2 border border-white/5 hover:border-emerald-500/20 rounded-2xl cursor-pointer transition-all hover:bg-white/3 group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="w-5 h-5 border-2 border-white/20 rounded-md flex items-center justify-center text-[10px] text-white/40 font-bold group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">3</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Step 3</span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Enroll Students</h4>
              <p className="text-[10px] text-white/40 leading-relaxed">Import student cohorts via CSV or manual forms in batches.</p>
            </div>

            <div 
              onClick={() => navigate('/ins-admin/batches')}
              className="p-5 bg-white/2 border border-white/5 hover:border-emerald-500/20 rounded-2xl cursor-pointer transition-all hover:bg-white/3 group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="w-5 h-5 border-2 border-white/20 rounded-md flex items-center justify-center text-[10px] text-white/40 font-bold group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">4</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Step 4</span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Schedule Sessions</h4>
              <p className="text-[10px] text-white/40 leading-relaxed">Assign tutors to schedule live sessions for cohort batches.</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-[32px] border border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
            <div className="flex items-center justify-between mb-6">
               <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-3xl font-black text-white tracking-tight">{stat.value}</h3>
               </div>
               <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/10 group-hover:scale-110 transition-transform">
                  <stat.icon size={26} />
               </div>
            </div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Primary Row: Sessions & Top Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Upcoming Live Sessions Card */}
        <div className="lg:col-span-8 glass-card p-8 rounded-[32px] border border-white/5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="text-base font-black text-white uppercase tracking-wider">Upcoming Live Sessions</h3>
               <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Scheduled classes across all batches</p>
             </div>
             <Calendar size={18} className="text-emerald-400" />
          </div>

          <div className="space-y-4 flex-1">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => (
                <div key={session._id || session.id} className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        {session.batchId?.name || 'No Batch'}
                      </span>
                      <span className="text-[10px] text-white/40 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        {formatDateTime(session.startTime)}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight truncate mb-1">
                      {session.title}
                    </h4>
                    <p className="text-[10px] text-white/40 font-medium">
                      Course: <span className="text-white/60 font-semibold">{session.courseId?.title || 'Unknown Course'}</span> · Instructor: <span className="text-white/60 font-semibold">{session.tutorId?.name || 'N/A'}</span>
                    </p>
                  </div>

                  {session.meetingUrl && (
                    <a
                      href={session.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-emerald-600/10 self-start md:self-auto shrink-0"
                    >
                      Join Class <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="py-16 text-center border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center">
                <Calendar size={32} className="text-white/10 mb-3" />
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No upcoming live sessions</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Courses */}
        <div className="lg:col-span-4 glass-card p-8 rounded-[32px] border border-white/5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="text-base font-black text-white uppercase tracking-wider">Top Courses</h3>
               <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Highest completion rates</p>
             </div>
             <Trophy size={18} className="text-emerald-400" />
          </div>

          <div className="space-y-6 flex-1">
            {topCourses.length > 0 ? (
              topCourses.map((course, idx) => (
                <div key={course.courseId} className="space-y-2 group">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {idx + 1}. {course.title}
                      </p>
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                        {course.enrollmentCount} {course.enrollmentCount === 1 ? 'Student' : 'Students'}
                      </p>
                    </div>
                    <span className="text-xs font-black text-emerald-400 whitespace-nowrap shrink-0">{course.averageCompletionRate}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full group-hover:bg-emerald-400 transition-all duration-500" 
                      style={{ width: `${course.averageCompletionRate}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center h-full">
                <BookOpen size={32} className="text-white/10 mb-3" />
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No course statistics available</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Secondary Row: Recent Activity */}
      <div className="glass-card p-8 rounded-[32px] border border-white/5">
        <div className="flex justify-between items-center mb-8">
           <div>
             <h3 className="text-base font-black text-white uppercase tracking-wider">Recent Enrollment Activity</h3>
             <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Latest course enrollments in the institution</p>
           </div>
           <UserPlus size={18} className="text-emerald-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity._id || activity.id} className="flex gap-4 p-4 border border-white/5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] transition-all group">
                 <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                    {activity.userId?.name?.slice(0, 2) || 'ST'}
                 </div>
                 <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate mb-0.5 group-hover:text-emerald-400 transition-colors">
                      {activity.userId?.name || 'Unknown Learner'}
                    </h4>
                    <p className="text-[10px] text-white/40 font-semibold mb-1 truncate">
                      {activity.userId?.email || 'N/A'}
                    </p>
                    <p className="text-[10px] text-white/30 font-medium truncate">
                      Enrolled in <span className="text-white/60 font-bold">{activity.courseId?.title || 'Unknown Course'}</span>
                    </p>
                 </div>
                 <span className="text-[9px] text-white/20 font-black uppercase whitespace-nowrap self-start mt-1 shrink-0">
                   {getRelativeTime(activity.enrolledAt || activity.createdAt)}
                 </span>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-16 text-center border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center">
              <UserPlus size={32} className="text-white/10 mb-3" />
              <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No recent enrollment activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
