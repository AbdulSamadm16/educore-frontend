import React, { useState, useEffect } from 'react';
import { Shield, Bell, Server, Settings, ArrowLeft, Loader2, Palette, Upload, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function InsAdminSettings() {
  const [activeSection, setActiveSection] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingStates, setSavingStates] = useState({});

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({ allowPublicCourses: true });
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  const settings = [
    { icon: Shield, label: 'Security & Access', desc: 'Manage administrative keys and role permissions.' },
    { icon: Bell, label: 'System Alerts', desc: 'Configure threshold-based platform notifications.' },
    { icon: Server, label: 'Infrastructure', desc: 'Sync API endpoints and database configurations.' },
    { icon: Settings, label: 'General Preferences', desc: 'Custom branding and visibility settings.' },
  ];

  const typesToShow = [
    { key: 'enrollmentConfirmed', label: 'Student Registrations & Enrollments', desc: 'Get notified when new student accounts are created or learners enroll in courses.' },
    { key: 'newLesson', label: 'Course Review Submissions', desc: 'Receive alerts when tutors submit new courses or major curriculum updates for approval.' },
    { key: 'liveClassReminder', label: 'Live Virtual Class Alerts', desc: 'Get alerts for scheduled virtual classes, meetings, and webinars within the institution.' },
    { key: 'assignmentGraded', label: 'Academic Submissions & Grading', desc: 'Get notified of student homework submissions and when tutor grading activities are completed.' },
    { key: 'quizResult', label: 'Assessment & Quiz Completions', desc: 'Receive alerts when students complete online quizzes and exams.' },
    { key: 'paymentSuccess', label: 'Sales & Revenue Transactions', desc: 'Receive real-time notifications for successful course payments, purchases, and student billing.' },
    { key: 'newStudentEnrolled', label: 'Tutor Registrations', desc: 'Get notified when new tutors register and await profile approval.' }
  ];

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/users/me/notification-settings');
      setSettingsData(response.data?.data?.notificationSettings);
    } catch (err) {
      toast.error('Failed to load notification settings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralSettings = async () => {
    setLoadingGeneral(true);
    try {
      const response = await apiClient.get('/institution/settings');
      if (response.data?.success) {
        setGeneralSettings(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load institution settings.');
    } finally {
      setLoadingGeneral(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'System Alerts') {
      fetchSettings();
    } else if (activeSection === 'General Preferences') {
      fetchGeneralSettings();
    }
  }, [activeSection]);

  const handleSectionClick = (sectionLabel) => {
    if (sectionLabel === 'System Alerts') {
      setActiveSection('System Alerts');
    } else if (sectionLabel === 'General Preferences') {
      setActiveSection('General Preferences');
    } else {
      toast.error(`${sectionLabel} is not implemented in this demo.`);
    }
  };

  const handleToggle = async (type, channel) => {
    const key = `${type}_${channel}`;
    setSavingStates(prev => ({ ...prev, [key]: 'saving' }));

    const currentValue = settingsData[type]?.[channel] ?? true;
    const updatedValue = !currentValue;

    // Optimistic UI update
    setSettingsData(prev => ({
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
      setSettingsData(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [channel]: currentValue
        }
      }));
      setSavingStates(prev => ({ ...prev, [key]: null }));
    }
  };

  if (activeSection === 'System Alerts') {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="mb-8">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-4 transition-all text-sm font-bold uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Back to Settings</span>
          </button>
          <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">System Alerts settings</h2>
          <p className="text-white/40 font-medium text-sm">Control which updates you receive and where.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : settingsData ? (
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
                          <span className="text-[10px] text-emerald-400 animate-pulse">Saving...</span>
                        )}
                        {savingStates[`${type.key}_email`] === 'saved' && (
                          <span className="text-[10px] text-emerald-400">Saved!</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(type.key, 'email')}
                        disabled={savingStates[`${type.key}_email`] === 'saving'}
                        className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                          settingsData[type.key]?.email ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ${
                            settingsData[type.key]?.email ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white/40'
                          }`}
                        />
                      </button>
                    </div>

                    {/* In-App Channel */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end min-w-[50px]">
                        <span className="text-xs font-bold text-white/70">In-App</span>
                        {savingStates[`${type.key}_inApp`] === 'saving' && (
                          <span className="text-[10px] text-emerald-400 animate-pulse">Saving...</span>
                        )}
                        {savingStates[`${type.key}_inApp`] === 'saved' && (
                          <span className="text-[10px] text-emerald-400">Saved!</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(type.key, 'inApp')}
                        disabled={savingStates[`${type.key}_inApp`] === 'saving'}
                        className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                          settingsData[type.key]?.inApp ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ${
                            settingsData[type.key]?.inApp ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white/40'
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

  if (activeSection === 'General Preferences') {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="mb-8">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-4 transition-all text-sm font-bold uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Back to Settings</span>
          </button>
          <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">General Preferences</h2>
          <p className="text-white/40 font-medium text-sm">Configure core branding, themes, and portal preferences.</p>
        </div>

        {loadingGeneral ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : generalSettings ? (
          <div className="space-y-8">
            {/* Branding Card */}
            <div className="glass-card rounded-[32px] border border-white/5 p-8 md:p-10">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Palette className="text-emerald-400" size={22} />
                Portal Branding
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Uploader Placeholder */}
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-3">Institution Logo</label>
                  <div className="border border-dashed border-white/10 hover:border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-white/[0.01] transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all">
                      <Upload size={20} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">Upload new logo</p>
                      <p className="text-xs text-white/30 mt-1">PNG, JPG up to 2MB. Recommended 250x80px.</p>
                    </div>
                  </div>
                </div>

                {/* Primary Brand Color */}
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-3">Primary Brand Color</label>
                  <p className="text-xs text-white/40 mb-4 leading-relaxed">
                    Choose the primary color for buttons, active navigation items, and accents across your learner portal.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {[
                      { name: 'Emerald', value: '#10b981' },
                      { name: 'Indigo', value: '#6366f1' },
                      { name: 'Violet', value: '#8b5cf6' },
                      { name: 'Rose', value: '#f43f5e' },
                      { name: 'Amber', value: '#f59e0b' },
                      { name: 'Sky', value: '#0ea5e9' }
                    ].map((color) => {
                      const isSelected = color.name === 'Emerald'; // Default
                      return (
                        <button
                          key={color.name}
                          type="button"
                          className={`w-10 h-10 rounded-full border relative transition-all duration-200 ${
                            isSelected ? 'border-white scale-110 shadow-lg shadow-emerald-500/20' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                          onClick={() => toast.success(`Selected ${color.name} as brand color!`)}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                              <Check size={16} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Course Visibility Gates Card */}
            <div className="glass-card rounded-[32px] border border-white/5 p-8 md:p-10">
              <h3 className="text-xl font-bold text-white mb-6">Course Visibility Gates</h3>
              
              <div className="space-y-6">
                {/* Switch Option A / Option B */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.01] transition-colors p-4 rounded-2xl">
                  <div className="max-w-xl">
                    <h4 className="text-lg font-bold text-white mb-1">Allow Public Courses</h4>
                    <p className="text-sm text-white/40 leading-relaxed">
                      Toggle whether learners and tutors associated with your institution can view and enroll in global public courses.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {savingGeneral && (
                      <span className="text-[10px] text-emerald-400 animate-pulse">Saving...</span>
                    )}
                    <button
                      onClick={async () => {
                        setSavingGeneral(true);
                        const nextVal = !generalSettings.allowPublicCourses;
                        try {
                          const response = await apiClient.patch('/institution/settings', {
                            allowPublicCourses: nextVal
                          });
                          if (response.data?.success) {
                            setGeneralSettings(response.data.data);
                            toast.success('Course visibility updated!');
                          }
                        } catch (err) {
                          toast.error('Failed to update course visibility.');
                        } finally {
                          setSavingGeneral(false);
                        }
                      }}
                      className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                        generalSettings.allowPublicCourses ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ${
                          generalSettings.allowPublicCourses ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white/40'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                {/* Info Card */}
                <div className="bg-[#10b981]/5 border border-emerald-500/10 rounded-2xl p-6 flex gap-4">
                  <div className="text-emerald-400 shrink-0">
                    <Settings size={24} />
                  </div>
                  <div className="text-xs leading-relaxed text-white/60">
                    <p className="font-bold text-emerald-400 mb-1">Visibility Scope Mode</p>
                    {generalSettings.allowPublicCourses ? (
                      <p>
                        <strong>Option B (Public + Institutional)</strong> is currently active. Learners and tutors will see courses specially created for your institution alongside the global catalog of public courses.
                      </p>
                    ) : (
                      <p>
                        <strong>Option A (Institutional Only)</strong> is currently active. The global course catalog is completely hidden from learners and tutors. They will only be able to view and interact with courses published specifically under your institution's ID.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Welcome Message Card */}
            <div className="glass-card rounded-[32px] border border-white/5 p-8 md:p-10">
              <h3 className="text-xl font-bold text-white mb-6">Portal Configuration</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">Custom Welcome Header</label>
                  <input
                    type="text"
                    defaultValue="Welcome to our Institutional Portal"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                    placeholder="Enter welcome message for your learners..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">Support Email Contact</label>
                  <input
                    type="email"
                    defaultValue="support@institution.edu"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                    placeholder="support@yourinstitution.edu"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      toast.success('Preferences saved successfully!');
                    }}
                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider text-xs"
                  >
                    Save Portal Settings
                  </button>
                </div>
              </div>
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
      <div className="mb-12">
         <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Global Settings</h2>
         <p className="text-white/40 font-medium">Configure core EduCore settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {settings.map((item, i) => (
           <div 
             key={i} 
             onClick={() => handleSectionClick(item.label)}
             className="glass-card p-10 rounded-[40px] border border-white/5 hover:border-emerald-500/20 transition-all group cursor-pointer flex gap-8 items-center"
           >
              <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center text-emerald-400 border border-white/5 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                 <item.icon size={28} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-white mb-1 uppercase tracking-wide">{item.label}</h3>
                 <p className="text-sm text-white/40 font-medium">{item.desc}</p>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
