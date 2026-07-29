import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, LogOut, Mail, ShieldX, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/useAuth';
import apiClient from '../../services/api';

const notices = {
  'verify-email': {
    icon: Mail,
    title: 'Verify your email',
    body: 'Please complete email verification before opening your dashboard.',
    actionLabel: 'Back to login',
    actionTo: '/login',
    tone: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  'pending-approval': {
    icon: CheckCircle2,
    title: 'Approval pending',
    body: 'Your tutor account is verified and waiting for administrator approval.',
    actionLabel: 'Update application',
    actionTo: '/tutor-approval',
    tone: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  'account-suspended': {
    icon: ShieldX,
    title: 'Account unavailable',
    body: 'This account cannot access the platform right now.',
    actionLabel: 'Back to login',
    actionTo: '/login',
    tone: 'text-red-700 bg-red-50 border-red-200',
  },
  'institution-setup-required': {
    icon: ShieldAlert,
    title: 'Onboarding Action Required',
    body: 'Your administrator account has not been linked to an educational institution yet. Please contact the platform owner or use the platform owner portal to complete the setup.',
    actionLabel: 'Back to login',
    actionTo: '/login',
    tone: 'text-red-700 bg-red-50 border-red-200',
  },
  'tutor-rejected': {
    icon: ShieldX,
    title: 'Application Rejected',
    body: 'Your application to become a tutor has been rejected by the administrator.',
    actionLabel: 'Update application',
    actionTo: '/tutor-approval',
    tone: 'text-red-700 bg-red-50 border-red-200',
  },
  unauthorized: {
    icon: AlertTriangle,
    title: 'Access unavailable',
    body: 'Your account does not have access to that page.',
    actionLabel: 'Go to dashboard',
    actionTo: '/dashboard',
    tone: 'text-slate-700 bg-slate-50 border-slate-200',
  },
};

export default function AccountNotice({ type = 'unauthorized' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const [loadedRejectionReason, setLoadedRejectionReason] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const notice = notices[type] || notices.unauthorized;
  const Icon = notice.icon;
  const email = location.state?.email || user?.email;
  const rejectionReason = user?.profile?.tutorApproval?.rejectionReason || loadedRejectionReason;
  const actionTo = isAuthenticated ? notice.actionTo : '/login';
  const actionLabel = isAuthenticated ? notice.actionLabel : 'Back to login';

  useEffect(() => {
    if (type !== 'tutor-rejected' || !isAuthenticated || rejectionReason) {
      return;
    }

    let cancelled = false;

    apiClient.get('/users/me/tutor-approval')
      .then((response) => {
        if (cancelled) return;
        const data = response.data?.data || {};
        const reason = data.tutorApproval?.rejectionReason || '';
        setLoadedRejectionReason(reason);
        if (data.user) {
          updateUser(data.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedRejectionReason('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [type, isAuthenticated, rejectionReason, updateUser]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="theme-learner dashboard-container mesh-bg flex items-center justify-center p-6">
      {/* Background Blobs */}
      <div className="glow-blob bg-blue-600 w-[400px] h-[400px] -top-20 -left-20 opacity-20"></div>
      <div className="glow-blob bg-purple-600 w-[300px] h-[300px] bottom-0 right-0 opacity-10"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg glass-panel rounded-[40px] p-10 lg:p-12 relative z-10 text-center"
      >
        <div className="flex justify-center mb-8">
           <div className="w-20 h-20 rounded-[24px] glass-panel flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors"></div>
             <Icon size={36} className="text-blue-400 relative z-10" />
           </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight neon-text">{notice.title}</h1>
        <p className="text-blue-200/40 text-lg leading-relaxed">{notice.body}</p>

        {type === 'tutor-rejected' && rejectionReason && (
          <div className="mt-8 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-left">
            <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-2">Reason</p>
            <p className="text-red-100/80 text-sm leading-6">{rejectionReason}</p>
          </div>
        )}

        {email && (
          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-xs font-bold text-blue-300/20 uppercase tracking-widest mb-1">Network Identity</p>
            <p className="text-white font-medium">{email}</p>
          </div>
        )}

        <Link
          to={actionTo}
          className="inline-flex items-center justify-center w-full mt-10 neon-button text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20"
        >
          {actionLabel}
        </Link>

        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white py-4 text-sm font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={18} aria-hidden="true" />
            {isLoggingOut ? 'Signing out...' : 'Log out'}
          </button>
        )}

      </motion.div>
    </div>
  );
}
