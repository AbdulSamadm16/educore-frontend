import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CreditCard,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldOff,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

// ── Razorpay SDK loader (same helper as PaymentScreen) ────────────────────────
const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve(true);
  const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((res, rej) => {
      existing.addEventListener('load', () => res(true), { once: true });
      existing.addEventListener('error', () => rej(new Error('Unable to load Razorpay.')), { once: true });
    });
  }
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = RAZORPAY_SCRIPT_SRC;
    s.async = true;
    s.onload = () => res(true);
    s.onerror = () => rej(new Error('Unable to load Razorpay.'));
    document.body.appendChild(s);
  });
};

// ── Razorpay error-code → human readable explanation ─────────────────────────
const RAZORPAY_ERROR_DESCRIPTIONS = {
  BAD_REQUEST_ERROR: 'The payment request was invalid. Please verify your details and try again.',
  GATEWAY_ERROR: 'The payment gateway encountered an issue. This is usually temporary — please try again.',
  NETWORK_ERROR: 'A network error interrupted the payment. Check your internet and retry.',
  SERVER_ERROR: "Razorpay's servers encountered a problem. Please try after a few minutes.",
  DEFAULT: 'The payment could not be processed. Your account has not been charged.',
};

const getErrorExplanation = (code) =>
  RAZORPAY_ERROR_DESCRIPTIONS[code] || RAZORPAY_ERROR_DESCRIPTIONS.DEFAULT;

