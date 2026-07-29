import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Save, Key, Mail, User as UserIcon, Loader2, ArrowLeft, Shield } from 'lucide-react';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

export default function Profile() {
  const { user, updateUser, logout, refreshToken } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const fileInputRef = useRef(null);

  // Form states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  // Email state
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  // Revoke previous object URL on change or unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);


  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/users/me');
      const data = response.data.data.user;
      setProfile(data);
      setName(data.name || '');
      setBio(data.profile?.bio || '');
      setAvatarPreview(data.profile?.avatarUrl || '');
    } catch (error) {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      if (name !== profile.name) formData.append('name', name);
      if (bio !== profile.profile?.bio) formData.append('bio', bio);
      if (avatarFile) formData.append('avatar', avatarFile);

      if (!formData.entries().next().done) {
        const response = await apiClient.put('/users/me', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const updatedUser = response.data.data.user;
        setProfile(updatedUser);
        updateUser(updatedUser);
        showToast('Profile updated successfully!');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.put('/users/change-email', { 
        email: newEmail,
        currentPassword: emailChangePassword
      });
      if (response.data.data.emailChange.requiresVerification) {
        setShowOtpInput(true);
        showToast('OTP sent to new email');
      } else {
        showToast('Email is already the same', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to initiate email change', 'error');
    }
  };

  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/users/verify-email-change', { 
        otp: emailOtp,
        refreshToken 
      });
      setProfile(response.data.data.user);
      updateUser(response.data.data.user);
      setShowOtpInput(false);
      setNewEmail('');
      setEmailChangePassword('');
      setEmailOtp('');
      showToast('Email updated successfully!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    try {
      await apiClient.put('/users/change-password', { 
        currentPassword, 
        newPassword,
        confirmPassword: confirmNewPassword
      });
      showToast('Password changed successfully! Redirecting to login...');
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to change password', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse">Loading Profile</p>
        </div>
      </div>
    );
  }

  const roleTheme = `theme-${user?.role || 'learner'}`;

  return (
    <div className={`${roleTheme} dashboard-container mesh-bg py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto`}>
      {/* Background Blobs */}
      <div className="glow-blob bg-blue-600 w-[600px] h-[600px] -top-20 -left-20 opacity-20"></div>
      <div className="glow-blob bg-purple-600 w-[500px] h-[500px] bottom-0 right-0 opacity-10"></div>

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            className={`fixed top-8 right-8 p-6 rounded-2xl shadow-2xl z-[200] text-white font-bold glass-panel border-l-4 ${toast.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}
          >
            {toast.message}
          </motion.div>
        )}

        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 light-profile-back-btn hover:text-white border border-white/10 rounded-2xl text-xs font-bold transition-all mb-6 group cursor-pointer"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Go Back
            </button>
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight neon-text">
              Identity <span className="text-blue-400">Settings</span>
            </h1>
            <p className="text-blue-200/40 text-lg font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Manage your profile and account security.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - General Info & Avatar */}
          <div className="lg:col-span-2 space-y-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[32px] overflow-hidden"
            >
              <div className="p-8 lg:p-12">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-10">
                  <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                  Public Identity
                </h2>
                
                <form onSubmit={handleSaveProfile} className="space-y-10">
                  <div className="flex flex-col sm:flex-row gap-10 items-center sm:items-start">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-[32px] overflow-hidden glass-panel border-4 border-white/5 relative shadow-2xl">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <UserIcon className="text-blue-400/20" size={48} />
                          </div>
                        )}
                        <div 
                          className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 backdrop-blur-sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="text-white" size={32} />
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    
                    <div className="flex-1 space-y-8 w-full">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Display Name</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Identity Bio</label>
                        <textarea 
                          value={bio} 
                          onChange={(e) => setBio(e.target.value)}
                          rows={4}
                          maxLength={500}
                          className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                          placeholder="Share a short bio..."
                        />
                        <p className="text-[10px] text-blue-300/20 font-bold text-right tracking-widest">{bio.length} / 500 characters</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-8 border-t border-white/5">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      disabled={saving}
                      className="flex items-center gap-3 px-10 py-4 neon-button text-white rounded-2xl font-bold transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Update Profile
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>

            {/* Email Change Section */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-[32px] overflow-hidden"
            >
              <div className="p-8 lg:p-12">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-10">
                  <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                  Network Address
                </h2>
                
                <div className="mb-10 glass-panel p-6 rounded-2xl border border-white/5 relative group">
                  <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <p className="text-xs font-bold text-blue-300/40 uppercase tracking-widest mb-1 relative z-10">Current Connection</p>
                  <p className="text-xl font-medium text-white relative z-10">{profile?.email}</p>
                </div>

                {(() => {
                  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'platform_owner';
                  if (isAdmin) {
                    return (
                      <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400 text-sm font-medium flex items-start gap-4">
                        <Shield className="flex-shrink-0 mt-0.5 text-emerald-400 animate-pulse" size={20} />
                        <div>
                        <p className="font-bold text-white mb-1">Administrative Email Change Restricted</p>
                          <p className="text-white/40 leading-relaxed text-xs">
                            Administrative email addresses cannot be changed here. Please contact platform support for account-wide updates.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  
                  return !showOtpInput ? (
                    <form onSubmit={handleRequestEmailChange} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">New Address</label>
                        <input 
                          type="email" 
                          value={newEmail} 
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          required
                          placeholder="new@network.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Password</label>
                        <input 
                          type="password" 
                          value={emailChangePassword} 
                          onChange={(e) => setEmailChangePassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          required
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="px-10 py-4 glass-panel text-white rounded-2xl font-bold hover:bg-white/10 transition-all border border-white/10">
                        Change Email
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyEmailChange} className="space-y-8">
                    <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-300 text-sm font-medium">
                      An authorization token has been transmitted to <strong className="text-blue-100">{newEmail}</strong>. Provide the token to establish the new connection.
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1 text-center block">Verification Token</label>
                      <input 
                        type="text" 
                        value={emailOtp} 
                        onChange={(e) => setEmailOtp(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 px-6 py-6 rounded-2xl text-white text-3xl font-bold text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="000000"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-4">
                      <button type="button" onClick={() => setShowOtpInput(false)} className="px-8 py-4 text-blue-300/40 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs">
                        cancel
                      </button>
                      <button type="submit" className="px-10 py-4 neon-button text-white rounded-2xl font-bold transition-all">
                        verify & update
                      </button>
                    </div>
                  </form>
                );
              })()}
            </div>
            </motion.div>
          </div>

          {/* Right Column - Security & Metadata */}
          <div className="space-y-10">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[32px] overflow-hidden"
            >
              <div className="p-8 lg:p-10">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-10">
                  <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                  Security
                </h2>
                
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Current Password</label>
                    <input 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-300/40 uppercase tracking-widest ml-1">Verify New Password</label>
                    <input 
                      type="password" 
                      value={confirmNewPassword} 
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                      minLength={8}
                    />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="w-full mt-4 py-5 neon-button text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20"
                  >
                    Change Password
                  </motion.button>
                </form>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-10 rounded-[40px] border-none relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-50"></div>
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] mb-8 relative z-10">Account Details</h3>
              <div className="space-y-8 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-300/20 uppercase tracking-widest mb-1">Access Level</span>
                  <span className="text-2xl font-bold text-white capitalize tracking-tight">{profile?.role?.replace('_', ' ')}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-300/20 uppercase tracking-widest mb-1">Authorization Status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                    <span className="text-2xl font-bold text-blue-400 capitalize tracking-tight">{profile?.status?.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-300/20 uppercase tracking-widest mb-1">Entity Initialization</span>
                  <span className="text-2xl font-bold text-white font-mono tracking-tighter">
                    {new Date(profile?.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
