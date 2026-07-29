import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarCheck, CheckCircle2, CreditCard, Loader2, Shield, Unlink, User, ArrowLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { tutorGoogleService } from '../../services/tutorGoogle.service';
import { useAuth } from '../../context/useAuth';

export default function TutorSettings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  const processedGoogleAuthRef = useRef(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const googleAuthStatus = searchParams.get('google_auth');

  const [activeSection, setActiveSection] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingStates, setSavingStates] = useState({});
  const isGoogleConnected = useMemo(
    () => googleAuthStatus === 'success' || Boolean(user?.googleConnected),
    [googleAuthStatus, user?.googleConnected]
  );

  const sections = [
    { icon: User, label: 'Profile Settings', desc: 'Manage your public tutor profile and bio' },
    { icon: Bell, label: 'Notifications', desc: 'Control how you receive updates and alerts' },
    { icon: Shield, label: 'Security', desc: 'Update your password and account protection' },
    { icon: CreditCard, label: 'Payout Methods', desc: 'Set up how you want to receive your earnings' },
  ];

  useEffect(() => {
    let ignore = false;

    const refreshGoogleStatus = async () => {
      try {
        const response = await apiClient.get('/users/me');
        const freshUser = response.data?.data?.user;

        if (!ignore && freshUser) {
          updateUser(freshUser);
        }
      } catch (error) {
        console.error('Failed to refresh Google connection status:', error);
      }
    };

    refreshGoogleStatus();

    return () => {
      ignore = true;
    };
  }, [updateUser]);

  useEffect(() => {
    if (!googleAuthStatus || processedGoogleAuthRef.current === googleAuthStatus) {
      return;
    }

    processedGoogleAuthRef.current = googleAuthStatus;

    if (googleAuthStatus === 'success') {
      updateUser({ ...user, googleConnected: true });
      toast.success('Google account connected. You can now schedule Meet live classes.');
    } else if (googleAuthStatus === 'error') {
      toast.error('Google account connection failed. Please try again.');
    } else {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('google_auth');
    setSearchParams(nextParams, { replace: true });
  }, [googleAuthStatus, searchParams, setSearchParams, updateUser, user]);

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const response = await tutorGoogleService.getAuthUrl();
      const authUrl = response.data?.data?.authUrl;

      if (!authUrl) {
        throw new Error('Google authorization URL was not returned.');
      }

      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start Google OAuth:', error);
      toast.error(error.response?.data?.message || 'Could not start Google connection.');
      setConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setDisconnecting(true);
    try {
      await tutorGoogleService.disconnect();
      updateUser({ ...user, googleConnected: false });
      toast.success('Google account disconnected.');
    } catch (error) {
      console.error('Failed to disconnect Google account:', error);
      toast.error(error.response?.data?.message || 'Could not disconnect Google account.');
    } finally {
      setDisconnecting(false);
    }
  };

  const typesToShow = [
    { key: 'newStudentEnrolled', label: 'New Student Enrolled', desc: 'Get notified immediately when a new learner enrolls in your courses.' },
    { key: 'assignmentGraded', label: 'Student Assignment Submissions', desc: 'Receive alerts when students submit homework assignments that require grading.' },
    { key: 'paymentSuccess', label: 'Course Purchase Transactions', desc: 'Receive notifications and billing confirmations for successful student course purchases.' },
    { key: 'liveClassReminder', label: 'Live Virtual Class Reminders', desc: 'Get reminders before your scheduled live interactive sessions begin.' }
  ];


  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/users/me/notification-settings');
      setSettings(response.data?.data?.notificationSettings);
    } catch (err) {
      toast.error('Failed to load notification settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'Notifications') {
      fetchSettings();
    }
  }, [activeSection]);

  const handleToggle = async (type, channel) => {
    const key = `${type}_${channel}`;
    setSavingStates(prev => ({ ...prev, [key]: 'saving' }));

    const currentValue = settings[type]?.[channel] ?? true;
    const updatedValue = !currentValue;

    // Optimistic UI update
    setSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: updatedValue
      }
    }));

    try {
      await apiClient.patch('/users/me/notification-settings', {
        [type]: {
          [channel]: updatedValue
        }
      });

      setSavingStates(prev => ({ ...prev, [key]: 'saved' }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [key]: null }));
      }, 1500);
    } catch (err) {
      toast.error('Failed to update setting.');
      // Revert UI update
      setSettings(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [channel]: currentValue
        }
      }));
      setSavingStates(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleSectionClick = (sectionLabel) => {
    if (sectionLabel === 'Notifications') {
      setActiveSection('Notifications');
    } else if (sectionLabel === 'Profile Settings') {
      navigate('/profile');
    } else {
      toast.error(`${sectionLabel} is not implemented in this demo.`);
    }
  };

  if (activeSection === 'Notifications') {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="mb-8">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-all text-sm font-bold uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Back to Settings</span>
          </button>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-elmessiri">Notification Settings</h2>
          <p className="text-white/40 font-medium text-sm">Control which updates you receive and where.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-500" size={32} />
          </div>
        ) : settings ? (
          <div className="glass-card rounded-[32px] border border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {typesToShow.map((type) => (
                <div key={type.key} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.01] transition-colors">
                  <div className="max-w-xl">
                    <h4 className="text-lg font-bold text-white mb-1">{type.label}</h4>
                    <p className="text-sm text-white/45 leading-relaxed">{type.desc}</p>
                  </div>
                  
                  <div className="flex items-center gap-8 self-end md:self-center">
                    {/* Email Channel */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end min-w-[50px]">
                        <span className="text-xs font-bold text-white/70">Email</span>
                        {savingStates[`${type.key}_email`] === 'saving' && (
                          <span className="text-[10px] text-purple-400 animate-pulse">Saving...</span>
                        )}
                        {savingStates[`${type.key}_email`] === 'saved' && (
                          <span className="text-[10px] text-emerald-400">Saved!</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(type.key, 'email')}
                        disabled={savingStates[`${type.key}_email`] === 'saving'}
                        className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                          settings[type.key]?.email ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ${
                            settings[type.key]?.email ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white/40'
                          }`}
                        />
                      </button>
                    </div>

                    {/* In-App Channel */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end min-w-[50px]">
                        <span className="text-xs font-bold text-white/70">In-App</span>
                        {savingStates[`${type.key}_inApp`] === 'saving' && (
                          <span className="text-[10px] text-purple-400 animate-pulse">Saving...</span>
                        )}
                        {savingStates[`${type.key}_inApp`] === 'saved' && (
                          <span className="text-[10px] text-emerald-400">Saved!</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(type.key, 'inApp')}
                        disabled={savingStates[`${type.key}_inApp`] === 'saving'}
                        className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                          settings[type.key]?.inApp ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ${
                            settings[type.key]?.inApp ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white/40'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-white/40">
            Failed to load settings. Please try again.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">

      <div className="glass-card rounded-[28px] p-7 border border-white/10 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-300">
              <CalendarCheck size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.25em]">Google Meet</p>
                {isGoogleConnected && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-black uppercase tracking-widest border border-emerald-400/20">
                    <CheckCircle2 size={12} />
                    Connected
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Google Calendar connection</h3>
              <p className="text-sm text-white/45 max-w-2xl leading-6">
                {isGoogleConnected
                  ? 'Your Google account is connected for Calendar events and Meet links.'
                  : 'Connect your Google account so EduCore can create Calendar events and Meet links when you schedule live classes.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={connecting}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 disabled:opacity-60 rounded-2xl font-black transition-all ${
                isGoogleConnected
                  ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/20 hover:bg-emerald-500/15'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {connecting ? <Loader2 size={18} className="animate-spin" /> : isGoogleConnected ? <CheckCircle2 size={18} /> : <CalendarCheck size={18} />}
              {isGoogleConnected ? 'Connected' : 'Connect Google Account'}
            </button>
            <button
              type="button"
              onClick={handleDisconnectGoogle}
              disabled={disconnecting || !isGoogleConnected}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-white border border-white/10 rounded-2xl font-bold transition-all"
            >
              {disconnecting ? <Loader2 size={18} className="animate-spin" /> : <Unlink size={18} />}
              Disconnect
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, i) => (
          <div 
            key={i} 
            onClick={() => handleSectionClick(section.label)}
            className="glass-card rounded-[32px] p-8 border border-white/5 hover:border-purple-500/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/5 rounded-2xl text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                <section.icon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{section.label}</h3>
                <p className="text-sm text-white/40">{section.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
