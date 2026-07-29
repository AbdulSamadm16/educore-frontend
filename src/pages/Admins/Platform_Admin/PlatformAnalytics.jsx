import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  DollarSign,
  Loader2,
  Receipt,
  Users,
  Zap
} from 'lucide-react';
import apiClient from '../../../services/api';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const formatMoney = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2
    }).format(Number(value) || 0);
  } catch {
    return `${currency} ${formatNumber(value)}`;
  }
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const statStyles = {
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
};

export default function PlatformAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/analytics');
      setAnalytics(response.data?.data || {});
      setError('');
    } catch (err) {
      console.error('Failed to load platform analytics:', err);
      setError('Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchAnalytics();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAnalytics]);

  const recentPayments = analytics?.recentPayments || [];
  const revenueCurrency = recentPayments[0]?.currency || 'INR';
  const stats = useMemo(() => ([
    { label: 'Total Users', value: formatNumber(analytics?.userCount), icon: Users, color: 'amber' },
    { label: 'Active Enrollments', value: formatNumber(analytics?.enrollmentCount), icon: Zap, color: 'emerald' },
    { label: 'Total Revenue', value: formatMoney(analytics?.totalRevenue, revenueCurrency), icon: DollarSign, color: 'blue' },
    { label: 'Recent Payments', value: formatNumber(recentPayments.length), icon: Receipt, color: 'cyan' }
  ]), [analytics, recentPayments.length, revenueCurrency]);

  const chartValues = recentPayments.length > 0
    ? recentPayments.map((payment) => Number(payment.amount) || 0)
    : [0];
  const maxChartValue = Math.max(...chartValues, 1);

  if (loading) {
    return (
      <div className="min-h-[520px] flex flex-col items-center justify-center text-white/40">
        <Loader2 size={36} className="animate-spin text-amber-400 mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em]">Loading Analytics</p>
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-elmessiri">
          Platform Analytics
        </h2>
        <p className="text-white/40 font-medium text-sm">Live enrollment and revenue metrics from the backend.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-[32px] p-6 border border-white/5"
            >
              <div className={`p-3 rounded-2xl w-fit border mb-5 ${statStyles[stat.color]}`}>
                <Icon size={24} />
              </div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Recent Revenue</h3>
              <p className="text-xs text-white/40 font-medium">Latest successful payments</p>
            </div>
            <BarChart3 size={24} className="text-amber-400" />
          </div>

          <div className="h-64 flex items-end justify-between gap-3">
            {chartValues.map((amount, index) => (
              <div key={`${amount}-${index}`} className="flex-1 min-w-0">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((amount / maxChartValue) * 100, amount > 0 ? 12 : 4)}%` }}
                  transition={{ duration: 0.7, delay: index * 0.05 }}
                  className="w-full bg-amber-500/35 rounded-t-xl border-t border-amber-300/70"
                  title={formatMoney(amount, recentPayments[index]?.currency || revenueCurrency)}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Payment Activity</h3>
              <p className="text-xs text-white/40 font-medium">Last successful transactions</p>
            </div>
            <Activity size={24} className="text-emerald-400" />
          </div>

          <div className="space-y-4">
            {recentPayments.length === 0 ? (
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-8 text-center">
                <BookOpen size={34} className="text-white/10 mx-auto mb-4" />
                <p className="text-white/35 font-bold">No successful payments yet</p>
              </div>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.id || payment._id || payment.transactionId}
                  className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-bold truncate">{payment.courseId?.title || 'Course payment'}</p>
                    <p className="text-xs text-white/35 truncate">{payment.learnerId?.name || payment.learnerId?.email || 'Learner'}</p>
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">{formatDate(payment.paidAt || payment.createdAt)}</p>
                  </div>
                  <span className="text-sm font-black text-emerald-400 shrink-0">
                    {formatMoney(payment.amount, payment.currency || revenueCurrency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
