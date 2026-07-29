import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Plus, Search, Filter, AlertCircle, 
  Clock, CheckCircle, HelpCircle, Inbox, Tag, ArrowRight 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketService } from '../../services/ticket.service';
import { useAuth } from '../../context/useAuth';
import { getTheme } from '../../utils/supportTheme';

const getStatusBadge = (status) => {
  switch (status) {
    case 'open':
      return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-widest">Open</span>;
    case 'assigned':
    case 'in_progress':
      return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold uppercase tracking-widest">{status.replace('_', ' ')}</span>;
    case 'waiting_for_user':
      return <span className="px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-xs font-bold uppercase tracking-widest">Waiting for You</span>;
    case 'resolved':
      return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-widest">Resolved</span>;
    case 'closed':
      return <span className="px-3 py-1 bg-white/5 text-white/40 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest">Closed</span>;
    default:
      return null;
  }
};

const getPriorityBadge = (priority) => {
  switch (priority) {
    case 'low': return <span className="text-white/40 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> Low</span>;
    case 'medium': return <span className="text-amber-400 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> Medium</span>;
    case 'high': return <span className="text-orange-400 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> High</span>;
    case 'critical': return <span className="text-red-400 text-xs font-bold flex items-center gap-1"><AlertCircle size={12} className="animate-pulse"/> Critical</span>;
    default: return null;
  }
};

const formatDurationHours = (ms) => {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return null;
  const hours = ms / (1000 * 60 * 60);
  if (hours < 0.1) {
    const mins = Math.max(1, Math.round(ms / (1000 * 60)));
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }
  const formatted = hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
  return `${formatted} ${formatted === '1' ? 'hour' : 'hours'}`;
};

const getTimeTakenMs = (ticket) => {
  if (!ticket) return null;
  if (ticket.slaResolutionTimeMs != null) return ticket.slaResolutionTimeMs;
  if (['resolved', 'closed'].includes(ticket.status) && ticket.updatedAt && ticket.createdAt) {
    const ms = new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime();
    return ms >= 0 ? ms : null;
  }
  return null;
};

export default function TicketList({ basePath }) {
  const { user } = useAuth();
  const theme = getTheme(user?.role);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 20
  });

  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    fetchTickets();
  }, [filters.status, filters.page, filters.search]); // Wait, debouncing search would be better, but basic implementation first

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await ticketService.getTickets(filters);
      setTickets(response.data?.tickets || []);
      setPagination(response.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      toast.error('Failed to load support tickets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className={`p-3 rounded-xl ${theme.bgLight} ${theme.text}`}>
              <MessageSquare size={24} />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter">Support Center</h2>
          </div>
          <p className="text-white/40 text-sm font-medium">Manage your service requests and technical support tickets.</p>
        </div>
        {!['platform_admin', 'super_admin', 'platform_owner', 'platform_support'].includes(user?.role) && (
          <button 
            onClick={() => navigate(`${basePath}/new`)}
            className={`flex items-center gap-2 px-6 py-4 text-white rounded-2xl font-bold transition-all shadow-xl ${theme.bgSolid} ${theme.bgHover} ${theme.shadow}`}
          >
            <Plus size={20} />
            Create New Ticket
          </button>
        )}
      </div>

      <div className="glass-card p-2 rounded-[32px] border border-white/5 flex flex-wrap gap-2 mb-8 bg-black/40">
        {['', 'open', 'waiting_for_user', 'resolved', 'closed'].map(status => (
          <button
            key={status}
            onClick={() => setFilters(prev => ({ ...prev, status, page: 1 }))}
            className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
              filters.status === status 
                ? 'bg-white/10 text-white' 
                : 'text-white/40 hover:bg-white/5 hover:text-white'
            }`}
          >
            {status === '' ? 'All Tickets' : status.replace(/_/g, ' ')}
          </button>
        ))}
        
        <div className="flex-1 min-w-[200px] flex justify-end">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text" 
              placeholder="Search ID or subject... (Press Enter)" 
              onKeyDown={handleSearch}
              className={`w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:bg-white/10 transition-all ${theme.borderFocus}`}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4 ${theme.spinner}`}></div>
          <p className="text-white/40 font-bold tracking-widest uppercase text-xs">Loading Tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/5 rounded-[40px] border-dashed">
          <div className="p-4 bg-white/5 rounded-full w-fit mx-auto mb-6">
            <Inbox className="text-white/20" size={32} />
          </div>
          <h3 className="text-white font-bold mb-2">No Tickets Found</h3>
          <p className="text-white/40 text-sm max-w-sm mx-auto">There are no support tickets matching your current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tickets.map(ticket => (
            <div 
              key={ticket._id} 
              onClick={() => navigate(`${basePath}/${ticket._id}`)}
              className={`group glass-card p-6 rounded-3xl border border-white/5 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${theme.borderHover}`}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${theme.bgLight} ${theme.text}`}>
                    {ticket.ticketId}
                  </span>
                  {getStatusBadge(ticket.status)}
                </div>
                <h3 className={`text-lg font-bold text-white mb-2 transition-colors ${theme.text.replace('text-', 'group-hover:text-')}`}>
                  {ticket.subject}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Tag size={12}/> {ticket.issueType || ticket.category}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {getTimeTakenMs(ticket) != null ? `${formatDurationHours(getTimeTakenMs(ticket))} taken` : ticket.status.replace(/_/g, ' ')}</span>
                  {getPriorityBadge(ticket.priority)}
                </div>
              </div>
              <div className={`shrink-0 p-4 bg-white/5 rounded-2xl text-white/40 group-hover:text-white transition-all ${theme.bgHover.replace('hover:', 'group-hover:')}`}>
                <ArrowRight size={20} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination controls could go here if pages > 1 */}
    </div>
  );
}
