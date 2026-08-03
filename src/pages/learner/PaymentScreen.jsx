import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  BookOpen,
  CheckCircle,
  CreditCard,
  Globe,
  Layers,
  Loader2,
  Lock,
  Shield,
  Smartphone,
  Star,
  Tag,
  Users,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

// ─── Razorpay loader ────────────────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatMoney = (amount = 0, currency = 'INR') => {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

/**
 * Derives a "was" (original) price and percentage saved from the actual price.
 * Since the Course schema stores only `price` (the final/selling price), we
 * compute a plausible MRP: next nice round number ≥ 25 % above the sale price,
 * capped at common LMS price tiers.
 */
const deriveOrderSummary = (price = 0) => {
  if (!price || price <= 0) return { originalPrice: 0, discount: 0, finalPrice: 0, pctOff: 0 };

  // Round-up to the next "pretty" MRP (e.g. 1499 → 1999, 999 → 1499 …)
  const tiers = [199, 299, 399, 499, 699, 799, 999, 1299, 1499, 1799, 1999, 2499, 2999, 3499, 3999, 4999, 5999, 7999, 9999, 12999];
  const minMrp = price * 1.25;
  const originalPrice = tiers.find(t => t > minMrp) ?? Math.ceil(minMrp / 100) * 100;
  const discount = originalPrice - price;
  const pctOff = Math.round((discount / originalPrice) * 100);
  return { originalPrice, discount, finalPrice: price, pctOff };
};

