import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Users,
  CheckCircle,
  CreditCard,
  Lock,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Building,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';
import { getDashboardPath } from '../../utils/authRoutes';

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

export default function JoinInstitution() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [keyword, setKeyword] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstId, setSelectedInstId] = useState('6a2fb5db3a92e61c1279099f');
  const [details, setDetails] = useState(null);
  
  const [searching, setSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle | opening | verifying

  // Search institutions when typing
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get(`/institutions/search?keyword=${encodeURIComponent(keyword)}&limit=10`);
        setInstitutions(res.data?.data?.institutions || res.data?.data || []);
      } catch (err) {
        console.error('Failed to search institutions:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [keyword]);

  // Load selected institution details
  useEffect(() => {
    if (!selectedInstId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const res = await apiClient.get(`/institutions/${selectedInstId}`);
        setDetails(res.data?.data || res.data);
      } catch (err) {
        console.error('Failed to fetch details:', err);
        toast.error('Unable to fetch institution details.');
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedInstId]);

  const handleJoin = async () => {
    if (!selectedInstId || !details) return;

    setSubmitting(true);
    setCheckoutStatus('opening');

    try {
      // 1. Initiate enrollment on backend
      const enrollRes = await apiClient.post('/institutions/enroll', {
        institutionId: selectedInstId
      });

      const enrollData = enrollRes.data?.data;
      
      // Scenario A: Free enrollment
      if (enrollData?.status === 'completed') {
        toast.success('🎉 Enrolled successfully!');
        
        // Refresh profile to update membership status
        const profileRes = await apiClient.get('/users/me');
        updateUser(profileRes.data?.data);
        
        // Redirect to dashboard
        navigate(getDashboardPath(profileRes.data?.data), { replace: true });
        return;
      }

      // Scenario B: Paid enrollment via Razorpay
      if (enrollData?.status === 'pending_payment') {
        if (!RAZORPAY_KEY_ID) {
          toast.error('Payment gateway key missing. Contact support.');
          setSubmitting(false);
          setCheckoutStatus('idle');
          return;
        }

        await loadRazorpayCheckout();

        const options = {
          key: RAZORPAY_KEY_ID,
          amount: Math.round(enrollData.feeSnapshot.totalInitialCost * 100),
          currency: enrollData.feeSnapshot.currency || 'INR',
          name: details.institution?.name || 'Institution Membership',
          description: 'Registration & Joining Fees',
          order_id: enrollData.paymentReference,
          prefill: {
            name: user?.fullName || user?.name || '',
            email: user?.email || '',
          },
          theme: { color: '#3b82f6' },
          handler: async (rzpRes) => {
            setCheckoutStatus('verifying');
            const tid = toast.loading('Verifying your payment...');
            try {
              const verifyRes = await apiClient.post('/institutions/payment/verify', {
                requestId: enrollData.requestId,
                razorpay_order_id: rzpRes.razorpay_order_id,
                razorpay_payment_id: rzpRes.razorpay_payment_id,
                razorpay_signature: rzpRes.razorpay_signature
              });

              toast.dismiss(tid);
              toast.success('🎉 Onboarding payment verified! Membership active.');

              // Fetch fresh user profile
              const profileRes = await apiClient.get('/users/me');
              updateUser(profileRes.data?.data);
              
              navigate(getDashboardPath(profileRes.data?.data), { replace: true });
            } catch (err) {
              console.error('Payment verification failed:', err);
              toast.dismiss(tid);
              toast.error(err.response?.data?.message || 'Payment verification failed. Please contact administrator.');
            } finally {
              setSubmitting(false);
              setCheckoutStatus('idle');
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setCheckoutStatus('idle');
              toast('Payment session cancelled.', { icon: '↩️' });
            }
          }
        };

        const checkout = new window.Razorpay(options);
        checkout.open();
      }
    } catch (err) {
      console.error('Enrollment initiation error:', err);
      toast.error(err.response?.data?.message || 'Failed to start enrollment. Please try again.');
      setSubmitting(false);
      setCheckoutStatus('idle');
    }
  };

  return (
    <div className="min-h-screen mesh-bg p-6 lg:p-12 relative flex flex-col items-center">
      {/* Background Glows */}
      <div className="glow-blob bg-blue-600 w-[600px] h-[600px] -top-20 -left-20 opacity-15"></div>
      <div className="glow-blob bg-cyan-600 w-[500px] h-[500px] bottom-0 right-0 opacity-10"></div>

      <div className="w-full max-w-7xl relative z-10 flex flex-col gap-10">
        {/* Title Section */}
        <div className="text-center">
          <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 mb-4">
            <Sparkles size={14} /> Institution Portal
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none mb-3">
            Onboard with an <span className="text-blue-400">Institution</span>
          </h1>
          <p className="text-blue-200/40 text-lg max-w-xl mx-auto">
            Discover institutions, explore curriculums, register for premium batches, and initiate membership.
          </p>
        </div>

        {/* Search & Detail Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Institution Search */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card p-6 border border-white/5 rounded-[32px] space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight">Educational Institution</h2>
              
              <div className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-600/15 border border-blue-500/50 shadow-lg shadow-blue-600/5 text-left transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center shrink-0">
                  <Building className="text-blue-400" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm truncate">EduCore Institute of Technology</p>
                </div>
                <CheckCircle size={16} className="shrink-0 text-blue-400" />
              </div>
            </div>

            {/* Alert banner if no active institution is set */}
            {!user?.institutionId && (
              <div className="p-5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 flex items-start gap-4">
                <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-amber-300 text-sm font-bold">Individual Account Status</p>
                  <p className="text-white/40 text-xs leading-relaxed mt-1">
                    You currently have an individual plan. Please note that <strong className="text-amber-300/80">batches are exclusively available to institution learners</strong>. Joining an educational institution grants you access to these premium batch cohorts, tutor resources, and interactive live classes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Details & Purchase */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {loadingDetails ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card min-h-[400px] border border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center gap-4"
                >
                  <Loader2 className="animate-spin text-blue-400" size={36} />
                  <p className="text-blue-200/40 text-sm">Retrieving details...</p>
                </motion.div>
              ) : details ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  {/* Institution Details Header */}
                  <div className="glass-card p-8 border border-white/5 rounded-[32px] space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          {details.institution?.logoUrl ? (
                            <img src={details.institution.logoUrl} alt={details.institution.name} className="w-full h-full object-cover rounded-[20px]" />
                          ) : (
                            <Building className="text-blue-400" size={28} />
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white leading-tight">{details.institution?.name}</h2>
                          <p className="text-blue-400 text-sm font-semibold mt-1 flex items-center gap-1.5">
                            <Building size={14} /> {details.institution?.location || 'Digital Campus'}
                          </p>
                        </div>
                      </div>

                      {/* Learner Count badge */}
                      <div className="px-4 py-2 bg-white/3 border border-white/5 rounded-2xl flex items-center gap-2">
                        <Users size={16} className="text-blue-400" />
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest font-black leading-none">Learners</p>
                          <p className="text-white font-bold text-sm mt-0.5">{(details.institution?.metadata?.learnerCount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-white/50 text-sm leading-relaxed">
                      {details.institution?.description || 'No description provided by the educational institution.'}
                    </p>
                  </div>

                  {/* Pricing / Fee Plan summary */}
                  <div className="glass-card p-8 border border-white/5 rounded-[32px] space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <CreditCard size={16} />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Enrollment Fee Structure</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Registration Fee', val: details.feePlan?.registrationFee || 0 },
                        { label: 'Joining Fee', val: details.feePlan?.joiningFee || 0 },
                        { label: 'Monthly Subscription', val: details.feePlan?.monthlyFee || 0 },
                      ].map(({ label, val }) => (
                        <div key={label} className="p-5 rounded-2xl bg-white/3 border border-white/5 flex flex-col justify-between">
                          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{label}</p>
                          <p className="text-2xl font-black text-white mt-3">{formatMoney(val, details.feePlan?.currency)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Total initial payment due */}
                    {details.feePlan?.paymentRequired && (details.feePlan?.registrationFee + details.feePlan?.joiningFee) > 0 ? (
                      <div className="p-5 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">Total Due Today</p>
                          <p className="text-xs text-white/40 mt-1">Includes registration and joining fee details.</p>
                        </div>
                        <p className="text-3xl font-black text-white">
                          {formatMoney((details.feePlan.registrationFee + details.feePlan.joiningFee), details.feePlan.currency)}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15 text-center">
                        <p className="text-emerald-400 text-sm font-black uppercase tracking-widest">Free Enrollment</p>
                        <p className="text-white/40 text-xs mt-1">No payment required to join this educational institution.</p>
                      </div>
                    )}

                    {/* Check if payment is required */}
                    <button
                      onClick={handleJoin}
                      disabled={submitting}
                      className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
                      style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
                        boxShadow: submitting ? 'none' : '0 12px 40px rgba(37,99,235,0.3)',
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          {checkoutStatus === 'verifying' ? 'Verifying payment...' : 'Opening gateway...'}
                        </>
                      ) : details.feePlan?.paymentRequired && (details.feePlan?.registrationFee + details.feePlan?.joiningFee) > 0 ? (
                        <>
                          <CreditCard size={18} />
                          Pay & Request Enrollment
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Request Direct Enrollment
                        </>
                      )}
                    </button>
                  </div>

                  {/* Institution published courses list */}
                  {details.courses?.length > 0 && (
                    <div className="glass-card p-8 border border-white/5 rounded-[32px] space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                          <BookOpen size={16} />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Curriculum & Courses</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {details.courses.map((course) => (
                          <div key={course._id} className="p-4 rounded-2xl bg-white/3 border border-white/5 flex gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-xl bg-white/5 overflow-hidden shrink-0">
                              <img src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80'} alt={course.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                              <h4 className="text-white font-bold text-xs truncate leading-snug">{course.title}</h4>
                              <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mt-1">
                                {course.level || 'All Levels'} • {course.isFree ? 'Free' : formatMoney(course.price, course.currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card min-h-[400px] border border-white/5 rounded-[32px] flex flex-col items-center justify-center p-10 text-center gap-5"
                >
                  <div className="w-16 h-16 rounded-[20px] bg-white/5 border border-white/5 flex items-center justify-center text-white/30">
                    <Building size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">No Institution Selected</h3>
                    <p className="text-white/40 text-sm max-w-sm mx-auto mt-1">
                      Search and select an educational institution on the left panel to review plans, curriculum details, and enroll.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
