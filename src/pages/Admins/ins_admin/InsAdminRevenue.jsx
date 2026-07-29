import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {DollarSign,TrendingUp,Users,BookOpen,Download,Filter,Calendar,Loader2,AlertCircle,Activity,GraduationCap,X} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const formatMoney = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2
    }).format(Number(value) || 0);
  } catch {
    return `${currency} ${formatNumber(value)}`;
  }
};

const getMonthName = (monthNumber) => {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString('en-US', { month: 'short' });
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function InsAdminRevenue() {
  // ── States ──
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(null);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [activeDateLabel, setActiveDateLabel] = useState('All-Time');
  const [filterOpen, setFilterOpen] = useState(false);

  // Sync temp dates with applied dates when dropdown opens/changes
  useEffect(() => {
    if (filterOpen) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [filterOpen, startDate, endDate]);
  
  // All Courses Modal States
  const [allCoursesModalOpen, setAllCoursesModalOpen] = useState(false);
  const [allCoursesData, setAllCoursesData] = useState([]);
  const [loadingAllCourses, setLoadingAllCourses] = useState(false);

  const fetchAllCoursesRevenue = useCallback(async () => {
    setLoadingAllCourses(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59, 999);
        params.set('endDate', ed.toISOString());
      }
      params.set('allCourses', 'true');

      const response = await apiClient.get(`/admin/analytics?${params.toString()}`);
      setAllCoursesData(response.data?.data?.topCourses || []);
    } catch (err) {
      console.error('Failed to load all courses revenue:', err);
      toast.error('Failed to load all courses revenue.');
    } finally {
      setLoadingAllCourses(false);
    }
  }, [startDate, endDate]);

  const openAllCoursesModal = () => {
    setAllCoursesModalOpen(true);
    fetchAllCoursesRevenue();
  };

  // ── Fetch Analytics ──
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59, 999);
        params.set('endDate', ed.toISOString());
      }

      const response = await apiClient.get(`/admin/analytics?${params.toString()}`);
      setAnalytics(response.data?.data || {});
      setError('');
    } catch (err) {
      console.error('Failed to load ins admin analytics:', err);
      setError('Failed to load platform financial metrics.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Preset Date Filter Ranges ──
  const applyPresetFilter = (label, days) => {
    const today = new Date();
    if (days === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      const start = new Date();
      start.setDate(today.getDate() - days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
    setActiveDateLabel(label);
    setFilterOpen(false);
  };

  // ── Export Statements ──
  const handleExport = async (format) => {
    setExporting(format);
    const tid = toast.loading(`Generating ${format.toUpperCase()} report…`);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59, 999);
        params.set('endDate', ed.toISOString());
      }
      params.set('format', format);

      const res = await apiClient.get(`/admin/analytics/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const blob = new Blob([res.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Institution-Revenue-Report-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} statement exported successfully!`, { id: tid });
    } catch (err) {
      console.error(err);
      toast.error(`Failed to export ${format.toUpperCase()} report.`, { id: tid });
    } finally {
      setExporting(null);
    }
  };

  // ── Computed Stats ──
  const totalRevenue = analytics?.totalRevenue || 0;
  const recentPayments = analytics?.recentPayments || [];
  const topCourses = analytics?.topCourses || [];
  const tutorBreakdown = analytics?.tutorBreakdown || [];
  const monthlyTrend = analytics?.monthlyTrend || [];
  const currency = recentPayments[0]?.currency || 'INR';

  // Average per-course revenue
  const avgPerCourse = useMemo(() => {
    return topCourses.length > 0 ? totalRevenue / topCourses.length : 0;
  }, [totalRevenue, topCourses]);

  // Current calendar month revenue
  const currentMonthRevenue = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const match = monthlyTrend.find(
      (t) => t._id.year === currentYear && t._id.month === currentMonth
    );
    return match ? match.revenue : 0;
  }, [monthlyTrend]);

  // ── Visual Trend Chart Coordinates ──
  const chartPoints = useMemo(() => {
    if (monthlyTrend.length === 0) return [];
    const maxVal = Math.max(...monthlyTrend.map((t) => Number(t.revenue) || 0), 1);
    const width = 600;
    const height = 180;
    const pad = 24;

    return monthlyTrend.map((t, idx) => {
      const x = pad + (idx / Math.max(monthlyTrend.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((Number(t.revenue) || 0) / maxVal) * (height - pad * 2);
      return {
        x,
        y,
        label: `${getMonthName(t._id.month)} ${t._id.year}`,
        val: t.revenue
      };
    });
  }, [monthlyTrend]);

  const maxValForChart = useMemo(() => {
    if (monthlyTrend.length === 0) return 1;
    return Math.max(...monthlyTrend.map((t) => Number(t.revenue) || 0), 1);
  }, [monthlyTrend]);

  const chartSVGPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }, [chartPoints]);

  const chartAreaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const lastPoint = chartPoints[chartPoints.length - 1];
    const firstPoint = chartPoints[0];
    return `${chartSVGPath} L ${lastPoint.x} 156 L ${firstPoint.x} 156 Z`;
  }, [chartPoints, chartSVGPath]);

  // ── Render ──
  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-white/40">
        <Loader2 size={36} className="animate-spin text-emerald-500 mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em]">Loading Financial Metrics</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-[32px] p-12 border border-red-500/15 bg-red-500/5 flex flex-col items-center text-center">
        <AlertCircle size={44} className="text-red-400/50 mb-4" />
        <p className="text-white/60 font-semibold mb-6">{error}</p>
        <button
          type="button"
          onClick={fetchAnalytics}
          className="px-7 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            Revenue & Financials
          </h2>
          <p className="text-white/40 font-medium text-sm">Real-time platform billing aggregates and revenue auditing.</p>
        </div>

        {/* Date Filter & Export statements */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Date Filters Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              <Filter size={15} />
              <span>Range: {activeDateLabel}</span>
            </button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 mt-2 w-80 bg-[#0b0f1a] border border-white/10 rounded-2xl p-5 z-50 space-y-4 shadow-2xl backdrop-blur-xl"
                >
                  <div>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2">Preset Ranges</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'All-Time', days: 'all' },
                        { label: 'Last 7 Days', days: 7 },
                        { label: 'Last 30 Days', days: 30 },
                        { label: 'Last 90 Days', days: 90 }
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => applyPresetFilter(item.label, item.days)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-[10px] font-bold transition-all text-left"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2">Custom Range</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-white/20 block mb-1">From</label>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500/40 transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/20 block mb-1">To</label>
                        <input
                          type="date"
                          value={tempEndDate}
                          min={tempStartDate || undefined}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500/40 transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setStartDate(tempStartDate);
                        setEndDate(tempEndDate);
                        setActiveDateLabel(tempStartDate || tempEndDate ? 'Custom Range' : 'All-Time');
                        setFilterOpen(false);
                      }}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setTempStartDate('');
                        setTempEndDate('');
                        setActiveDateLabel('All-Time');
                        setFilterOpen(false);
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export Statements Button Dropdown */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {exporting === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[32px] p-8 border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Total Platform Revenue</p>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-white mb-2 tracking-tight">
            {formatMoney(totalRevenue, currency)}
          </h3>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <TrendingUp size={14} />
            <span>Success verified ledger</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-[32px] p-8 border border-white/5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Monthly Revenue (MTD)</p>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Calendar size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-white mb-2 tracking-tight">
            {formatMoney(currentMonthRevenue, currency)}
          </h3>
          <p className="text-xs text-white/40 font-medium">Aggregated calendar month earnings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-[32px] p-8 border border-white/5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Avg. Per-Course Revenue</p>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <BookOpen size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-white mb-2 tracking-tight">
            {formatMoney(avgPerCourse, currency)}
          </h3>
          <p className="text-xs text-white/40 font-medium">Across active earning courses</p>
        </motion.div>
      </div>

      {/* ── Trend Chart & Recent Payments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend chart */}
        <section className="lg:col-span-8 glass-card rounded-[32px] p-8 border border-white/5 flex flex-col justify-between min-h-[360px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Revenue Trend</h3>
              <p className="text-xs text-white/40">Aggregated monthly earnings performance</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/15">
              <TrendingUp size={12} />
              Month-over-Month
            </div>
          </div>

          <div className="flex-1 flex items-end justify-center relative w-full h-[180px] mt-4">
            {monthlyTrend.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/25">
                <Activity size={32} className="mb-2 opacity-30" />
                <p className="text-xs font-bold">No historical trend data found</p>
              </div>
            ) : (
              <div className="w-full h-full relative">
                {/* SVG Area Line Chart */}
                <svg viewBox="0 0 600 180" width="100%" height="100%" className="overflow-visible">
                  <defs>
                    <linearGradient id="areaGradientEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="24" y1="24" x2="576" y2="24" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="24" y1="88" x2="576" y2="88" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="24" y1="156" x2="576" y2="156" stroke="rgba(255,255,255,0.08)" />

                  {/* Area fill */}
                  {chartAreaPath && <path d={chartAreaPath} fill="url(#areaGradientEmerald)" />}

                  {/* Line stroke */}
                  {chartSVGPath && <path d={chartSVGPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                  {/* Dots with tooltips */}
                  {chartPoints.map((pt, idx) => (
                    <g key={idx} className="group/dot">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        fill="#020617"
                        stroke="#10b981"
                        strokeWidth="2"
                        className="cursor-pointer transition-all hover:scale-150 duration-300"
                      />
                      {/* Interactive Tooltip Overlay */}
                      <text
                        x={pt.x}
                        y={pt.y - 12}
                        textAnchor="middle"
                        fill="#a7f3d0"
                        fontSize="9"
                        fontWeight="black"
                        className="opacity-0 group-hover/dot:opacity-100 transition-opacity bg-black duration-300 pointer-events-none"
                      >
                        {formatMoney(pt.val)}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between px-6 pt-3 border-t border-white/5 text-[9px] font-bold text-white/35 uppercase tracking-wider">
                  {chartPoints.map((pt, idx) => (
                    <span key={idx} className="block w-12 text-center truncate">{pt.label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recent payments activity list */}
        <section className="lg:col-span-4 glass-card rounded-[32px] p-8 border border-white/5 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white tracking-tight">Recent Transactions</h3>
              <Activity size={18} className="text-emerald-400" />
            </div>

            <div className="space-y-3.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
              {recentPayments.length === 0 ? (
                <div className="p-8 text-center text-white/20 border border-white/5 bg-white/[0.01] rounded-2xl">
                  <BookOpen size={24} className="mx-auto mb-2 opacity-25" />
                  <p className="text-xs font-bold">No recent payments logged</p>
                </div>
              ) : (
                recentPayments.map((p, idx) => (
                  <div key={p.id || p._id || idx} className="flex items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="min-w-0">
                      <p className="text-xs text-white font-bold truncate" title={p.courseId?.title}>
                        {p.courseId?.title || 'Course Access'}
                      </p>
                      <p className="text-[10px] text-white/30 truncate mt-0.5">
                        {p.learnerId?.name || p.learnerId?.email || 'Learner'}
                      </p>
                    </div>
                    <span className="text-xs font-black text-emerald-400 shrink-0">
                      +{formatMoney(p.amount, p.currency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-center text-[10px] font-bold text-white/20 uppercase tracking-widest mt-4">
            Auditing {recentPayments.length} recent settlements
          </p>
        </section>
      </div>

      {/* ── Top Courses & Tutor Breakdown tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 courses */}
        <section className="glass-card rounded-[32px] border border-white/5 overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-white tracking-tight">Top 10 Earning Courses</h3>
                <button
                  onClick={openAllCoursesModal}
                  className="text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20 px-2.5 py-1 rounded-xl hover:bg-emerald-500/10 transition-all cursor-pointer"
                >
                  View All
                </button>
              </div>
              <p className="text-xs text-white/30 mt-1">Courses producing highest platform revenue</p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <BookOpen size={16} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01] border-b border-white/5">
                  <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest">Course Title</th>
                  <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest text-right">Price</th>
                  <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest text-right">Enrollments</th>
                  <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {topCourses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/25 text-xs font-bold">
                      No earning records found
                    </td>
                  </tr>
                ) : (
                  topCourses.map((c, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-xs font-bold text-white truncate" title={c.title}>
                          {c.title}
                        </p>
                        <p className="text-[10px] text-white/35 mt-0.5 truncate">
                          Tutor: {c.tutorName || 'Unknown Tutor'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs text-white/60 text-right font-medium align-middle">
                        {formatMoney(c.price || 0, currency)}
                      </td>
                      <td className="px-6 py-4 text-xs text-white/60 text-right font-medium align-middle">
                        {formatNumber(c.enrollments)}
                      </td>
                      <td className="px-6 py-4 text-xs text-emerald-400 text-right font-black align-middle">
                        {formatMoney(c.revenue, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tutor breakdown */}
        <section className="glass-card rounded-[32px] border border-white/5 overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Tutor Breakdown</h3>
              <p className="text-xs text-white/30">Total revenue generated per course creator</p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <GraduationCap size={18} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01] border-b border-white/5">
                  <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest">Tutor</th>
                  <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {tutorBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-white/25 text-xs font-bold">
                      No tutor earnings records found
                    </td>
                  </tr>
                ) : (
                  tutorBreakdown.map((t, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-white">
                        {t.tutorName || 'Unknown Tutor'}
                      </td>
                      <td className="px-6 py-4 text-xs text-emerald-400 text-right font-black">
                        {formatMoney(t.revenue, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* All Courses Revenue Modal */}
      <AnimatePresence>
        {allCoursesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAllCoursesModalOpen(false)}
              className="absolute inset-0 bg-[#06080f]/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-3xl p-8 rounded-[32px] border border-white/10 relative overflow-hidden z-10 bg-[#0b0f1a] flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Per-Course Revenue Breakdown</h3>
                  <p className="text-xs text-white/30 mt-1">Full list of course performance metrics</p>
                </div>
                <button
                  onClick={() => setAllCoursesModalOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto custom-scrollbar my-6 min-h-[300px] relative">
                {loadingAllCourses ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 bg-[#0b0f1a]/80">
                    <Loader2 size={36} className="animate-spin text-emerald-500 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Fetching Course Metrics</p>
                  </div>
                ) : allCoursesData.length === 0 ? (
                  <div className="py-16 text-center text-white/25 text-xs font-bold">
                    No earning records found
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/[0.01] border-b border-white/5">
                        <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest">Course Title</th>
                        <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest text-right">Price</th>
                        <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest text-right">Enrollments</th>
                        <th className="px-6 py-4 text-[9px] font-bold text-white/30 uppercase tracking-widest text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {allCoursesData.map((c, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 max-w-[300px]">
                            <p className="text-xs font-bold text-white truncate" title={c.title}>
                              {c.title}
                            </p>
                            <p className="text-[10px] text-white/35 mt-0.5 truncate">
                              Tutor: {c.tutorName || 'Unknown Tutor'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs text-white/60 text-right font-medium align-middle">
                            {formatMoney(c.price || 0, currency)}
                          </td>
                          <td className="px-6 py-4 text-xs text-white/60 text-right font-medium align-middle">
                            {formatNumber(c.enrollments)}
                          </td>
                          <td className="px-6 py-4 text-xs text-emerald-400 text-right font-black align-middle">
                            {formatMoney(c.revenue, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
