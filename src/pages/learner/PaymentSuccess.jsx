import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Download,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Tag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

// ── helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (amount = 0, currency = 'INR') => {
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

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  } catch {
    return new Date(dateStr).toLocaleString();
  }
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function PaymentSuccess() {
  const { orderId } = useParams();          // /learner-dashboard/payment-success/:orderId
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Payment data passed via router state (immediate) OR fetched from API (direct nav)
  const [payment, setPayment] = useState(() => location.state?.payment || null);
  const [loading, setLoading] = useState(!location.state?.payment);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch if no state (e.g. page reload or direct URL)
  useEffect(() => {
    if (payment) return;
    if (!orderId) {
      setError('Invalid success page URL.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await apiClient.get(`/payments/by-order/${orderId}`, {
          signal: controller.signal,
        });
        setPayment(res.data?.data?.payment || null);
      } catch (err) {
        if (err.name === 'CanceledError') return;
        setError('Unable to load payment details. Please check your email for the confirmation.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [orderId, payment]);

  // Derived
  const courseId = payment?.courseId?.id || payment?.courseId?._id || payment?.courseId;
  const courseTitle = payment?.courseId?.title || payment?.courseTitle || 'Course';
  const thumbnailUrl = payment?.courseId?.thumbnailUrl;

  // ── Download invoice ──────────────────────────────────────────────────────
  const handleDownloadInvoice = async () => {
    const paymentRecordId = payment?.id || payment?._id;
    if (!paymentRecordId) {
      toast.error('Invoice not available yet. Please try again in a moment.');
      return;
    }

    setDownloading(true);
    try {
      const res = await apiClient.get(`/payments/${paymentRecordId}/invoice`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EduCore-Invoice-${payment?.transactionId || paymentRecordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Invoice downloaded!');
    } catch (err) {
      console.error('[PaymentSuccess] Invoice download error:', err);
      toast.error('Failed to download invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Go to course ──────────────────────────────────────────────────────────
  const handleGoToCourse = () => {
    if (courseId) {
      navigate(`/learner-dashboard/catalogue/${courseId}`);
    } else {
      navigate('/learner-dashboard/learning');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center gap-5">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/15" />
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-transparent animate-spin" />
        </div>
        <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-xs">
          Loading payment details…
        </p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !payment) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center text-center gap-6 px-4">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
          <AlertCircle size={36} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white mb-2">Details Unavailable</h1>
          <p className="text-white/40 max-w-md text-sm">{error}</p>
        </div>
        <button
          onClick={() => navigate('/learner-dashboard/learning')}
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
        >
          My Learning
        </button>
      </div>
    );
  }

  // ── Success page ──────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[32px] mb-8"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
        }}
      >
        {/* Decorative rings */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-emerald-400/10" />
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border border-emerald-400/10" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full border border-emerald-400/10" />

        <div className="relative p-5 md:p-10 flex flex-col md:flex-row items-center gap-8">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
            className="w-18 h-18 rounded-3xl bg-emerald-400/20 border-2 border-emerald-400/30 flex items-center justify-center shrink-0"
          >
            <CheckCircle size={48} className="text-emerald-300" />
          </motion.div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4">
              Payment Successful
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
              You're enrolled!
            </h1>
            <p className="text-emerald-200/70 text-base">
              Your payment was verified and course access has been unlocked.{' '}
              {user?.email && (
                <span>A confirmation email with your invoice has been sent to <strong className="text-emerald-200">{user.email}</strong>.</span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* ── Left: transaction details ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-8 space-y-6"
        >
          {/* Transaction card */}
          <div className="glass-card border border-white/5 rounded-[28px] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Receipt size={16} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Transaction Details
              </h2>
            </div>

            <div className="p-6 space-y-0 divide-y divide-white/[0.04]">
              {[
                {
                  label: 'Transaction ID',
                  value: payment?.transactionId || '—',
                  icon: <Tag size={13} className="text-violet-400" />,
                  mono: true,
                },
                {
                  label: 'Course',
                  value: courseTitle,
                  icon: <BookOpen size={13} className="text-blue-400" />,
                },
                {
                  label: 'Amount Paid',
                  value: payment?.amount
                    ? formatMoney(payment.amount, payment.currency)
                    : '—',
                  icon: <Receipt size={13} className="text-emerald-400" />,
                  highlight: true,
                },
                {
                  label: 'Date & Time',
                  value: formatDate(payment?.paidAt || payment?.createdAt),
                  icon: <Calendar size={13} className="text-amber-400" />,
                },
                {
                  label: 'Status',
                  value: 'Verified & Active',
                  icon: <CheckCircle size={13} className="text-emerald-400" />,
                  badge: true,
                },
                ...(payment?.billingPhone ? [{
                  label: 'Phone Number',
                  value: payment.billingPhone,
                  icon: <Phone size={13} className="text-blue-400" />,
                }] : []),
                ...(payment?.billingAddress ? [{
                  label: 'Billing Address',
                  value: payment.billingAddress,
                  icon: <MapPin size={13} className="text-orange-400" />,
                }] : []),
              ].map(({ label, value, icon, mono, highlight, badge }) => (
                <div key={label} className="flex items-center justify-between py-4 gap-4">
                  <span className="flex items-center gap-2 text-white/40 text-xs font-bold shrink-0">
                    {icon}
                    {label}
                  </span>
                  {badge ? (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {value}
                    </span>
                  ) : (
                    <span
                      className={`text-sm text-right break-all ${
                        mono ? 'font-mono text-violet-300 text-xs' : ''
                      } ${highlight ? 'text-emerald-400 font-black text-base' : 'text-white font-bold'}`}
                    >
                      {value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Email notice */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/15">
            <Mail size={18} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-blue-300 text-sm font-bold mb-1">Confirmation email sent</p>
              <p className="text-blue-200/50 text-xs leading-relaxed">
                A payment confirmation email with your PDF invoice attached has been sent to your registered email address. Please check your spam folder if you don't see it within a few minutes.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Right: actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="md:col-span-4 space-y-4"
        >
          {/* Course thumbnail card */}
          {thumbnailUrl && (
            <div className="glass-card border border-white/5 rounded-[28px] overflow-hidden">
              <img
                src={thumbnailUrl}
                alt={courseTitle}
                className="w-full aspect-video object-cover"
              />
              <div className="p-5">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Enrolled Course</p>
                <p className="text-white font-black text-sm leading-snug line-clamp-2">{courseTitle}</p>
              </div>
            </div>
          )}

          {/* Primary CTA: Go to Course */}
          <button
            id="go-to-course-btn"
            onClick={handleGoToCourse}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              boxShadow: '0 12px 40px rgba(124,58,237,0.35)',
            }}
          >
            <BookOpen size={18} />
            Go to Course
            <ArrowRight size={16} />
          </button>

          {/* Secondary CTA: Download Invoice */}
          <button
            id="download-invoice-btn"
            onClick={handleDownloadInvoice}
            disabled={downloading || !payment}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Preparing PDF…
              </>
            ) : (
              <>
                <Download size={17} />
                Download Invoice
              </>
            )}
          </button>

          {/* Tertiary: My Learning */}
          <button
            onClick={() => navigate('/learner-dashboard/learning')}
            className="w-full py-3 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            View My Learning
          </button>
        </motion.div>
      </div>
    </div>
  );
}
