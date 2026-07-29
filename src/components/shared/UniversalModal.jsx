import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function UniversalModal({ isOpen, config, onClose }) {
  const [inputValue, setInputValue] = useState('');
  const [sendNotification, setSendNotification] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue(config.inputValue || '');
      // Default to true when the notification checkbox is shown (opt-out rather than opt-in)
      setSendNotification(config.showNotificationCheckbox ? true : false);
    }
  }, [isOpen, config.inputValue, config.showNotificationCheckbox]);

  const handleConfirm = () => {
    if (config.showNotificationCheckbox) {
      config.onConfirm(sendNotification);
    } else {
      config.onConfirm(inputValue);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">  
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#06080f]/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-card w-full max-w-md p-10 rounded-[40px] border border-white/10 relative overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-black text-white mb-2">{config.title}</h3>
            <p className="text-white/40 text-sm font-medium mb-8 leading-relaxed">{config.message}</p>

            {config.type === 'prompt' && (
              <div className="mb-8">
                <input 
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={config.inputPlaceholder}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
                />
              </div>
            )}

            {config.type === 'select' && (
              <div className="grid grid-cols-1 gap-3 mb-8">
                {config.options?.map((opt) => (
                  <button
                     key={opt}
                     onClick={() => {
                       config.onConfirm(opt);
                       onClose();
                     }}
                     className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-white/60 light-theme-dark-btn font-bold uppercase tracking-widest text-[10px] hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {config.showNotificationCheckbox && (
              <div className="flex items-center gap-4 mb-8 p-5 bg-white/5 border border-white/5 rounded-3xl text-left select-none animate-in slide-in-from-bottom duration-300">
                <input 
                  type="checkbox" 
                  id="sendNotif"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="w-6 h-6 rounded bg-white/5 border-white/10 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="sendNotif" className="text-xs font-bold text-white/60 hover:text-white cursor-pointer transition-colors leading-relaxed">
                  Announce this course to all platform users
                </label>
              </div>
            )}

            {(config.type === 'confirm' || config.type === 'prompt') && (
              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 text-xs font-black text-white/40 uppercase tracking-widest hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"
                >
                  Confirm
                </button>
              </div>
            )}

            {config.type === 'alert' && (
              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"
                >
                  {config.confirmText || 'OK'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
