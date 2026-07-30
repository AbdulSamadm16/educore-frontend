import { useState } from 'react';
import greenLogo from '../../assets/green-logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/auth/forgot-password', { email });

      setSuccess('Password reset link has been sent to your email. Please check your inbox.');
      setEmail('');
      
      // Redirect back to login after 4 seconds
      setTimeout(() => {
        navigate('/login');
      }, 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-learner dashboard-container mesh-bg flex items-center justify-center p-3 sm:p-6 min-h-screen py-8">
      {/* Background Blobs */}
      <div className="glow-blob bg-blue-600 w-[600px] h-[600px] -top-20 -left-20 opacity-20"></div>
      <div className="glow-blob bg-cyan-600 w-[500px] h-[500px] bottom-0 right-0 opacity-10"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl min-h-0 lg:min-h-[700px] glass-panel rounded-3xl lg:rounded-[60px] overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-2 relative z-10 border-white/5"
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
              src={greenLogo}
              alt="EduCore text logo"
              className="w-60 h-60 object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            />
            <div className="mt-8 text-center">
              <h1 className="text-5xl font-bold text-white mb-2 tracking-tight font-elmessiri">EDUCORE</h1>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">MODERN ONLINE LEARNING PLATFORM</p>
            </div>
          </div>
          </motion.div>
        </div>

        {/* Form Section */}
        <div className="flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-[#0b0f1a]/50">
          <div className="w-full max-w-md">
            <Link
              to="/login"
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8 sm:mb-12 font-bold uppercase tracking-widest text-xs gap-2"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>

            <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight neon-text">
              Forgot <span className="text-blue-400">password</span>
            </h1>
            
            <p className="text-blue-200/40 text-lg mb-10 font-medium">
              Enter your email address and we'll send you a link to reset your password
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full neon-button text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending link...' :  'Send Link'}
              </motion.button>

              <AnimatePresence>
                {error && (
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
          </div>
        </div>
      </motion.div>
    </div>
  );
}
