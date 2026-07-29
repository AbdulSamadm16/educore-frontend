import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/useAuth';
import apiClient from '../../services/api';
import { getDashboardPath } from '../../utils/authRoutes';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  // Force clean state on login page load to prevent stale cache/UI issues
  useState(() => {
    const isCleaned = sessionStorage.getItem('ui_cleanup_done');
    if (!isCleaned) {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('ui_cleanup_done', 'true');
      window.location.reload();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        rememberMe: false,
      });
      const authData = response.data.data;

      login(authData);

      if (authData.user?.role === 'tutor' && authData.user?.status === 'pending_approval') {
        navigate('/tutor-approval', { replace: true });
        return;
      }

      if (authData.user?.role === 'tutor' && authData.user?.status === 'rejected') {
        navigate('/tutor-rejected', { state: { email: authData.user.email }, replace: true });
        return;
      }
      
      // Check if there is a 'from' location to return to
      const from = location.state?.from || getDashboardPath(authData.user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'ACCOUNT_PENDING_APPROVAL') {
        navigate('/pending-approval', { state: { email } });
        return;
      }

      if (err.response?.data?.code === 'ACCOUNT_REJECTED') {
        const fullName = err.response?.data?.details?.fullName || '';
        navigate('/tutor-rejected', { state: { email, fullName } });
        return;
      }

      if (err.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        // We do not have the role stored on frontend at this moment since they couldn't log in,
        // but we can just pass 'learner' as fallback or remove role requirement for verify-otp step
        navigate('/register', { state: { email, step: 'verify-otp', role: 'learner' } });
        return;
      }

      if (err.response?.data?.code === 'INVALID_CREDENTIALS') {
        setError('invalid credentials');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-learner dashboard-container mesh-bg flex items-center justify-center p-6">
      {/* Background Blobs */}
      <div className="glow-blob bg-blue-600 w-[600px] h-[600px] -top-20 -left-20 opacity-20"></div>
      <div className="glow-blob bg-cyan-600 w-[500px] h-[500px] bottom-0 right-0 opacity-10"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-7xl min-h-[700px] glass-panel rounded-[48px] overflow-hidden grid grid-cols-1 lg:grid-cols-2 relative z-10"
      >
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="hidden lg:flex flex-col items-center justify-center bg-white/5 p-12 border-r border-white/5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none"></div>
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

        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="flex items-center justify-center p-12 lg:p-20 bg-white/[0.02]"
        >
          <div className="w-full max-w-md">
            <div className="mb-12">
              <h1 className="text-6xl font-bold text-white mb-4 tracking-tighter neon-text">
                Login <span className="text-blue-400">Portal</span>
              </h1>
              <p className="text-blue-200/40 text-lg">Welcome Back</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Email Id</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

               <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-20"
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

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-300/40 hover:text-blue-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full neon-button text-white py-5 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 mt-4 shadow-xl shadow-blue-600/20"
              >
                {loading ? 'Authenticating...' : 'Login'}
              </button>
            </form>

            <div className="mt-12 text-center">
              <Link
                to="/register"
                className="text-blue-200/40 hover:text-blue-400 font-bold tracking-tight transition-all"
              >
                New User? <span className="text-blue-400">Register here</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
