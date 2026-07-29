import { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Layers, Award, Clock, 
  TrendingUp, GraduationCap, ChevronDown, BookOpen, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function TutorAnalytics() {
  const { isDark } = useTheme();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchAnalytics = async (courseId = '') => {
    try {
      setLoading(true);
      const url = courseId ? `/courses/tutor/analytics?courseId=${courseId}` : '/courses/tutor/analytics';
      const response = await apiClient.get(url);
      const data = response.data.data;
      
      setAnalyticsData(data);
      setCourses(data.courses || []);
      if (!courseId && data.selectedCourseAnalytics?.courseId) {
        setSelectedCourseId(data.selectedCourseAnalytics.courseId);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching tutor analytics:', err);
      setError('Failed to load course engagement analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    setShowDropdown(false);
    fetchAnalytics(courseId);
  };

  if (loading && !analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse text-xs">Loading analytics data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass-card p-12 rounded-[32px] border border-red-500/10 bg-red-500/5 text-center space-y-6">
          <AlertCircle size={48} className="text-red-400/30 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Analytics Error</h3>
          <p className="text-slate-500 dark:text-white/50">{error}</p>
          <button
            onClick={() => fetchAnalytics(selectedCourseId)}
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const selectedAnalytics = analyticsData?.selectedCourseAnalytics;
  const enrollmentTrend = analyticsData?.enrollmentTrend || [];
  const overallWatchTime = analyticsData?.overallWatchTime || 0;
  const engagementScore = analyticsData?.engagementScore || 0;

  // Custom SVG path calculation for Enrollment Trend Line Chart
  const renderTrendChart = () => {
    if (enrollmentTrend.length === 0) return null;

    const width = 600;
    const height = 240;
    const paddingX = 60;
    const paddingY = 40;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const maxVal = Math.max(...enrollmentTrend.map(t => t.enrollments), 5);

    const points = enrollmentTrend.map((t, idx) => {
      const x = paddingX + (idx * (chartWidth / (enrollmentTrend.length - 1 || 1)));
      const y = height - paddingY - (t.enrollments * (chartHeight / maxVal));
      return { x, y, label: t.month, value: t.enrollments };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // Area path closing under the line
    const areaD = enrollmentTrend.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : '';

    // Theme variables for SVG compatibility
    const gridStroke = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)";
    const labelColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(100, 116, 139, 0.8)";
    const dotCenterFill = isDark ? "#0b0f1a" : "#ffffff";
    const hoverBg = isDark ? "#0f172a" : "#ffffff";
    const hoverText = isDark ? "#ffffff" : "#0f172a";

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = paddingY + i * (chartHeight / 4);
            const val = Math.round(maxVal - i * (maxVal / 4));
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={gridStroke} strokeWidth="1" />
                <text x={paddingX - 15} y={y + 4} fill={labelColor} className="text-[10px] font-mono text-right font-bold" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          <path d={areaD} fill="url(#chartGrad)" />

          {/* Line Path */}
          <path d={pathD} fill="none" stroke="rgb(59, 130, 246)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive dots and values */}
          {points.map((p, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle cx={p.x} cy={p.y} r="5" fill={dotCenterFill} stroke="rgb(59, 130, 246)" strokeWidth="3" />
              <circle cx={p.x} cy={p.y} r="10" fill="rgb(59, 130, 246)" className="opacity-0 group-hover/dot:opacity-20 transition-all" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-all">
                <rect x={p.x - 20} y={p.y - 30} width="40" height="20" rx="6" fill={hoverBg} stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
                <text x={p.x} y={p.y - 17} fill={hoverText} className="text-[10px] font-mono font-bold" textAnchor="middle">
                  {p.value}
                </text>
              </g>
              {/* X Axis Labels */}
              <text x={p.x} y={height - paddingY + 20} fill={labelColor} className="text-[10px] font-bold uppercase tracking-wider" textAnchor="middle">
                {p.label.split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const selectedCourseName = courses.find(c => String(c.id) === String(selectedCourseId))?.title || 'Select Course';

  return (
    <div className="animate-in fade-in duration-500 space-y-10">
      {/* Header & Selector */}
      <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-6">
        {/* Dropdown Selector */}
        <div className="relative z-50 shrink-0">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-between gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer min-w-[280px]"
          >
            <span className="truncate pr-2">{selectedCourseName}</span>
            <ChevronDown size={16} className="text-slate-400 dark:text-white/40 transition-transform" />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <>
                <div className="fixed inset-0" onClick={() => setShowDropdown(false)} />
                <motion.ul
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-3 w-full bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl p-2 space-y-1 overflow-hidden"
                >
                  {courses.map(course => (
                    <li key={course.id}>
                      <button
                        onClick={() => handleCourseChange(course.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedCourseId === course.id 
                            ? 'bg-blue-600 text-white' 
                            : 'text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {course.title}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Avg Completion Rate" value={selectedAnalytics ? `${selectedAnalytics.completionRate}%` : '0%'} subtitle="Enrolled graduates" icon={Award} color="blue" />
        <StatCard label="Engagement Score" value={`${engagementScore}%`} subtitle="Student active index" icon={TrendingUp} color="cyan" />
        <StatCard label="Course Watch Time" value={selectedAnalytics ? `${selectedAnalytics.watchTimeHours}h` : '0h'} subtitle="Accumulated player logs" icon={Clock} color="indigo" />
        <StatCard label="Enrollment Reach" value={selectedAnalytics ? selectedAnalytics.enrollmentCount : 0} subtitle="Registered students" icon={Layers} color="purple" />
      </div>

      {/* Analytics Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Enrollment Trend & Quiz stats */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Enrollment Trend */}
          <div className="glass-card p-8 rounded-[36px] border border-slate-150 dark:border-white/5 bg-white/2 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                Enrollment Trend (Past 6 Months)
              </h3>
              <p className="text-xs text-slate-400 dark:text-white/30 font-semibold mt-1">Timeline of student subscription growth.</p>
            </div>
            <div className="pt-4 flex items-center justify-center min-h-[220px]">
              {enrollmentTrend.length > 0 ? renderTrendChart() : (
                <p className="text-xs text-slate-400 dark:text-white/25 uppercase font-bold tracking-wider">No trend data available</p>
              )}
            </div>
          </div>

          {/* Quiz Stats list */}
          <div className="glass-card p-8 rounded-[36px] border border-slate-150 dark:border-white/5 bg-white/2 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                Quiz Performance Metrics
              </h3>
              <p className="text-xs text-slate-400 dark:text-white/30 font-semibold mt-1">Average grades and participant metrics per assessment.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest text-[9px]">
                    <th className="pb-3 pr-4">Quiz Lesson</th>
                    <th className="pb-3 pr-4 text-center">Attempts</th>
                    <th className="pb-3 text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {selectedAnalytics?.quizStats && selectedAnalytics.quizStats.length > 0 ? (
                    selectedAnalytics.quizStats.map(quiz => (
                      <tr key={quiz.lessonId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="py-4 pr-4 text-slate-700 dark:text-white/70 font-bold flex items-center gap-2">
                          <GraduationCap size={16} className="text-cyan-400" />
                          <span className="truncate max-w-[240px]">{quiz.title}</span>
                        </td>
                        <td className="py-4 pr-4 text-center font-mono font-bold text-slate-400 dark:text-white/40">{quiz.attemptsCount}</td>
                        <td className="py-4 text-right font-mono font-black text-blue-500 dark:text-blue-400 text-sm">
                          {quiz.avgScore}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-300 dark:text-white/20 font-bold uppercase tracking-wider">
                        No quiz items found in this course
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right: Drop-off Rates list */}
        <div className="lg:col-span-5">
          <div className="glass-card p-8 rounded-[36px] border border-slate-150 dark:border-white/5 bg-white/2 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                  Per-Lesson Completion & Drop-off
                </h3>
                <p className="text-xs text-slate-400 dark:text-white/30 font-semibold mt-1">Identify sections where learners stop interacting.</p>
              </div>

              <div className="space-y-6 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {selectedAnalytics?.lessonDropOffs && selectedAnalytics.lessonDropOffs.length > 0 ? (
                  selectedAnalytics.lessonDropOffs.map((lesson) => {
                    const completionRate = 100 - lesson.dropOffRate;
                    return (
                      <div key={lesson.lessonId} className="space-y-2 group/lesson">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-600 dark:text-white/60 group-hover/lesson:text-slate-800 dark:group-hover/lesson:text-white transition-colors truncate max-w-[200px]">
                            {lesson.order}. {lesson.title}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono">
                            {completionRate}% completed
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex relative">
                          <div 
                            style={{ width: `${completionRate}%` }} 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shrink-0" 
                          />
                          {lesson.dropOffRate > 0 && (
                            <div 
                              style={{ width: `${lesson.dropOffRate}%` }} 
                              className="h-full bg-red-500/20 shrink-0" 
                              title={`${lesson.dropOffRate}% drop-off`}
                            />
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-300 dark:text-white/20 leading-none">
                          <span className="capitalize">{lesson.type}</span>
                          {lesson.dropOffRate > 0 && (
                            <span className="text-red-500 dark:text-red-400/40">
                              {lesson.dropOffRate}% Drop-off
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center text-slate-350 dark:text-white/20 font-bold uppercase tracking-wider">
                    No curriculum lessons mapped
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6 flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest leading-none">
              <span>Lessons: {selectedAnalytics?.lessonDropOffs?.length || 0}</span>
              <span>Graduates: {selectedAnalytics?.completionRate}%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, icon: Icon, color }) {
  const colors = {
    blue: "text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    cyan: "text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    indigo: "text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    purple: "text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-150 dark:border-white/5 bg-white/2 group hover:border-slate-200 dark:hover:border-white/10 transition-all flex items-center justify-between gap-4">
      <div className="space-y-2 min-w-0">
        <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">{label}</span>
        <h4 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none truncate mt-1">{value}</h4>
        <p className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-wider mt-1.5">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-2xl border transition-all group-hover:scale-110 shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}
