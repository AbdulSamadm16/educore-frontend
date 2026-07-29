import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const tokenError = token ? '' : 'Invalid or missing reset token';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/^(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      setError('Password must contain at least one uppercase letter and one number');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });

      setSuccess('Password reset successfully! Redirecting to login...');
      setPassword('');
      setConfirmPassword('');
      
      // Redirect to login after 4 seconds
      setTimeout(() => {
        navigate('/login');
      }, 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-learner dashboard-container mesh-bg flex items-center justify-center p-6">
      {/* Background Blobs */}
      <div className="glow-blob bg-blue-600 w-[600px] h-[600px] -top-20 -left-20 opacity-20"></div>
      <div className="glow-blob bg-purple-600 w-[500px] h-[500px] bottom-0 right-0 opacity-10"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl min-h-[700px] glass-panel rounded-[60px] overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-2 relative z-10 border-white/5"
      >
        {/* Logo Section */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-white/[0.02] p-20 relative overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center relative z-10"
          >
            <div className="flex flex-col items-center relative z-10">
            <img
              src="src/assets/green-logo.png"
              alt="EduCore text logo"
              className="w-60 h-60 object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            />
            <div className="mt-8 text-center">
              <h1 className="text-5xl font-bold text-white mb-2 tracking-tight font-elmessiri">EDUCORE</h1>
              <p className="text-blue-200/40 font-medium text-2xl font-elmessiri">MODERN ONLINE LEARNING PLATFORM</p>
            </div>
          </div>
          </motion.div>
        </div>

        {/* Form Section */}
        <div className="flex items-center justify-center p-10 lg:p-20 bg-[#0b0f1a]/50">
          <div className="w-full max-w-md">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-12 font-bold uppercase tracking-widest text-xs gap-2"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>

            <h1 className="text-5xl font-black text-white mb-4 tracking-tight neon-text">
              Reset <span className="text-blue-400">Password</span>
            </h1>
            
            <p className="text-blue-200/40 text-lg mb-10 font-medium">
            Enter a new password below.
            </p>

            {(tokenError || (error && error.includes('Invalid'))) ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium mb-8">
                {tokenError || error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-14"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/20 hover:text-blue-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-14"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/20 hover:text-blue-400 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || !token}
                className="w-full neon-button text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 mt-4"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </motion.button>

              <AnimatePresence>
                {error && !error.includes('Invalid') && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-center text-sm font-medium"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className="mt-10 text-center">
              <p className="text-[10px] font-black text-blue-300/20 uppercase tracking-[0.2em]">
                Password requirement: minimum 8 characters, uppercase letter, and number
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
