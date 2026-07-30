import { useState, useEffect } from 'react';
import greenLogo from '../../assets/green-logo.png';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/useAuth';
import apiClient from '../../services/api';
import { getDashboardPath } from '../../utils/authRoutes';
import { Eye, EyeOff, Search, Building, GraduationCap, Users, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [step, setStep] = useState(location.state?.step || 'register'); // 'register' or 'verify-otp'
  
  const [formData, setFormData] = useState({
    fullName: location.state?.fullName || '',
    email: location.state?.email || '',
    password: '',
    confirmPassword: '',
  });

  const [registrationMode, setRegistrationMode] = useState(location.state?.registrationMode || 'individual_learner'); // 'individual_learner', 'individual_tutor'

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);



  // Handle Input Change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getRegistrationType = () => {
    return registrationMode;
  };

  // Handle Form Submit - Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    const registrationType = getRegistrationType();

    try {
      setLoading(true);

      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        registrationType,
      };

      await apiClient.post('/auth/register', payload);

      setMessage('Registration successful! Please check your email for the OTP.');
      setStep('verify-otp');
    } catch (err) {
      // Show field-level details if available (e.g. Joi validation errors)
      const details = err.response?.data?.details;
      if (details && details.length > 0) {
        setError(details.map(d => d.message).join(' | '));
      } else {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!otp || otp.length !== 6) {
      return setError('Please enter a valid 6-digit OTP');
    }

    const registrationType = getRegistrationType();

    try {
      setLoading(true);

      const response = await apiClient.post('/auth/verify-email', {
        email: formData.email,
        otp,
        rememberMe: false,
      });

      setMessage(response.data.message || 'Email verified successfully!');
      const authData = response.data.data;
      
      // Clear form and redirect
      setTimeout(() => {
        if (authData?.accessToken) {
          login(authData);
          if (authData.user?.role === 'tutor' && authData.user?.status === 'pending_approval') {
            navigate('/tutor-approval');
          } else {
            navigate(getDashboardPath(authData.user));
          }
        } else if (registrationType.endsWith('tutor')) {
          navigate('/tutor-approval', { state: { email: formData.email } });
        } else {
          navigate('/login');
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    setError('');
    setMessage('');

    try {
      setLoading(true);

      await apiClient.post('/auth/resend-otp', {
        email: formData.email,
      });

      setMessage('OTP resent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = step === 'register' ? handleRegisterSubmit : handleOtpSubmit;

  return (
    <div className="theme-learner dashboard-container mesh-bg flex items-center justify-center p-3 sm:p-6 overflow-y-auto min-h-screen py-6">
      {/* Background Blobs */}
      <div className="glow-blob bg-blue-600 w-[600px] h-[600px] -top-20 -left-20 opacity-20"></div>
      <div className="glow-blob bg-purple-600 w-[500px] h-[500px] bottom-0 right-0 opacity-10"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl glass-panel rounded-3xl lg:rounded-[48px] overflow-hidden shadow-2xl relative z-10 my-4 sm:my-8"
      >
        <div className="flex flex-col lg:flex-row min-h-0 lg:min-h-[600px]">
          {/* Side Info */}
          <div className="hidden lg:flex lg:w-1/3 bg-white/[0.03] p-8 lg:p-12 border-r border-white/5 flex-col justify-between">
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <img
                src={greenLogo}
                alt="EduCore"
                className="w-40 h-40 object-contain mb-8 mx-auto drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              />
              <h2 className="text-3xl font-bold text-white mb-4 font-elmessiri">EDUCORE</h2>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-2">Modern Online Learning Platform</p>
              <p className="text-blue-200/40 text-sm font-elmessiri">Create your account and start your journey.</p>
            </div>
            
            <div className="mt-12 flex flex-col items-center">

               <p className="text-xs font-bold text-blue-300/20 uppercase tracking-[0.2em]">Learn and Upgrade yourself</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="lg:w-2/3 p-6 sm:p-10 lg:p-16 bg-white/[0.01]">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter neon-text">
                {step === 'register' ? <>Create <span className="text-blue-400">Account</span></> : <>Verify <span className="text-blue-400">Security</span></>}
              </h1>
              <p className="text-blue-200/40">{step === 'register' ? 'Welcome to EduCore. Create your account to continue.' : 'Enter the OTP sent to your email address.'}</p>
            </div>

            {message && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium">
                {message}
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                {error}
              </motion.div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {step === 'register' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Email Id</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@example.com"
                        className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-20 text-sm font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-350 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">confirm password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-20 text-sm font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-350 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Registration Mode Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Select Registration Category</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { mode: 'individual_learner', label: 'Individual Learner', desc: 'Study at your own pace.' },
                        { mode: 'individual_tutor', label: 'Individual Tutor', desc: 'Create & sell courses.' }
                      ].map(item => (
                        <label key={item.mode} className={`relative glass-panel rounded-2xl p-4 cursor-pointer transition-all duration-300 group flex flex-col justify-between ${
                          registrationMode === item.mode ? 'bg-blue-500/20 border-blue-500' : 'hover:bg-white/5'
                        }`}>
                          <input type="radio" name="registrationMode" value={item.mode} checked={registrationMode === item.mode} onChange={() => { setRegistrationMode(item.mode); }} className="hidden" />
                          <div>
                            <span className={`font-bold block mb-1 text-sm transition-colors ${registrationMode === item.mode ? 'text-blue-400' : 'text-white'}`}>
                              {item.label}
                            </span>
                            <p className="text-[11px] text-blue-200/40 font-medium">
                              {item.desc}
                            </p>
                          </div>
                          {registrationMode === item.mode && <motion.div layoutId="mode-indicator" className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                        </label>
                      ))}
                    </div>
                  </div>


                </>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1 text-center block">Access Token</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-8 text-white text-5xl font-bold text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                      required
                    />
                  </div>
                  <button type="button" onClick={handleResendOtp} disabled={loading} className="w-full text-center text-xs text-blue-300/40 font-bold uppercase tracking-widest hover:text-blue-400 transition-all disabled:opacity-50">
                    Resend Authorization Token
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full neon-button text-white py-5 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 mt-8"
              >
                {loading ? 'Processing...' : (step === 'register' ? 'Register' : 'Verify Security')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-blue-200/40 font-bold tracking-tight">
                Already a user? <span className="text-blue-400 cursor-pointer hover:text-blue-300 transition-all" onClick={() => navigate('/login')}>Login Here</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