// ── FAQ items ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Was any amount deducted from my account?',
    a: 'If a payment shows as failed, Razorpay does not capture the amount. Any pre-authorization hold placed by your bank is automatically released within 5–7 business days.',
  },
  {
    q: 'What if my bank shows a deduction but the payment failed?',
    a: 'This is a temporary hold (not a charge). It is automatically reversed by your bank within 5–7 working days. You can also contact your bank with the transaction reference for faster resolution.',
  },
  {
    q: 'Is it safe to retry payment?',
    a: 'Yes. Each retry creates a brand-new payment order. You will only be charged once for a successful transaction, regardless of how many times you retry.',
  },
  {
    q: 'Who do I contact if I need help?',
    a: 'Email us at support@educore.com with your transaction details and we will assist you within 24 hours.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function PaymentFailure() {
  const { courseId } = useParams();          // /learner-dashboard/payment-failure/:courseId
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Failure details passed as router state from PaymentScreen
  const failureState = location.state || {};
  const {
    reason = 'Payment could not be completed.',
    code = '',
    description = '',
    course = null,
  } = failureState;

  const [retrying, setRetrying] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('idle');
  const [openFaqIdx, setOpenFaqIdx] = useState(null);

  const currency = course?.currency || 'INR';
  const courseTitle = course?.title || 'this course';

  // ── Poll enrollment after successful retry ────────────────────────────────
  const waitForEnrollmentActivation = async () => {
    for (let i = 0; i < 8; i++) {
      try {
        const r = await apiClient.get(`/enrollments/check/${courseId}`);
        if (r.data?.data?.enrolled) return true;
      } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  };

  // ── Retry: create fresh Razorpay order and open checkout ─────────────────
  const handleRetry = async () => {
    if (!RAZORPAY_KEY_ID) {
      toast.error('Payment gateway is not configured. Please contact support.');
      return;
    }

    setRetrying(true);
    setCheckoutStatus('opening');

    try {
      await loadRazorpayCheckout();

      // POST /enrollments/:courseId — the backend detects the existing
      // pending_payment enrollment and creates a FRESH Razorpay order,
      // updating the paymentReference. No duplicate enrollment is created.
      const res = await apiClient.post(`/enrollments/${courseId}`);
      const payload = res.data?.data || {};
      const order = payload.razorpayOrder || payload.order;

      if (!order?.id) throw new Error('A new payment order could not be created. Please try again.');

      const checkout = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || currency,
        name: 'EduCore LMS',
        description: courseTitle,
        image: course?.thumbnailUrl || undefined,
        order_id: order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        notes: { courseId },
        theme: { color: '#7c3aed' },

        handler: async (rzpRes) => {
          setCheckoutStatus('verifying');
          const tid = toast.loading('Verifying payment…');
          try {
            if (!rzpRes?.razorpay_order_id || !rzpRes?.razorpay_payment_id || !rzpRes?.razorpay_signature) {
              throw new Error('Incomplete payment data from Razorpay.');
            }

            const verifyRes = await apiClient.post('/payments/verify', {
              courseId,
              razorpay_order_id: rzpRes.razorpay_order_id,
              razorpay_payment_id: rzpRes.razorpay_payment_id,
              razorpay_signature: rzpRes.razorpay_signature,
            });

            toast.dismiss(tid);
            const paymentRecord = verifyRes.data?.data?.payment || null;
            toast.success('🎉 Payment verified! Course access unlocked.');
            navigate(`/learner-dashboard/payment-success/${rzpRes.razorpay_order_id}`, {
              state: { payment: paymentRecord },
              replace: true,
            });
          } catch (verifyErr) {
            console.error('[PaymentFailure] retry verification error:', verifyErr);
            const activated = await waitForEnrollmentActivation();
            toast.dismiss(tid);
            if (activated) {
              toast.success('Course access unlocked!');
              navigate(`/learner-dashboard/payment-success/${rzpRes.razorpay_order_id}`, {
                state: { payment: null },
                replace: true,
              });
            } else {
              toast.error(
                verifyErr.response?.data?.message ||
                verifyErr.message ||
                'Verification pending. Contact support if access is not granted shortly.'
              );
            }
          } finally {
            toast.dismiss(tid);
            setRetrying(false);
            setCheckoutStatus('idle');
          }
        },

        modal: {
          ondismiss: () => {
            setRetrying(false);
            setCheckoutStatus('idle');
            toast('Payment cancelled.', { icon: '↩️' });
          },
        },
      });

      checkout.on('payment.failed', (failure) => {
        setRetrying(false);
        setCheckoutStatus('idle');
        // Stay on the same failure page but update the displayed reason
        const newReason = failure?.error?.description || 'Payment failed again. Please try a different payment method.';
        const newCode = failure?.error?.code || '';
        toast.error(newReason);
        // Soft-refresh state by navigating to self with new failure details
        navigate(`/learner-dashboard/payment-failure/${courseId}`, {
          state: { reason: newReason, code: newCode, description: failure?.error?.description, course },
          replace: true,
        });
      });

      checkout.open();
    } catch (err) {
      console.error('[PaymentFailure] retry initiation error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to start payment. Please try again.');
      setRetrying(false);
      setCheckoutStatus('idle');
    }
  };

  const retryLabel =
    checkoutStatus === 'verifying'
      ? 'Verifying…'
      : checkoutStatus === 'opening'
      ? 'Opening Razorpay…'
      : 'Try Payment Again';

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate(`/learner-dashboard/catalogue/${courseId}`)}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
      >
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-red-600/40 transition-all">
          <ArrowLeft size={18} />
        </div>
        <span className="text-sm font-bold tracking-widest uppercase">Back to Course</span>
      </button>

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[32px] mb-8"
        style={{ background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 45%, #991b1b 100%)' }}
      >
        {/* Decorative rings */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-red-400/10" />
        <div className="absolute -top-8  -right-8  w-40 h-40 rounded-full border border-red-400/10" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full border border-red-400/10" />

        <div className="relative p-10 md:p-14 flex flex-col md:flex-row items-center gap-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.18, type: 'spring', stiffness: 180 }}
            className="w-24 h-24 rounded-3xl bg-red-400/20 border-2 border-red-400/30 flex items-center justify-center shrink-0"
          >
            <XCircle size={48} className="text-red-300" />
          </motion.div>

          <div>
            <span className="inline-block px-3 py-1 bg-red-400/20 text-red-300 border border-red-400/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4">
              Payment Failed
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
              Your payment wasn't processed
            </h1>
            <p className="text-red-200/70 text-base max-w-xl">
              {reason || 'Something went wrong during payment. Your account has not been charged.'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ── Left: failure details + FAQ ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-8 space-y-5"
        >
          {/* Error detail card */}
          <div className="glass-card border border-red-500/10 rounded-[28px] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <ShieldOff size={16} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Failure Details
              </h2>
            </div>

            <div className="p-6 space-y-0 divide-y divide-white/[0.04]">
              {[
                { label: 'Course', value: courseTitle, icon: <BookOpen size={13} className="text-blue-400" /> },
                {
                  label: 'Failure Reason',
                  value: description || reason || 'Payment declined by gateway',
                  icon: <AlertTriangle size={13} className="text-red-400" />,
                  highlight: true,
                },
                ...(code ? [{
                  label: 'Error Code',
                  value: code,
                  icon: <CreditCard size={13} className="text-white/30" />,
                  mono: true,
                }] : []),
                {
                  label: 'What this means',
                  value: getErrorExplanation(code),
                  icon: <HelpCircle size={13} className="text-amber-400" />,
                  muted: true,
                },
              ].map(({ label, value, icon, highlight, mono, muted }) => (
                <div key={label} className="flex items-start justify-between py-4 gap-6">
                  <span className="flex items-center gap-2 text-white/40 text-xs font-bold shrink-0 mt-0.5">
                    {icon}
                    {label}
                  </span>
                  <span className={`text-xs text-right leading-relaxed ${
                    highlight ? 'text-red-300 font-bold' :
                    mono      ? 'font-mono text-violet-300' :
                    muted     ? 'text-white/40' :
                               'text-white font-bold'
                  }`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Not charged notice */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <ShieldOff size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-emerald-300 text-sm font-bold mb-1">Your account was not charged</p>
              <p className="text-emerald-200/50 text-xs leading-relaxed">
                Failed payments are never captured by Razorpay. If your bank shows a temporary hold, it will be automatically released within 5–7 business days.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="glass-card border border-white/5 rounded-[28px] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <HelpCircle size={16} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Payment FAQ
              </h2>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-white text-sm font-bold leading-snug">{item.q}</span>
                    <motion.span
                      animate={{ rotate: openFaqIdx === idx ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-white/30 shrink-0"
                    >
                      <HelpCircle size={16} />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {openFaqIdx === idx && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-white/40 text-xs leading-relaxed">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Right: action panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="md:col-span-4 space-y-4"
        >
          {/* Course thumbnail */}
          {course?.thumbnailUrl && (
            <div className="glass-card border border-white/5 rounded-[28px] overflow-hidden">
              <img
                src={course.thumbnailUrl}
                alt={courseTitle}
                className="w-full aspect-video object-cover opacity-70"
              />
              <div className="p-5">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Course</p>
                <p className="text-white font-black text-sm leading-snug line-clamp-2">{courseTitle}</p>
              </div>
            </div>
          )}

          {/* Primary CTA: Retry */}
          <button
            id="retry-payment-btn"
            onClick={handleRetry}
            disabled={retrying}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl"
            style={{
              background: retrying
                ? 'rgba(124,58,237,0.5)'
                : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              boxShadow: retrying ? 'none' : '0 12px 40px rgba(124,58,237,0.35)',
            }}
          >
            {retrying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {retryLabel}
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Try Payment Again
              </>
            )}
          </button>

          {/* Secondary: Back to course detail */}
          <button
            onClick={() => navigate(`/learner-dashboard/catalogue/${courseId}`)}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3"
          >
            <ArrowLeft size={16} />
            Back to Course
          </button>

          {/* Tertiary: Browse catalogue */}
          <button
            onClick={() => navigate('/learner-dashboard/catalogue')}
            className="w-full py-3 text-white/30 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Browse Catalogue
          </button>

          {/* Support note */}
          <p className="text-center text-white/20 text-[10px] leading-relaxed px-2">
            Need help? Email{' '}
            <a href="mailto:support@educore.com" className="text-violet-400 hover:underline">
              support@educore.com
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
