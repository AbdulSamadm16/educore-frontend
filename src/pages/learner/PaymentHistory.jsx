import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronDown,
  CreditCard,
  Download,
  Filter,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Tag,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (amount = 0, currency = 'INR') => {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
  } catch {
    return new Date(d).toLocaleString();
  }
};

const fmtDateShort = (d) => {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'short' }).format(new Date(d));
  } catch {
    return '';
  }
};

const STATUS_CONFIG = {
  success: { label: 'Paid', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  refunded: { label: 'Refunded', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  refund_pending: { label: 'Refund Requested', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' },
  refund_processing: { label: 'Refund Processing', bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20' },
  refund_failed: { label: 'Refund Retry Pending', bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/20' },
  pending: { label: 'Pending', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
};

const statusCfg = (s) => STATUS_CONFIG[s] ?? { label: s, bg: 'bg-white/5', text: 'text-white/40', border: 'border-white/10' };

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, color }) {
  return (
    <div className="glass-card border border-white/5 rounded-[24px] p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-white font-black text-lg leading-none">{value}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PaymentHistory() {
  const navigate = useNavigate();

  // ── State ──
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Sync temp dates with applied dates when dropdown opens/changes
  useEffect(() => {
    if (filterOpen) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [filterOpen, startDate, endDate]);

  // Sorting
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  const filterRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59, 999);
        params.set('endDate', ed.toISOString());
      }
      const res = await apiClient.get(`/payments/history?${params.toString()}`);
      setPayments(res.data?.data?.payments || []);
    } catch (err) {
      setError('Failed to load payment history. Please try again.');
      console.error('[PaymentHistory]', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Invoice download ────────────────────────────────────────────────────────
  const handleDownloadInvoice = async (payment) => {
    const id = payment.id || payment._id;
    setDownloadingId(id);
    try {
      const res = await apiClient.get(`/payments/${id}/invoice`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EduCore-Invoice-${payment.transactionId || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded!');
    } catch {
      toast.error('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Reset filters ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setTempStartDate('');
    setTempEndDate('');
    setTxSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || startDate || endDate || txSearch;

  // ── Client-side: search + sort ────────────────────────────────────────────
  const filtered = payments
    .filter(p => {
      if (!txSearch) return true;
      const q = txSearch.toLowerCase();
      return (
        (p.transactionId || '').toLowerCase().includes(q) ||
        (p.courseId?.title || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'createdAt' || sortField === 'paidAt') {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      }
      if (sortField === 'amount') { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalSpent = payments
    .filter(p => p.paymentStatus === 'success')
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const successCount = payments.filter(p => p.paymentStatus === 'success').length;
  const failedCount = payments.filter(p => p.paymentStatus === 'failed').length;

  const SortIcon = ({ field }) => (
    <span className={`ml-1 text-[10px] transition-opacity ${sortField === field ? 'opacity-100' : 'opacity-20'}`}>
      {sortField === field && sortDir === 'asc' ? '↑' : '↓'}
    </span>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">Payment History</h1>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Spent"
            value={fmt(totalSpent)}
            icon={<CreditCard size={18} />}
            color="bg-violet-500/10 text-violet-400"
          />
          <SummaryCard
            label="Successful Payments"
            value={successCount}
            icon={<BookOpen size={18} />}
            color="bg-emerald-500/10 text-emerald-400"
          />
          <SummaryCard
            label="Failed Attempts"
            value={failedCount}
            icon={<XCircle size={18} />}
            color="bg-red-500/10 text-red-400"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Transaction / course search */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 min-w-[220px] flex-1 max-w-sm focus-within:border-violet-500/40 transition-all">
          <Search size={14} className="text-white/30 shrink-0" />
          <input
            type="text"
            placeholder="Search by course or transaction ID…"
            value={txSearch}
            onChange={e => setTxSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-white/25"
          />
          {txSearch && (
            <button onClick={() => setTxSearch('')} className="text-white/30 hover:text-white transition-colors">
              <XCircle size={13} />
            </button>
          )}
        </div>

        {/* Advanced filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(o => !o)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${
              filterOpen || (statusFilter !== 'all' || startDate || endDate)
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Filter size={14} />
            Filters
            {(statusFilter !== 'all' || startDate || endDate) && (
              <span className="w-4 h-4 bg-violet-500 rounded-full text-[9px] text-white font-black flex items-center justify-center">
                {[statusFilter !== 'all', startDate, endDate].filter(Boolean).length}
              </span>
            )}
            <ChevronDown size={13} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 mt-2 w-80 glass-card border border-white/10 rounded-[24px] p-5 z-50 space-y-4 shadow-2xl"
                style={{ background: 'rgba(5,8,22,0.95)' }}
              >
                {/* Status */}
                <div>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'success', 'failed', 'refunded', 'refund_pending', 'refund_processing', 'refund_failed', 'pending'].map(s => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          statusFilter === s
                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {s === 'all' ? 'All' : statusCfg(s).label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2">Date Range</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/25 block mb-1">From</label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={e => setTempStartDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-violet-500/40 transition-all [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/25 block mb-1">To</label>
                      <input
                        type="date"
                        value={tempEndDate}
                        min={tempStartDate || undefined}
                        onChange={e => setTempEndDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-violet-500/40 transition-all [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => {
                      setStartDate(tempStartDate);
                      setEndDate(tempEndDate);
                      setFilterOpen(false);
                    }}
                    className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Apply
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { resetFilters(); setFilterOpen(false); }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {statusFilter !== 'all' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-[10px] text-violet-300 font-bold">
                Status: {statusCfg(statusFilter).label}
                <button onClick={() => setStatusFilter('all')} className="hover:text-white transition-colors"><XCircle size={11} /></button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-[10px] text-violet-300 font-bold">
                <Calendar size={10} />
                {startDate ? fmtDateShort(startDate) : '…'} → {endDate ? fmtDateShort(endDate) : '…'}
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-white transition-colors"><XCircle size={11} /></button>
              </span>
            )}
            <button onClick={resetFilters} className="text-white/30 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="glass-card border border-white/5 rounded-[28px] overflow-hidden">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/15" />
              <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 border-transparent animate-spin" />
            </div>
            <p className="text-violet-400 text-xs font-black uppercase tracking-[0.3em]">Loading history…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
              <AlertCircle size={28} />
            </div>
            <div>
              <p className="text-white font-black text-base mb-1">Could not load payments</p>
              <p className="text-white/30 text-sm">{error}</p>
            </div>
            <button onClick={fetchPayments} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 text-white/20 border border-white/5 flex items-center justify-center">
              <Receipt size={28} />
            </div>
            <div>
              <p className="text-white font-black text-base mb-1">
                {hasActiveFilters ? 'No payments match your filters' : 'No payment history yet'}
              </p>
              <p className="text-white/30 text-sm">
                {hasActiveFilters ? 'Try adjusting your filters.' : 'Payments you make for courses will appear here.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Data table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5">
                  {[
                    { label: 'Course', field: null },
                    { label: 'Transaction ID', field: 'transactionId' },
                    { label: 'Amount', field: 'amount' },
                    { label: 'Date', field: 'createdAt' },
                    { label: 'Status', field: 'paymentStatus' },
                    { label: 'Invoice', field: null },
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      onClick={() => field && toggleSort(field)}
                      className={`text-left px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest select-none ${
                        field ? 'cursor-pointer hover:text-white/60 transition-colors' : ''
                      }`}
                    >
                      {label}
                      {field && <SortIcon field={field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <AnimatePresence initial={false}>
                  {filtered.map((p) => {
                    const pid = p.id || p._id;
                    const courseTitle = p.courseId?.title || 'Course';
                    const cfg = statusCfg(p.paymentStatus);
                    const isSuccess = p.paymentStatus === 'success';
                    const isDownloading = downloadingId === pid;

                    return (
                      <motion.tr
                        key={pid}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Course */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {p.courseId?.thumbnailUrl ? (
                              <img
                                src={p.courseId.thumbnailUrl}
                                alt={courseTitle}
                                className="w-10 h-10 rounded-xl object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                                <BookOpen size={14} />
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const courseId = p.courseId?.id || p.courseId?._id || p.courseId;
                                if (courseId) navigate(`/learner-dashboard/catalogue/${courseId}`);
                              }}
                              className="text-white text-xs font-bold text-left line-clamp-2 hover:text-violet-400 transition-colors max-w-[180px]"
                            >
                              {courseTitle}
                            </button>
                          </div>
                        </td>

                        {/* Transaction ID */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-[10px] text-violet-300/80 bg-violet-500/[0.07] px-2 py-1 rounded-lg border border-violet-500/10 max-w-[140px] block truncate" title={p.transactionId}>
                            {p.transactionId || '—'}
                          </span>
                          {p.razorpayRefundId && (
                            <span className="mt-1 font-mono text-[9px] text-amber-300/80 bg-amber-500/[0.07] px-2 py-1 rounded-lg border border-amber-500/10 max-w-[140px] block truncate" title={p.razorpayRefundId}>
                              Refund: {p.razorpayRefundId}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4">
                          <span className={`text-sm font-black ${isSuccess ? 'text-emerald-400' : 'text-white/60'}`}>
                            {fmt(p.amount, p.currency)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <span className="text-xs text-white/50 whitespace-nowrap">
                            {fmtDate(p.paidAt || p.createdAt)}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </td>

                        {/* Invoice download */}
                        <td className="px-6 py-4">
                          {isSuccess ? (
                            <button
                              id={`download-invoice-${pid}`}
                              onClick={() => handleDownloadInvoice(p)}
                              disabled={isDownloading}
                              title="Download Invoice"
                              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/25 text-white/40 hover:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isDownloading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Download size={12} />
                              )}
                              {isDownloading ? 'PDF…' : 'Invoice'}
                            </button>
                          ) : (
                            <span className="text-white/15 text-[10px] font-bold uppercase tracking-widest">—</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Row count footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-white/25 text-[10px] font-bold">
                Showing {filtered.length} of {payments.length} record{payments.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Tag size={11} className="text-white/20" />
                <p className="text-white/25 text-[10px] font-bold">
                  Total paid: <span className="text-emerald-400">{fmt(totalSpent)}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
