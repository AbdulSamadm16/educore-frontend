import React from 'react';
import { CreditCard, Download } from 'lucide-react';

export default function InsAdminTransactions() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-12">
        <div>
           <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Financial Ledger</h2>
           <p className="text-white/40 font-medium">Monitor revenue flow and transaction integrity.</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all">
           <Download size={20} />
           Export Ledger
        </button>
      </div>

      <div className="glass-card rounded-[40px] border border-white/5 overflow-hidden">
         <div className="p-20 flex flex-col items-center justify-center text-center">
            <CreditCard size={64} className="text-white/5 mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">No transaction data available</h3>
            <p className="text-white/20 max-w-xs">All platform financial exchanges will be indexed here in real-time.</p>
         </div>
      </div>
    </div>
  );
}
