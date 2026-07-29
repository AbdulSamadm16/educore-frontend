import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Receipt,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Users
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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const labelize = (value) => (value || 'unknown').replaceAll('_', ' ');

const cardStyles = {
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
};

export default function PlatformRevenue() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await apiClient.get('/platform/analytics', { params });
      setAnalytics(response.data?.data || {});
      setError('');
    } catch (err) {
      console.error('Failed to load platform revenue:', err);
      setError('Failed to load platform revenue.');
    } finally {
      setLoading(false);
    }
  }, [dateRange.endDate, dateRange.startDate]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const recentPayments = analytics?.recentPayments || [];
  const currency = recentPayments[0]?.currency || 'INR';
  const refundSummary = analytics?.refundSummary || {};
  const monthlyTrend = analytics?.monthlyTrend || [];
  const topCourses = analytics?.topCourses || [];
  const tutorBreakdown = analytics?.tutorBreakdown || [];
  const paymentTypeBreakdown = analytics?.paymentTypeBreakdown || [];
  const monthChange = Number(analytics?.monthOverMonthChange) || 0;
  const totalPaymentTypeRevenue = paymentTypeBreakdown.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
  const maxTrend = Math.max(...monthlyTrend.map((item) => Number(item.revenue) || 0), 1);

  const cards = useMemo(() => ([
    {
      label: 'Total Revenue',
      value: formatMoney(analytics?.totalRevenue, currency),
      detail: `${monthChange >= 0 ? '+' : ''}${monthChange}% MoM`,
      icon: DollarSign,
      color: monthChange >= 0 ? 'emerald' : 'rose'
    },
    {
      label: 'Revenue This Month',
      value: formatMoney(analytics?.revenueThisMonth, currency),
      detail: `${formatMoney(analytics?.revenuePreviousMonth, currency)} previous month`,
      icon: TrendingUp,
      color: 'amber'
    },
    {
      label: 'Refunds',
      value: formatMoney(refundSummary.totalRefunds, currency),
      detail: `${formatNumber(refundSummary.refundCount)} refund records`,
      icon: RotateCcw,
      color: 'rose'
    },
    {
      label: 'Paid Transactions',
      value: formatNumber(recentPayments.length),
      detail: 'Latest successful payments',
      icon: Receipt,
      color: 'blue'
    }
  ]), [analytics, currency, monthChange, recentPayments.length, refundSummary.refundCount, refundSummary.totalRefunds]);

  const exportReport = async (format) => {
    setExporting(format);
    try {
      const params = { format };
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await apiClient.get('/platform/analytics/export', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `platform-revenue-report-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export revenue report:', err);
      setError('Failed to export revenue report.');
    } finally {
      setExporting('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[520px] flex flex-col items-center justify-center text-white/40">
        <Loader2 size={36} className="animate-spin text-amber-400 mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em]">Loading Revenue</p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="glass-card rounded-[32px] p-12 border border-red-500/15 bg-red-500/5 flex flex-col items-center text-center">
        <AlertCircle size={44} className="text-red-400/50 mb-4" />
        <p className="text-white/60 font-semibold mb-6">{error}</p>
        <button
          type="button"
          onClick={fetchRevenue}
          className="px-7 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-elmessiri">
            Revenue & Reports
          </h2>
          <p className="text-white/40 font-medium text-sm">Platform financial performance, refunds, and exportable reports.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative block">
            <span className="absolute left-5 top-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">From</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(event) => setDateRange((prev) => ({ ...prev, startDate: event.target.value }))}
              className="w-full sm:w-44 px-5 pb-2.5 pt-7 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
            />
          </label>
          <label className="relative block">
            <span className="absolute left-5 top-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">To</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(event) => setDateRange((prev) => ({ ...prev, endDate: event.target.value }))}
              className="w-full sm:w-44 px-5 pb-2.5 pt-7 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
            />
          </label>
          {(dateRange.startDate || dateRange.endDate) && (
            <button
              type="button"
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
              className="px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-[28px] p-6 border border-white/5"
            >
              <div className={`p-3 rounded-2xl w-fit border mb-5 ${cardStyles[card.color]}`}>
                <Icon size={24} />
              </div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">{card.label}</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{card.value}</h3>
              <p className="text-xs text-white/35 font-semibold mt-2">{card.detail}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
        <section className="xl:col-span-8 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Revenue by Time Period</h3>
              <p className="text-xs text-white/40 font-medium">Monthly successful payment totals</p>
            </div>
            <BarChart3 size={24} className="text-amber-400" />
          </div>

          <div className="h-72 flex items-end justify-between gap-3">
            {monthlyTrend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-white/30 font-bold">No revenue in this range</div>
            ) : (
              monthlyTrend.map((item) => {
                const amount = Number(item.revenue) || 0;
                const height = Math.max((amount / maxTrend) * 100, amount > 0 ? 10 : 3);
                return (
                  <div key={`${item._id?.year}-${item._id?.month}`} className="flex-1 min-w-0 flex flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      className="w-full bg-amber-500/35 rounded-t-xl border-t border-amber-300/70"
                      title={formatMoney(amount, currency)}
                    />
                    <p className="mt-3 text-[10px] text-white/30 text-center font-black uppercase">
                      {item._id?.month}/{String(item._id?.year || '').slice(-2)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="xl:col-span-4 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Payment Mix</h3>
              <p className="text-xs text-white/40 font-medium">Subscription vs one-time purchases</p>
            </div>
            <CreditCard size={24} className="text-emerald-400" />
          </div>

          <div className="space-y-5">
            {paymentTypeBreakdown.length === 0 ? (
              <p className="py-16 text-center text-white/30 font-bold">No paid transactions found</p>
            ) : (
              paymentTypeBreakdown.map((item) => {
                const revenue = Number(item.revenue) || 0;
                const percent = totalPaymentTypeRevenue ? Math.round((revenue / totalPaymentTypeRevenue) * 100) : 0;
                return (
                  <div key={item._id || 'unknown'}>
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-sm text-white font-bold capitalize">{labelize(item._id)}</span>
                      <span className="text-xs text-white/40 font-black">{percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      <span>{formatNumber(item.count)} payments</span>
                      <span>{formatMoney(revenue, currency)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <section className="glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Revenue by Course</h3>
              <p className="text-xs text-white/40 font-medium">Top performing courses</p>
            </div>
            <Calendar size={24} className="text-blue-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-[0.2em]">
                  <th className="py-3 pr-4">Course</th>
                  <th className="py-3 px-4">Tutor</th>
                  <th className="py-3 pl-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCourses.map((course) => (
                  <tr key={course._id || course.title} className="border-t border-white/5">
                    <td className="py-4 pr-4 text-white font-bold">{course.title || 'Untitled course'}</td>
                    <td className="py-4 px-4 text-white/40 text-sm">{course.tutorName || 'Unknown Tutor'}</td>
                    <td className="py-4 pl-4 text-right text-emerald-400 font-black">{formatMoney(course.revenue, currency)}</td>
                  </tr>
                ))}
                {topCourses.length === 0 && (
                  <tr><td colSpan="3" className="py-14 text-center text-white/30 font-bold">No course revenue found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Revenue by Tutor</h3>
              <p className="text-xs text-white/40 font-medium">Course creator revenue totals</p>
            </div>
            <Users size={24} className="text-amber-400" />
          </div>
          <div className="space-y-3">
            {tutorBreakdown.slice(0, 8).map((tutor) => (
              <div key={tutor._id || tutor.tutorName} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
                <span className="text-white font-bold truncate">{tutor.tutorName || 'Unknown Tutor'}</span>
                <span className="text-emerald-400 font-black shrink-0">{formatMoney(tutor.revenue, currency)}</span>
              </div>
            ))}
            {tutorBreakdown.length === 0 && (
              <p className="py-14 text-center text-white/30 font-bold">No tutor revenue found</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <section className="xl:col-span-7 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Recent Payments</h3>
              <p className="text-xs text-white/40 font-medium">Latest successful transactions</p>
            </div>
            <Receipt size={24} className="text-emerald-400" />
          </div>
          <div className="space-y-3">
            {recentPayments.map((payment) => (
              <div key={payment.id || payment._id || payment.transactionId} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{payment.courseId?.title || 'Course payment'}</p>
                  <p className="text-xs text-white/35 truncate">{payment.learnerId?.name || payment.learnerId?.email || 'Learner'}</p>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">{formatDate(payment.paidAt || payment.createdAt)}</p>
                </div>
                <span className="text-emerald-400 font-black shrink-0">{formatMoney(payment.amount, payment.currency || currency)}</span>
              </div>
            ))}
            {recentPayments.length === 0 && (
              <p className="py-14 text-center text-white/30 font-bold">No recent payments found</p>
            )}
          </div>
        </section>

        <section className="xl:col-span-5 glass-card rounded-[32px] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Export Reports</h3>
              <p className="text-xs text-white/40 font-medium">Download the filtered financial report</p>
            </div>
            <FileText size={24} className="text-amber-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => exportReport('csv')}
              disabled={!!exporting}
              className="h-28 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50"
            >
              {exporting === 'csv' ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
              <span className="text-xs font-black uppercase tracking-widest">CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportReport('pdf')}
              disabled={!!exporting}
              className="h-28 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50"
            >
              {exporting === 'pdf' ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
              <span className="text-xs font-black uppercase tracking-widest">PDF</span>
            </button>
          </div>
          <button
            type="button"
            onClick={fetchRevenue}
            className="mt-4 w-full px-5 py-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh Revenue
          </button>
        </section>
      </div>
    </div>
  );
}
