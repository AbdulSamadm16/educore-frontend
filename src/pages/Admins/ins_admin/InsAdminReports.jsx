import React from 'react';
import { FileBarChart, PieChart, Activity } from 'lucide-react';

export default function InsAdminReports() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-12">
         <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Analytical Reports</h2>
         <p className="text-white/40 font-medium">Generate deep-dive insights into platform performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: FileBarChart, label: 'Growth Report', desc: 'User acquisition and retention metrics.' },
          { icon: PieChart, label: 'Course Analytics', desc: 'Engagement and completion depth analysis.' },
          { icon: Activity, label: 'System Health', desc: 'Real-time performance and uptime logs.' },
        ].map((report, i) => (
          <div key={i} className="glass-card p-10 rounded-[40px] border border-white/5 hover:border-emerald-500/20 transition-all group cursor-pointer">
             <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center text-emerald-400 mb-8 border border-white/5 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <report.icon size={32} />
             </div>
             <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">{report.label}</h3>
             <p className="text-sm text-white/30 font-medium leading-relaxed">{report.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
