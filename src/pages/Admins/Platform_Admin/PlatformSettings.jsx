import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Bell, Monitor, 
  Smartphone, CreditCard, ChevronRight, Save, Database, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function PlatformSettings() {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingStates, setSavingStates] = useState({});

  const sections = [
    { id: 'general', title: 'General Settings', icon: Settings, desc: 'Platform name, logo, and basic configuration.' },
    { id: 'security', title: 'Security & Access', icon: Shield, desc: 'Authentication, API keys, and platform-wide permissions.' },
    { id: 'billing', title: 'Revenue & Commission', icon: CreditCard, desc: 'Set platform fees and payout schedules.' },
    { id: 'notifications', title: 'Notification System', icon: Bell, desc: 'Email templates and system-wide alerts.' },
    { id: 'system', title: 'System Infrastructure', icon: Database, desc: 'CDN, storage, and server-side configurations.' },
  ];

  const typesToShow = [
    { key: 'enrollmentConfirmed', label: 'Student Registrations & Enrollments', desc: 'Get notified when new student accounts are created or learners enroll in courses.' },
    { key: 'newLesson', label: 'Course Review Submissions', desc: 'Receive alerts when tutors submit new courses or major curriculum updates for approval.' },
    { key: 'liveClassReminder', label: 'Live Virtual Class Alerts', desc: 'Get alerts for scheduled virtual classes, meetings, and webinars within the platform.' },
    { key: 'assignmentGraded', label: 'Academic Submissions & Grading', desc: 'Get notified of student homework submissions and when tutor grading activities are completed.' },
    { key: 'quizResult', label: 'Assessment & Quiz Completions', desc: 'Receive alerts when students complete online quizzes and exams.' },
    { key: 'paymentSuccess', label: 'Sales & Revenue Transactions', desc: 'Receive real-time notifications for successful course payments, purchases, and billing.' },
    { key: 'newStudentEnrolled', label: 'Tutor Registrations', desc: 'Get notified when new tutors register and await profile approval.' }
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
    if (activeSection === 'notifications') {
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

  const handleSaveAll = () => {
    toast.success('All general settings saved.');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-elmessiri">
            Platform Configuration
          </h2>
          <p className="text-white/40 font-medium text-sm">Manage global LMS settings.</p>
        </div>
        
        {activeSection === 'general' && (
          <button 
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Save size={18} />
            Save All Changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-4 space-y-2">
           {sections.map((section) => {
             const isActive = activeSection === section.id;
             return (
               <button 
                 key={section.id}
                 onClick={() => setActiveSection(section.id)}
                 className={`w-full group text-left p-6 glass-card rounded-[24px] border transition-all flex items-center gap-4 relative overflow-hidden ${
                   isActive ? 'border-amber-500/30 bg-white/[0.02]' : 'border-white/5 hover:border-amber-500/20 hover:bg-white/[0.02]'
                 }`}
               >
                  <div className={`p-3 rounded-2xl transition-all ${
                    isActive ? 'text-amber-400 bg-amber-500/10' : 'bg-white/5 text-white/40 group-hover:text-amber-400 group-hover:bg-amber-500/10'
                  }`}>
                     <section.icon size={24} />
                  </div>
                  <div>
                     <h4 className={`text-sm font-bold transition-colors ${
                       isActive ? 'text-amber-400' : 'text-white group-hover:text-amber-400'
                     }`}>{section.title}</h4>
                     <p className="text-[10px] text-white/30 font-medium">{section.desc}</p>
                  </div>
                  <ChevronRight className={`ml-auto transition-colors ${
                    isActive ? 'text-amber-400' : 'text-white/10 group-hover:text-amber-400'
                  }`} size={16} />
               </button>
             );
           })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8">
           <div className="glass-card rounded-[32px] p-8 border border-white/5 min-h-[600px]">
              {activeSection === 'general' && (
                <>
                  <div className="mb-8">
                     <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">General Settings</h3>
                     <p className="text-xs text-white/40">Basic platform identity and display options.</p>
                  </div>

                  <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Platform Name</label>
                           <input 
                             type="text" 
                             defaultValue="EduCore Modern Learning" 
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Support Email</label>
                           <input 
                             type="email" 
                             defaultValue="support@educore.com" 
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                           />
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Branding Assets</label>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-8 border-2 border-dashed border-white/5 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:border-amber-500/20 transition-all group cursor-pointer">
                              <div className="p-3 rounded-xl bg-white/5 text-white/20 group-hover:text-amber-400 transition-colors">
                                 <Monitor size={24} />
                              </div>
                              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Main Logo</p>
                           </div>
                           <div className="p-8 border-2 border-dashed border-white/5 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:border-amber-500/20 transition-all group cursor-pointer">
                              <div className="p-3 rounded-xl bg-white/5 text-white/20 group-hover:text-amber-400 transition-colors">
                                 <Smartphone size={24} />
                              </div>
                              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Mobile Icon</p>
                           </div>
                        </div>
                     </div>

                     <div className="pt-8 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                           <div>
                              <h4 className="text-sm font-bold text-white mb-0.5">Maintenance Mode</h4>
                              <p className="text-[10px] text-white/30">Display maintenance page to all non-admin users.</p>
                           </div>
                           <button className="w-12 h-6 bg-white/10 rounded-full relative transition-all">
                              <div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full" />
                           </button>
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-sm font-bold text-white mb-0.5">Global Registration</h4>
                              <p className="text-[10px] text-white/30">Allow new users to sign up without invitations.</p>
                           </div>
                           <button className="w-12 h-6 bg-amber-500 rounded-full relative transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                              <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                           </button>
                        </div>
                     </div>
                  </div>
                </>
              )}

              {activeSection === 'notifications' && (
                <>
                  <div className="mb-8">
                     <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">Notification System</h3>
                     <p className="text-xs text-white/40">Manage how notifications are routed to platform users.</p>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-amber-500" size={32} />
                    </div>
                  ) : settings ? (
                    <div className="space-y-6">
                      {typesToShow.map((type) => (
                        <div key={type.key} className="p-6 rounded-[24px] bg-white/5 border border-white/5 hover:border-amber-500/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="max-w-md">
                            <h4 className="text-sm font-bold text-white mb-1">{type.label}</h4>
                            <p className="text-[10px] text-white/45 leading-relaxed">{type.desc}</p>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            {/* Email Channel */}
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end min-w-[50px]">
                                <span className="text-[10px] font-bold text-white/70">Email</span>
                                {savingStates[`${type.key}_email`] === 'saving' && (
                                  <span className="text-[9px] text-amber-400 animate-pulse">Saving...</span>
                                )}
                                {savingStates[`${type.key}_email`] === 'saved' && (
                                  <span className="text-[9px] text-emerald-400">Saved!</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleToggle(type.key, 'email')}
                                disabled={savingStates[`${type.key}_email`] === 'saving'}
                                className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                                  settings[type.key]?.email ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/10'
                                }`}
                              >
                                <div
                                  className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ${
                                    settings[type.key]?.email ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white/40'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* In-App Channel */}
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end min-w-[50px]">
                                <span className="text-[10px] font-bold text-white/70">In-App</span>
                                {savingStates[`${type.key}_inApp`] === 'saving' && (
                                  <span className="text-[9px] text-amber-400 animate-pulse">Saving...</span>
                                )}
                                {savingStates[`${type.key}_inApp`] === 'saved' && (
                                  <span className="text-[9px] text-emerald-400">Saved!</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleToggle(type.key, 'inApp')}
                                disabled={savingStates[`${type.key}_inApp`] === 'saving'}
                                className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                                  settings[type.key]?.inApp ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/10'
                                }`}
                              >
                                <div
                                  className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ${
                                    settings[type.key]?.inApp ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white/40'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-white/40">
                      Failed to load settings. Please try again.
                    </div>
                  )}
                </>
              )}

              {activeSection !== 'general' && activeSection !== 'notifications' && (
                <>
                  <div className="mb-8">
                     <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-elmessiri">
                       {sections.find(s => s.id === activeSection)?.title}
                     </h3>
                     <p className="text-xs text-white/40">
                       {sections.find(s => s.id === activeSection)?.desc}
                     </p>
                  </div>
                  <div className="flex flex-col items-center justify-center min-h-[350px] border border-dashed border-white/5 rounded-3xl p-8">
                     <div className="p-4 bg-white/5 rounded-2xl text-amber-400/60 mb-4 animate-pulse">
                        {React.createElement(sections.find(s => s.id === activeSection)?.icon || Settings, { size: 36 })}
                     </div>
                     <h4 className="text-sm font-bold text-white mb-1">Coming Soon</h4>
                     <p className="text-xs text-white/30 text-center max-w-sm">This platform configuration panel is currently under construction.</p>
                  </div>
                </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
