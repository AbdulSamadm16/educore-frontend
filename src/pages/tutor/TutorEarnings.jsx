import React from 'react';
import { DollarSign, Download } from 'lucide-react';

export default function TutorEarnings() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-end items-center mb-10">
        <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all">
          <Download size={20} />
          Download Statement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Revenue', value: '$0.00' },
          { label: 'Available Balance', value: '$0.00' },
          { label: 'Pending Payouts', value: '$0.00' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-[32px] p-8 border border-white/5">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-[32px] p-8 border border-white/5 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <DollarSign size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40">No transactions recorded yet.</p>
        </div>
      </div>
    </div>
  );
}
