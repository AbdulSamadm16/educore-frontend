import React from 'react';
import { MessageSquare, Star } from 'lucide-react';

export default function TutorReviews() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-end items-center mb-10">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
          <Star size={20} className="text-amber-400 fill-amber-400" />
          <span className="text-white font-bold">0.0 (0 Reviews)</span>
        </div>
      </div>

      <div className="glass-card rounded-[32px] p-12 border border-white/5 text-center">
        <MessageSquare size={48} className="text-white/10 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No reviews yet</h3>
        <p className="text-white/40">Encourage your students to leave feedback to build your reputation.</p>
      </div>
    </div>
  );
}
