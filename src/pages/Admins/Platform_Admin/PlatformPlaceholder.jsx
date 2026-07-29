import React from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, ClipboardList, Wallet, FileText, 
  MessageSquare, Megaphone, Monitor, Search,
  Construction
} from 'lucide-react';

export default function PlatformPlaceholder({ title, icon: Icon, description }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-elmessiri">
          {title}
        </h2>
        <p className="text-white/40 font-medium text-sm">{description || 'This feature is currently being integrated.'}</p>
      </div>

      <div className="glass-card rounded-[32px] p-12 border border-white/5 flex flex-col items-center justify-center text-center min-h-[400px]">
         <div className="w-24 h-24 rounded-full bg-amber-500/5 flex items-center justify-center border border-amber-500/10 mb-6 relative">
            <Icon size={48} className="text-amber-400/20" />
            <div className="absolute -bottom-2 -right-2 p-2 bg-amber-500 rounded-lg text-black">
               <Construction size={16} />
            </div>
         </div>
         <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Module Under Construction</h3>
         <p className="text-sm text-white/30 max-w-md mx-auto">
            We are working hard to bring you the full {title.toLowerCase()} experience. 
            Check back for future updates.
         </p>
         
         <div className="mt-10 flex gap-4">
            <div className="h-1.5 w-12 bg-amber-500 rounded-full" />
            <div className="h-1.5 w-12 bg-white/5 rounded-full" />
            <div className="h-1.5 w-12 bg-white/5 rounded-full" />
         </div>
      </div>
    </div>
  );
}
