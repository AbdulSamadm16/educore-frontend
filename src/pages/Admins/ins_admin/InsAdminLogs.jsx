import React, { useState, useEffect } from 'react';
import { 
  Terminal, Mail, CheckCircle2, XCircle, 
  RefreshCw, Search, AlertCircle, Calendar,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function InsAdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/email-logs', {
        params: {
          page,
          limit: 10,
          search: searchTerm || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter
        }
      });
      if (response.data?.success) {
        setLogs(response.data.data.logs);
        setTotalPages(response.data.data.pagination.pages || 1);
        setTotalLogs(response.data.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load email logs:', err);
      toast.error('Failed to fetch mail delivery logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Control bar */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
            />
          </form>

          <button 
            onClick={() => { fetchLogs(); toast.success('Logs refreshed'); }} 
            className="p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:text-white transition-all text-white/40 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest flex-shrink-0"
            data-tooltip="Refresh Logs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Logs
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['all', 'sent', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                statusFilter === st
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table Area */}
      <div className="glass-card rounded-[40px] border border-white/5 bg-black/40 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest">
                <th className="py-5 px-8">Recipient</th>
                <th className="py-5 px-8">Subject</th>
                <th className="py-5 px-8 text-center">Status</th>
                <th className="py-5 px-8">Timestamp</th>
                <th className="py-5 px-8">Diagnostics</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-white/5">
                    <td className="py-6 px-8"><div className="h-4 bg-white/5 rounded w-1/3" /></td>
                    <td className="py-6 px-8"><div className="h-4 bg-white/5 rounded w-1/2" /></td>
                    <td className="py-6 px-8"><div className="h-6 bg-white/5 rounded w-16 mx-auto" /></td>
                    <td className="py-6 px-8"><div className="h-4 bg-white/5 rounded w-1/4" /></td>
                    <td className="py-6 px-8"><div className="h-4 bg-white/5 rounded w-1/3" /></td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr 
                    key={log._id} 
                    className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                      log.status === 'failed' ? 'bg-red-500/[0.01]' : ''
                    }`}
                  >
                    <td className="py-5 px-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{log.recipientName || 'Unknown Recipient'}</span>
                        <span className="text-xs text-white/40 font-mono mt-0.5">{log.recipient}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                          <Mail size={16} />
                        </div>
                        <span className="text-sm font-bold text-white max-w-xs truncate">{log.subject}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        log.status === 'sent'
                          ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                          : 'text-red-400 border-red-500/20 bg-red-500/10'
                      }`}>
                        {log.status === 'sent' ? (
                          <>
                            <CheckCircle2 size={10} />
                            Sent
                          </>
                        ) : (
                          <>
                            <XCircle size={10} />
                            Failed
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-2 text-white/40 text-xs font-medium">
                        <Calendar size={14} className="text-white/20" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 font-mono text-xs">
                      {log.status === 'failed' ? (
                        <div className="flex items-center gap-2 text-red-400/80 bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-xl max-w-xs">
                          <AlertCircle size={14} className="flex-shrink-0" />
                          <span className="truncate">{log.errorMessage || 'Unknown Error'}</span>
                        </div>
                      ) : (
                        <span className="text-white/20">Success (Brevo Delivery)</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                      <Terminal size={32} className="text-white/20" />
                    </div>
                    <p className="text-white/20 font-black text-sm uppercase tracking-widest">No mail delivery logs found</p>
                    <p className="text-white/10 text-xs mt-1">Ensure the service has processed outgoing verification requests.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/[0.01]">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
              Showing page {page} of {totalPages} ({totalLogs} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                data-tooltip="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Premium Page Numbers */}
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                const isAdjacent = pageNum >= page - 1 && pageNum <= page + 1;
                const isBoundary = pageNum === 1 || pageNum === totalPages;

                if (isBoundary || isAdjacent) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                        page === pageNum
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span key={pageNum} className="text-white/20 text-xs px-1 select-none">
                      •••
                    </span>
                  );
                }
                return null;
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                data-tooltip="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
