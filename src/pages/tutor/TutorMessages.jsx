import React from 'react';
import { Mail, Search } from 'lucide-react';

export default function TutorMessages() {
  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">

      <div className="flex-1 glass-card rounded-[32px] border border-white/5 flex overflow-hidden">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r border-white/5 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input 
                type="text" 
                placeholder="Search chats..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30"
              />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <p className="text-xs text-white/20 font-bold uppercase tracking-widest">No conversations</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white/[0.01]">
          <div className="p-4 bg-white/5 rounded-full text-white/10 mb-4">
            <Mail size={40} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Select a conversation</h3>
          <p className="text-white/40 max-w-xs">Pick a student from the left to start a direct conversation or answer questions.</p>
        </div>
      </div>
    </div>
  );
}