// ─── Payment method icons (SVG inline) ──────────────────────────────────────
const methodIcons = [
  { label: 'UPI', icon: <Smartphone size={14} />, color: 'text-violet-400' },
  { label: 'Cards', icon: <CreditCard size={14} />, color: 'text-blue-400' },
  { label: 'Net Banking', icon: <Globe size={14} />, color: 'text-cyan-400' },
  { label: 'Wallets', icon: <Layers size={14} />, color: 'text-amber-400' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function PaymentScreen() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [course, setCourse] = useState(() => location.state?.course || null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(!location.state?.course);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle | opening | verifying
  const [error, setError] = useState(null);

  // ── Billing form states ──
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingPhoneCode, setBillingPhoneCode] = useState('+91');

  // ── Fetch course details ──
  useEffect(() => {
    const controller = new AbortController();
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/courses/${courseId}`, { signal: controller.signal });
        const payload = res.data?.data || {};
        const c = payload.course || payload;
        setCourse(c);
        setIsEnrolled(Boolean(payload.isEnrolled || c?.isEnrolled));
        setError(null);
      } catch (err) {
        if (err.name === 'CanceledError' || err.constructor?.name === 'Cancel') return;
        console.error('[PaymentScreen] course fetch error:', err);
        setError('Unable to load payment details for this course.');
        if (location.state?.course) toast.error('Using cached course info — refresh if price looks outdated.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    if (courseId) fetchCourse();
    return () => controller.abort();
  }, [courseId, location.state]);

  // ── Derived values ──
  const price = Number(course?.price || 0);
  const isPaidCourse = course && !course.isFree && price > 0;
  const currency = course?.currency || 'INR';
  const { originalPrice, discount, finalPrice, pctOff } = deriveOrderSummary(price);

  // ── Poll enrollment after Razorpay success ──
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

  // ── Main pay handler ──
  const handlePay = async (e) => {
    e.preventDefault();
    if (!course) return;

    // Already enrolled — go straight to course
    if (isEnrolled) {
      navigate(`/learner-dashboard/catalogue/${courseId}`);
      return;
    }

    // Free course — enroll directly
    if (!isPaidCourse) {
      setSubmitting(true);
      try {
        await apiClient.post(`/enrollments/${courseId}`);
        toast.success('Enrolled successfully! Enjoy the course.');
        navigate(`/learner-dashboard/catalogue/${courseId}`);
      } catch (err) {
        const alreadyDone =
          err.response?.data?.code === 'COURSE_ALREADY_ENROLLED' ||
          err.response?.data?.message?.includes('Already enrolled');
        if (alreadyDone) {
          navigate(`/learner-dashboard/catalogue/${courseId}`);
        } else {
          toast.error(err.response?.data?.message || 'Enrollment failed. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Paid course — open Razorpay
    if (!RAZORPAY_KEY_ID) {
      toast.error('Payment gateway is not configured. Please contact support.');
      return;
    }

    setSubmitting(true);
    setCheckoutStatus('opening');

    try {
      await loadRazorpayCheckout();

      // Create order on backend
      const res = await apiClient.post(`/enrollments/${courseId}`, {
        billingAddress,
        billingPhone: `${billingPhoneCode} ${billingPhone}`
      });
      const payload = res.data?.data || {};
      const order = payload.razorpayOrder || payload.order;

      if (!order?.id) throw new Error('Payment order was not returned by the server.');

      const checkout = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: order.amount,             // in paise
        currency: order.currency || currency,
        name: 'EduCore LMS',
        description: course?.title || 'Course Enrollment',
        image: course?.thumbnailUrl || undefined,
        order_id: order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        notes: { courseId },
        theme: { color: '#7c3aed' },      // violet to match EduCore brand

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
            setIsEnrolled(true);
            toast.success('🎉 Payment verified! Course access unlocked.');
            navigate(`/learner-dashboard/payment-success/${rzpRes.razorpay_order_id}`, {
              state: { payment: paymentRecord },
              replace: true,
            });
          } catch (verifyErr) {
            console.error('[PaymentScreen] verification error:', verifyErr);
            const activated = await waitForEnrollmentActivation();
            toast.dismiss(tid);
            if (activated) {
              setIsEnrolled(true);
              toast.success('Course access unlocked!');
              navigate(`/learner-dashboard/payment-success/${rzpRes.razorpay_order_id}`, {
                state: { payment: null },
                replace: true,
              });
            } else {
              toast.error(
                verifyErr.response?.data?.message ||
                verifyErr.message ||
                'Payment successful but verification is pending. Contact support if access is not granted shortly.'
              );
            }
          } finally {
            toast.dismiss(tid);
            setSubmitting(false);
            setCheckoutStatus('idle');
          }
        },

        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setCheckoutStatus('idle');
            toast('Payment cancelled.', { icon: '↩️' });
          },
        },
      });

      checkout.on('payment.failed', (failure) => {
        setSubmitting(false);
        setCheckoutStatus('idle');
        const errorCode = failure?.error?.code || '';
        const errorDesc = failure?.error?.description || '';
        const reason = errorDesc || 'Payment could not be completed. Please try again.';
        navigate(`/learner-dashboard/payment-failure/${courseId}`, {
          state: {
            reason,
            code: errorCode,
            description: errorDesc,
            course,
          },
          replace: true,
        });
      });

      checkout.open();
    } catch (err) {
      console.error('[PaymentScreen] initiation error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to start payment.');
      setSubmitting(false);
      setCheckoutStatus('idle');
    }
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (loading && !course) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center text-center gap-5">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-violet-500/15" />
          <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 border-transparent animate-spin" />
        </div>
        <p className="text-violet-400 font-black uppercase tracking-[0.3em] text-xs">
          Loading checkout…
        </p>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error && !course) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center text-center gap-6 px-4">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
          <AlertCircle size={36} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white mb-2">Checkout Unavailable</h1>
          <p className="text-white/40 max-w-md text-sm">{error}</p>
        </div>
        <button
          onClick={() => navigate(`/learner-dashboard/catalogue/${courseId}`)}
          className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
        >
          Back to Course
        </button>
      </div>
    );
  }

  // ─── Button labels ───────────────────────────────────────────────────────
  const ctaLabel = isEnrolled
    ? 'Go to Course'
    : isPaidCourse
    ? `Pay ${formatMoney(finalPrice, currency)}`
    : 'Enroll for Free';

  const loadingLabel =
    checkoutStatus === 'verifying'
      ? 'Verifying Payment…'
      : checkoutStatus === 'opening'
      ? 'Opening Razorpay…'
      : 'Processing…';

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
      >
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-violet-600 transition-all">
          <ArrowLeft size={18} />
        </div>
        <span className="text-sm font-bold tracking-widest uppercase">Back</span>
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* ── Left panel: Checkout form ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-7 space-y-6"
        >
          {/* Header */}
          <div className="glass-card border border-white/5 rounded-[32px] p-8">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Secure Checkout
              </span>
              {isPaidCourse ? (
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Lock size={10} /> Payment Required
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  Free Course
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
              {isPaidCourse ? 'Complete Your Purchase' : 'Enroll for Free'}
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              {isPaidCourse
                ? 'Review your order and click Pay to open the Razorpay secure checkout. Supports UPI, cards, net banking & wallets.'
                : 'No payment needed — click below to get instant access.'}
            </p>
          </div>

          {/* Order Summary */}
          {isPaidCourse && (
            <div className="glass-card border border-white/5 rounded-[32px] p-8 space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                  <Tag size={16} />
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Order Summary</h2>
              </div>

              {/* Course name */}
              <div className="flex items-start justify-between gap-4 py-4 border-b border-white/5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={course?.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80'}
                      alt={course?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-snug line-clamp-2">{course?.title}</p>
                    {course?.level && (
                      <span className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1 block">
                        {course.level}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-white font-black text-sm shrink-0 line-through text-white/40">
                  {formatMoney(originalPrice, currency)}
                </span>
              </div>

              {/* Price rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Original Price</span>
                  <span className="text-white/50 text-sm line-through">{formatMoney(originalPrice, currency)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                    <BadgePercent size={14} />
                    Discount ({pctOff}% off)
                  </span>
                  <span className="text-emerald-400 text-sm font-bold">
                    − {formatMoney(discount, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="text-white font-black uppercase tracking-widest text-xs">Total Due Today</span>
                  <span className="text-2xl font-black text-white">{formatMoney(finalPrice, currency)}</span>
                </div>
              </div>

              {/* Savings callout */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15">
                <Zap size={16} className="text-emerald-400 shrink-0" />
                <p className="text-emerald-300 text-xs font-bold">
                  You save {formatMoney(discount, currency)} ({pctOff}%) on this course!
                </p>
              </div>
            </div>
          )}

          {/* Payment methods */}
          {isPaidCourse && (
            <div className="glass-card border border-white/5 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8">
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest mb-4 sm:mb-5">
                Accepted Payment Methods
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {methodIcons.map(({ label, icon, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/3 border border-white/8"
                  >
                    <span className={`${color} shrink-0`}>{icon}</span>
                    <span className="text-white/70 text-[11px] sm:text-xs font-bold">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/25 text-[10px] sm:text-[11px] mt-4 leading-relaxed">
                All payment methods are handled securely through Razorpay. EduCore never stores your card details.
              </p>
            </div>
          )}

          {/* Billing Details & Checkout Form */}
          <form onSubmit={handlePay} className="space-y-4 sm:space-y-6">
            {isPaidCourse && !isEnrolled && (
            <div className="glass-card border border-white/5 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 space-y-4 sm:space-y-5">
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest mb-1 sm:mb-2">
                Billing Information
              </h2>
              <p className="text-white/40 text-[11px] sm:text-xs mb-3 sm:mb-4">Required for generating your tax invoice.</p>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1.5 sm:mb-2">
                    Phone Number
                  </label>
                  <div className="flex gap-2 min-w-0 w-full">
                    <select
                      value={billingPhoneCode}
                      onChange={(e) => setBillingPhoneCode(e.target.value)}
                      className="w-20 sm:w-28 shrink-0 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-3 sm:py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium text-xs sm:text-sm appearance-none cursor-pointer text-center"
                    >
                      <option value="+91" className="bg-slate-900 text-white">+91 (IN)</option>
                      <option value="+1" className="bg-slate-900 text-white">+1 (US)</option>
                      <option value="+44" className="bg-slate-900 text-white">+44 (UK)</option>
                      <option value="+61" className="bg-slate-900 text-white">+61 (AU)</option>
                      <option value="+971" className="bg-slate-900 text-white">+971 (UAE)</option>
                      <option value="+65" className="bg-slate-900 text-white">+65 (SG)</option>
                    </select>
                    <input
                      type="tel"
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      required
                      placeholder="9876543210"
                      pattern="[0-9\s\-]{5,15}"
                      title="Please enter a valid phone number (5 to 15 digits)"
                      className="flex-1 min-w-0 w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1.5 sm:mb-2">
                    Billing Address
                  </label>
                  <textarea
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    required
                    rows="3"
                    placeholder="Enter your full billing address..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium text-xs sm:text-sm resize-none custom-scrollbar"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { icon: <Shield size={16} className="text-emerald-400" />, label: 'Server-side verified', sub: 'Signature checked' },
              { icon: <Zap size={16} className="text-violet-400" />, label: 'Instant Access', sub: 'Unlock on success' },
              { icon: <Lock size={16} className="text-blue-400" />, label: 'Secure & Encrypted', sub: 'Razorpay PCI-DSS' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-white/3 border border-white/8 flex flex-col items-center text-center gap-1 sm:gap-2">
                {icon}
                <p className="text-white text-[9px] sm:text-[11px] font-black uppercase tracking-widest leading-tight">{label}</p>
                <p className="text-white/30 text-[8px] sm:text-[10px] hidden sm:block">{sub}</p>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <button
            id="pay-now-btn"
            type="submit"
            disabled={submitting || !course}
            className="w-full px-4 sm:px-6 py-4 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all flex items-center justify-center gap-3 sm:gap-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              boxShadow: submitting ? 'none' : '0 12px 40px rgba(124,58,237,0.35)',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin shrink-0 ml-2" />
                {loadingLabel}
              </>
            ) : isEnrolled ? (
              <>
                <CheckCircle size={18} className="shrink-0 ml-2" />
                Go to Course
              </>
            ) : isPaidCourse ? (
              <>
                <CreditCard size={18} className="shrink-0 ml-2 sm:ml-3" />
                Pay {formatMoney(finalPrice, currency)} — Powered by Razorpay
              </>
            ) : (
              <>
                <CheckCircle size={18} className="shrink-0 ml-2" />
                Enroll for Free
              </>
            )}
          </button>
        </form>
        </motion.section>

        {/* ── Right panel: Course card ── */}
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="xl:col-span-5"
        >
          <div className="sticky top-10 glass-card rounded-[32px] border border-white/10 overflow-hidden shadow-2xl shadow-violet-900/20">
            {/* Thumbnail */}
            <div className="aspect-video bg-white/5 relative overflow-hidden">
              <img
                src={course?.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                alt={course?.title || 'Course'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent" />
              {isPaidCourse && pctOff > 0 && (
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg">
                  {pctOff}% OFF
                </div>
              )}
            </div>

            <div className="p-7 space-y-6">
              {/* Course info */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Course</p>
                  <h2 className="text-base font-black text-white leading-tight line-clamp-2">{course?.title}</h2>
                </div>
              </div>

              <p className="text-sm text-white/40 leading-relaxed line-clamp-3">
                {course?.shortDescription || 'Complete your enrollment to unlock the full course curriculum.'}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-3">
                {course?.totalLessons > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-white/50 font-bold">
                    <BookOpen size={12} className="text-violet-400" />
                    {course.totalLessons} Lessons
                  </span>
                )}
                {course?.enrollmentCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-white/50 font-bold">
                    <Users size={12} className="text-blue-400" />
                    {course.enrollmentCount.toLocaleString()} Enrolled
                  </span>
                )}
                {course?.averageRating > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
                    <Star size={12} />
                    {Number(course.averageRating).toFixed(1)}
                  </span>
                )}
              </div>

              {/* Pricing summary */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5 space-y-3">
                {isPaidCourse ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 text-xs font-bold">Original Price</span>
                      <span className="text-white/40 text-xs line-through">{formatMoney(originalPrice, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <BadgePercent size={11} /> Discount
                      </span>
                      <span className="text-emerald-400 text-xs font-bold">−{formatMoney(discount, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/8">
                      <span className="text-white text-xs font-black uppercase tracking-widest">You Pay</span>
                      <span className="text-2xl font-black text-white">{formatMoney(finalPrice, currency)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-white text-xs font-black uppercase tracking-widest">Price</span>
                    <span className="text-2xl font-black text-emerald-400">FREE</span>
                  </div>
                )}
              </div>

              {isEnrolled && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 text-xs font-black uppercase tracking-widest">Already Enrolled</span>
                </div>
              )}

              <Link
                to={`/learner-dashboard/catalogue/${courseId}`}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center"
              >
                View Course Details
              </Link>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
