import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  Loader2,
  RefreshCw,
  Users,
  Wallet
} from 'lucide-react';
import apiClient from '../../../services/api';

const iconMap = {
  Activity,
  BarChart3,
  BookOpen,
  Users,
  Wallet
};

const activityStyles = {
  registration: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  course: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  payment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
};

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const formatMoney = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  } catch {
    return `${currency} ${formatNumber(value)}`;
  }
};

const formatRelativeTime = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const buildLinePath = (points, width, height, padding) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${padding} ${height - padding}`;

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
};

function SignupChart({ data = [] }) {
  const width = 720;
  const height = 240;
  const padding = 28;
  const maxValue = Math.max(...data.map((point) => Number(point.value) || 0), 1);
  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((Number(point.value) || 0) / maxValue) * (height - padding * 2);
    return { ...point, x, y };
  });
  const linePath = buildLinePath(points, width, height, padding);
  const areaPath = linePath
    ? `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`
    : '';

  return (
    <div className="h-72 relative">
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
          <p className="text-sm font-semibold text-white/30">No signup data yet</p>
        </div>
      ) : (
        <>
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="New user signups over time">
            <defs>
              <linearGradient id="signupArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#signupArea)" />
            <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point) => (
              <circle key={point.date} cx={point.x} cy={point.y} r="4" className="fill-amber-400 stroke-white dark:stroke-slate-950" strokeWidth="2">
                <title>{`${point.label}: ${formatNumber(point.value)} signups`}</title>
              </circle>
            ))}
          </svg>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-[10px] text-slate-500 dark:text-white/30 font-black uppercase tracking-widest">
            {data.filter((_, index) => index % 2 === 0 || index === data.length - 1).map((point) => (
              <span key={point.date} className="truncate">{point.label}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EnrollmentBars({ data = [] }) {
  const maxValue = Math.max(...data.map((course) => Number(course.enrollments) || 0), 1);

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="min-h-64 flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
          <p className="text-sm font-semibold text-white/30">No enrollment data yet</p>
        </div>
      ) : (
        data.map((course, index) => (
          <div key={course.courseId || course.title} className="grid grid-cols-[minmax(0,1fr)_80px] gap-4 items-center">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="text-xs font-bold text-slate-700 dark:text-white truncate">{course.title || `Course ${index + 1}`}</p>
                <span className="text-[10px] font-black text-slate-400 dark:text-white/30">#{index + 1}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200/80 dark:bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(((Number(course.enrollments) || 0) / maxValue) * 100, 4)}%` }}
                  transition={{ duration: 0.65, delay: index * 0.04 }}
                  className="h-full rounded-full bg-amber-500"
                />
              </div>
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white text-right">
              {formatNumber(course.enrollments)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export default function PlatformDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/platform/dashboard-stats');
      setDashboard(response.data?.data || {});
      setError('');
    } catch (err) {
      console.error('Failed to load platform dashboard:', err);
      setError('Failed to load platform dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const kpis = dashboard?.kpis || [];
  const signupSeries = dashboard?.signupSeries || [];
  const enrollmentTopCourses = dashboard?.enrollmentTopCourses || [];
  const recentActivities = dashboard?.recentActivities || [];
  const userDistribution = dashboard?.userDistribution || {};

  const distributionRows = useMemo(() => {
    const total = Number(userDistribution.total) || 0;
    return [
      { label: 'Learners', value: Number(userDistribution.learners) || 0, color: 'bg-amber-400' },
      { label: 'Tutors', value: Number(userDistribution.tutors) || 0, color: 'bg-blue-400' },
      { label: 'Admins', value: Number(userDistribution.admins) || 0, color: 'bg-emerald-400' }
    ].map((row) => ({
      ...row,
      percentage: total ? ((row.value / total) * 100).toFixed(1) : '0.0'
    }));
  }, [userDistribution]);

  if (loading) {
    return (
      <div className="min-h-[520px] flex flex-col items-center justify-center text-slate-400 dark:text-white/40">
        <Loader2 size={36} className="animate-spin text-amber-400 mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em]">Loading Dashboard</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-[32px] p-12 border border-red-500/15 bg-red-500/5 flex flex-col items-center text-center">
        <AlertCircle size={44} className="text-red-400/50 mb-4" />
        <p className="text-slate-700 dark:text-white/60 font-semibold mb-6">{error}</p>
        <button
          type="button"
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 px-7 py-3 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">


      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((stat, index) => {
          const Icon = iconMap[stat.icon] || BarChart3;
          const value = stat.valueType === 'currency'
            ? formatMoney(stat.value, stat.currency)
            : formatNumber(stat.value);

          return (
            <motion.article
              key={stat.key || stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="glass-card rounded-[24px] p-6 border border-slate-200/70 dark:border-white/5 bg-white/80 dark:bg-white/[0.03] shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Icon size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  Live
                </span>
              </div>
              <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.18em] mb-2">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">{value}</h3>
              <p className="text-xs text-slate-500 dark:text-white/35 font-semibold mt-2 line-clamp-1">{stat.change}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 glass-card rounded-[28px] p-8 border border-slate-200/70 dark:border-white/5 bg-white/80 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-1 tracking-tight font-elmessiri">New User Signups</h3>
              <p className="text-xs text-slate-500 dark:text-white/40 font-medium">Daily registrations over the last 14 days</p>
            </div>
            <BarChart3 size={24} className="text-amber-500" />
          </div>
          <SignupChart data={signupSeries} />
        </div>

        <div className="xl:col-span-4 glass-card rounded-[28px] p-8 border border-slate-200/70 dark:border-white/5 bg-white/80 dark:bg-white/[0.03]">
          <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-8 tracking-tight font-elmessiri">User Distribution</h3>
          <div className="w-44 h-44 rounded-full border-[10px] border-slate-100 dark:border-white/5 flex items-center justify-center mx-auto mb-8">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">{formatNumber(userDistribution.total)}</p>
              <p className="text-[10px] text-slate-400 dark:text-white/30 font-black uppercase tracking-widest">Total Users</p>
            </div>
          </div>
          <div className="space-y-3">
            {distributionRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${row.color}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50 truncate">{row.label}</span>
                </div>
                <span className="text-[10px] font-black text-slate-950 dark:text-white whitespace-nowrap">{formatNumber(row.value)} ({row.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-7 glass-card rounded-[28px] p-8 border border-slate-200/70 dark:border-white/5 bg-white/80 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-1 tracking-tight font-elmessiri">Top Course Enrollments</h3>
              <p className="text-xs text-slate-500 dark:text-white/40 font-medium">Top 10 courses by active and completed enrollments</p>
            </div>
            <ClipboardList size={24} className="text-amber-500" />
          </div>
          <EnrollmentBars data={enrollmentTopCourses} />
        </div>

        <div className="xl:col-span-5 glass-card rounded-[28px] p-8 border border-slate-200/70 dark:border-white/5 bg-white/80 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-1 tracking-tight font-elmessiri">Recent Activity</h3>
              <p className="text-xs text-slate-500 dark:text-white/40 font-medium">Registrations, courses, and payments</p>
            </div>
            <Activity size={24} className="text-emerald-500" />
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
            {recentActivities.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-slate-400 dark:text-white/30 font-semibold">No recent activity yet</p>
              </div>
            ) : (
              recentActivities.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-white/[0.02] p-4 flex gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${activityStyles[item.type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                    {item.type === 'payment' ? <Wallet size={16} /> : item.type === 'course' ? <BookOpen size={16} /> : <Users size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{item.title}</p>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-white/25 whitespace-nowrap">{formatRelativeTime(item.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/40 font-semibold mt-1 line-clamp-2">{item.description}</p>
                    {item.amount !== undefined && (
                      <p className="text-xs text-emerald-500 font-black mt-2">{formatMoney(item.amount, item.currency)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="glass-card rounded-[28px] p-6 border border-slate-200/70 dark:border-white/5 bg-white/80 dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Manage Users', to: '/platform-admin/users', icon: Users },
            { label: 'Manage Courses', to: '/platform-admin/courses', icon: BookOpen },
            { label: 'View Reports', to: '/platform-admin/reports', icon: BarChart3 }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-white/[0.02] hover:border-amber-500/40 px-5 py-4 transition-all"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">{action.label}</span>
                </span>
                <ArrowRight size={18} className="text-slate-300 dark:text-white/20 group-hover:text-amber-500 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
