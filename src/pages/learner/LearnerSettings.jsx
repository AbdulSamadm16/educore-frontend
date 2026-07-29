import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Globe, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';

export default function LearnerSettings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingStates, setSavingStates] = useState({}); // key_channel -> 'saving' | 'saved' | null

  const sections = [
    { icon: User, label: 'Profile', desc: 'Manage your public identity and bio' },
    { icon: Bell, label: 'Alerts', desc: 'Configure notifications' },
    { icon: Shield, label: 'Security', desc: 'Manage access keys and passwords' },
    { icon: Globe, label: 'Localization', desc: 'Set your preferred language and zone' },
  ];

  const typesToShow = [
    { key: 'enrollmentConfirmed', label: 'Enrollment Confirmed', desc: 'Get notified when your enrollment in a course is confirmed.' },
    { key: 'newLesson', label: 'New Lesson Available', desc: 'Receive alerts when a new lesson is added to your courses.' },
    { key: 'liveClassReminder', label: 'Live Class Reminder', desc: 'Get reminders before your scheduled live classes begin.' },
    { key: 'assignmentGraded', label: 'Assignment Graded', desc: 'Be notified when your assignments are graded by tutors.' },
    { key: 'quizResult', label: 'Quiz Result', desc: 'Get instant alerts when your quiz attempts are graded.' }
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
    if (activeSection === 'Alerts') {
      fetchSettings();
    }
  }, [activeSection]);

  const handleSectionClick = (sectionLabel) => {
    if (sectionLabel === 'Alerts') {
      setActiveSection('Alerts');
    } else if (sectionLabel === 'Profile') {
      navigate('/profile');
    } else {
      toast.error(`${sectionLabel} is not implemented in this demo.`);
    }
  };

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

  if (activeSection === 'Alerts') {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="mb-8">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-all text-sm font-bold uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Back to Settings</span>
          </button>
          <h2 className="text-3xl font-black text-white tracking-tight">Notification Settings</h2>
          <p className="text-blue-200/40 font-medium text-sm mt-1">Control which updates you receive and where.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
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
                          <span className="text-[10px] text-blue-400 animate-pulse">Saving...</span>
                        )}
                        {savingStates[`${type.key}_email`] === 'saved' && (
                          <span className="text-[10px] text-emerald-400">Saved!</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(type.key, 'email')}
                        disabled={savingStates[`${type.key}_email`] === 'saving'}
                        className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                          settings[type.key]?.email ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/10'
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
                          <span className="text-[10px] text-blue-400 animate-pulse">Saving...</span>
                        )}
                        {savingStates[`${type.key}_inApp`] === 'saved' && (
                          <span className="text-[10px] text-emerald-400">Saved!</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(type.key, 'inApp')}
                        disabled={savingStates[`${type.key}_inApp`] === 'saving'}
                        className={`w-12 h-6 rounded-full relative transition-all duration-200 focus:outline-none ${
                          settings[type.key]?.inApp ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/10'
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
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Settings</h2>
        <p className="text-blue-200/40 font-medium">Manage your learning preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, i) => (
          <div 
            key={i} 
            onClick={() => handleSectionClick(section.label)}
            className="glass-card rounded-[40px] p-8 border border-white/5 hover:border-blue-500/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/5 rounded-2xl text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <section.icon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{section.label}</h3>
                <p className="text-sm text-white/40">{section.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
