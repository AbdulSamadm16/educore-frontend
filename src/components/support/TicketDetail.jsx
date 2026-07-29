import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Paperclip, Send, AlertCircle, Clock,
  CheckCircle, User, Shield, Star, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketService } from '../../services/ticket.service';
import { useAuth } from '../../context/useAuth';
import { getTheme } from '../../utils/supportTheme';

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

export default function TicketDetail({ basePath }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = getTheme(user?.role);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyFiles, setReplyFiles] = useState([]);
  const [sending, setSending] = useState(false);

  const [statusModal, setStatusModal] = useState({ isOpen: false, status: '' });
  const [statusMessage, setStatusMessage] = useState('');

  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const messagesEndRef = useRef(null);

  const getCleanId = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    return val.id || val._id || null;
  };
  const currentUserId = getCleanId(user);
  const creatorUserId = getCleanId(ticket?.creatorId);
  const isCreator = !!(currentUserId && creatorUserId && currentUserId === creatorUserId);
  const isStaff = ['institution_admin', 'platform_admin', 'platform_support', 'super_admin', 'platform_owner'].includes(user?.role);
  
  // Get all non-system messages
  const userMessages = messages.filter(msg => msg.senderRole !== 'system');
  const lastMessage = userMessages[userMessages.length - 1];
  
  // Check if the last message was sent by a support agent (not the creator)
  const lastMessageSenderId = lastMessage ? getCleanId(lastMessage.senderId) : null;
  const lastMessageIsFromAgent = !!(lastMessageSenderId && currentUserId && lastMessageSenderId !== currentUserId);

  // Only show the resolution options if the ticket is resolved
  const showResolutionControls = isCreator && ticket?.status === 'resolved';
  const isPlatformUser = ['platform_admin', 'platform_support', 'super_admin', 'platform_owner'].includes(user?.role);
  const canUpdateStatus = isStaff || (user?.role === 'tutor' && ticket?.assignedRole === 'tutor' && !isCreator);
  const isAgent = isStaff || (user?.role === 'tutor' && ticket?.assignedRole === 'tutor' && !isCreator);
  const isChatLocked = !!(ticket && !isAgent && ticket.status !== 'waiting_for_user');

  useEffect(() => {
    fetchTicketData();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTicketData = async () => {
    setLoading(true);
    try {
      const response = await ticketService.getTicketById(id);
      setTicket(response.data?.ticket);
      setMessages(response.data?.messages || []);
    } catch (err) {
      toast.error('Failed to load ticket details');
      navigate(basePath);
    } finally {
      setLoading(false);
    }
  };

  const handleLockedChatClick = () => {
    if (isChatLocked) {
      toast.error("Chat is locked. You can only reply when the support team requests your response.");
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('message', replyMessage);
      if (isStaff) {
        formData.append('isInternalNote', isInternalNote);
      }

      replyFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await ticketService.addTicketMessage(id, formData);
      setMessages([...messages, response.data]);
      setReplyMessage('');
      setReplyFiles([]);
      setIsInternalNote(false);

      // Auto-update ticket status in local state if staff replies to an open ticket
      if (isStaff && ticket.status === 'open' && !isInternalNote) {
        setTicket({ ...ticket, status: 'in_progress' });
      }

    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };


  const handleStatusChange = async (newStatus) => {
    setSending(true);
    try {
      const response = await ticketService.updateTicketStatus(id, newStatus);
      if (response?.data) {
        setTicket(response.data);
      } else {
        setTicket(prev => ({ ...prev, status: newStatus }));
      }
      toast.success(`Ticket status updated to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSending(false);
    }
  };

  const handleStatusConfirm = async () => {
    if (!statusMessage.trim() || !statusModal.status) return;

    setSending(true);
    try {
      // 1. Send the explanatory message
      const formData = new FormData();
      formData.append('message', statusMessage);
      const msgResponse = await ticketService.addTicketMessage(id, formData);
      setMessages([...messages, msgResponse.data]);

      // 2. Update the status
      const statusRes = await ticketService.updateTicketStatus(id, statusModal.status);
      if (statusRes?.data) {
        setTicket(statusRes.data);
      } else {
        setTicket(prev => ({ ...prev, status: statusModal.status }));
      }

      toast.success(`Ticket status updated to ${statusModal.status.replace('_', ' ')}`);
      setStatusModal({ isOpen: false, status: '' });
      setStatusMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status and send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (replyFiles.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    setReplyFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleFeedbackSubmit = async () => {
    if (feedback.rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmittingFeedback(true);
    try {
      const response = await ticketService.submitFeedback(id, feedback.rating, feedback.comment);
      setTicket({ ...ticket, feedback: response.data.feedback });
      toast.success('Feedback submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4 ${theme.spinner}`}></div>
        <p className="text-white/40 font-bold tracking-widest uppercase text-xs">Loading Ticket...</p>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="animate-in fade-in duration-500">
      <button
        onClick={() => navigate(basePath)}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Back to Support</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Chat Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 rounded-[32px] border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${theme.bgLight} ${theme.text}`}>
                {ticket.ticketId}
              </span>
              {getTimeTakenMs(ticket) != null ? (
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  Time Taken: {formatDurationHours(getTimeTakenMs(ticket))}
                </span>
              ) : ['resolved', 'closed'].includes(ticket.status) ? (
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400/80 uppercase tracking-widest">
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white mb-6">{ticket.subject}</h2>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-white/80 whitespace-pre-wrap text-sm leading-relaxed">
              {ticket.description}

              {ticket.attachments?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-4">
                  {ticket.attachments.map((file, i) => (
                    <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                      <FileText size={16} className={theme.text} />
                      <span className="text-xs text-white font-medium">{file.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6 h-[200px] overflow-y-auto pr-4 custom-scrollbar">
              {messages.map((msg, i) => {
                const msgSenderId = getCleanId(msg.senderId);
                const isOwn = !!(currentUserId && msgSenderId && currentUserId === msgSenderId);
                const isSystem = msg.senderRole === 'system';

                if (isSystem) {
                  return (
                    <div key={i} className="flex justify-center my-4">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={i} className={`flex gap-2 items-end ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${theme.bgLight}`}>
                        {isStaff ? <Shield size={12} className={theme.text} /> : <User size={12} className="text-white/60" />}
                      </div>
                    )}

                    <div className={`max-w-[80%] w-fit rounded-xl px-2 py-1 ${msg.isInternalNote
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-100'
                        : isOwn
                          ? `${theme.bgSolid} text-white`
                          : 'bg-white/5 border border-white/10 text-white/80'
                      }`}>
                      {msg.isInternalNote && (
                        <div className="flex items-center gap-1.5 mb-2 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                          <AlertCircle size={12} /> Internal Note
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                      {msg.attachments?.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {msg.attachments.map((file, j) => (
                            <a key={j} href={file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${isOwn ? 'bg-black/20 hover:bg-black/30' : 'bg-black/20 hover:bg-black/40'
                              }`}>
                              <Paperclip size={12} /> {file.name}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className={`mt-2 text-[10px] uppercase tracking-widest font-bold ${isOwn ? 'text-white/40' : 'text-white/30'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {!isOwn && ` • ${msg.senderRole.replace('_', ' ')}`}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {['resolved', 'closed'].includes(ticket.status) ? (
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-center">
                <CheckCircle className="text-emerald-400 mx-auto mb-3" size={32} />
                <h4 className="text-white font-bold mb-1">This ticket is {ticket.status}</h4>
                <p className="text-white/40 text-sm">No further replies can be added. If you need more help, please open a new ticket.</p>

                {isCreator && !ticket.feedback && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-sm font-bold text-white mb-4">How would you rate your support experience?</p>
                    <div className="flex justify-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setFeedback({ ...feedback, rating: star })}
                          className={`p-2 transition-all ${feedback.rating >= star ? 'text-amber-400 scale-110' : 'text-white/20 hover:text-white/40'}`}
                        >
                          <Star size={24} fill={feedback.rating >= star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                    {feedback.rating > 0 && (
                      <div className="max-w-md mx-auto space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <textarea
                          value={feedback.comment}
                          onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                          placeholder="Any additional feedback? (Optional)"
                          className={`w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 text-sm focus:outline-none transition-all ${theme.borderFocus}`}
                        />
                        <button
                          onClick={handleFeedbackSubmit}
                          disabled={submittingFeedback}
                          className={`px-6 py-2 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all w-full ${theme.bgSolid} ${theme.bgHover}`}
                        >
                          Submit Feedback
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {ticket.feedback && (
                  <div className="mt-6 pt-6 border-t border-white/10 max-w-sm mx-auto">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Feedback Provided</p>
                    <div className="flex justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={16} className={ticket.feedback.rating >= star ? 'text-amber-400' : 'text-white/10'} fill={ticket.feedback.rating >= star ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    {ticket.feedback.comment && <p className="text-white/60 text-sm italic">"{ticket.feedback.comment}"</p>}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleReplySubmit} className="mt-4">
                {isStaff && (
                  <div className="mb-3 flex items-center gap-2 px-2">
                    <input
                      type="checkbox"
                      id="internalNote"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="w-4 h-4 rounded bg-white/5 border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="internalNote" className="text-xs font-bold text-amber-400/80 cursor-pointer flex items-center gap-1">
                      <Shield size={12} /> Add as Private Internal Note (Hidden from User)
                    </label>
                  </div>
                )}
                <div className="relative">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => !isChatLocked && setReplyMessage(e.target.value)}
                    onClick={handleLockedChatClick}
                    onFocus={handleLockedChatClick}
                    readOnly={isChatLocked}
                    placeholder={isChatLocked ? "Chat is locked. Waiting for support team response..." : "Type your message here..."}
                    className={`w-full ${isInternalNote ? 'bg-amber-500/5 border-amber-500/20 focus:border-amber-500/50' : `bg-white/5 border-white/10 transition-all ${theme.borderFocus}`} border rounded-3xl p-5 pr-32 text-white placeholder:text-white/20 text-sm focus:outline-none transition-all resize-none min-h-[120px] ${isChatLocked ? 'opacity-50 cursor-pointer' : ''}`}
                    onKeyDown={(e) => {
                      if (isChatLocked) {
                        e.preventDefault();
                        handleLockedChatClick();
                        return;
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReplySubmit(e);
                      }
                    }}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <div className="relative" onClick={handleLockedChatClick}>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        disabled={isChatLocked || replyFiles.length >= 5}
                      />
                      <button type="button" disabled={isChatLocked} className="p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-colors disabled:opacity-50 disabled:hover:bg-transparent">
                        <Paperclip size={18} />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={sending || isChatLocked || !replyMessage.trim()}
                      onClick={(e) => {
                        if (isChatLocked) {
                          e.preventDefault();
                          handleLockedChatClick();
                        }
                      }}
                      className={`p-3 rounded-2xl text-white transition-all ${isInternalNote ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : `${theme.bgSolid} ${theme.bgHover} ${theme.shadow}`
                        } shadow-lg disabled:opacity-50 disabled:shadow-none`}
                    >
                      {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </div>
                {replyFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 px-2">
                    {replyFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs">
                        <span className="text-white/80 max-w-[150px] truncate">{file.name}</span>
                        <button type="button" onClick={() => setReplyFiles(replyFiles.filter((_, i) => i !== idx))} className="text-white/40 hover:text-red-400">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Sidebar Metadata */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-[32px] border border-white/5 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Ticket Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Status</span>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Priority</span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${ticket.priority === 'critical' ? 'text-red-400' :
                      ticket.priority === 'high' ? 'text-orange-400' :
                        ticket.priority === 'medium' ? 'text-amber-400' : 'text-white/40'
                    }`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Category</span>
                  <span className="text-sm text-white font-medium capitalize">{ticket.category || ticket.issueType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Scope</span>
                  <span className="text-sm text-white font-medium capitalize">{ticket.scope}</span>
                </div>
                {getTimeTakenMs(ticket) != null ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Time Taken</span>
                    <span className="text-sm text-white font-medium">
                      {formatDurationHours(getTimeTakenMs(ticket))}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Resolution Controls */}
            {canUpdateStatus && (
              <div className="pt-6 border-t border-white/5">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Resolution Actions</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/60 block mb-2">Update Status</label>
                    <select
                      value={ticket.status}
                      disabled={sending}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus !== ticket.status) {
                          setStatusModal({ isOpen: true, status: newStatus });
                        }
                      }}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none transition-all disabled:opacity-50 ${theme.borderFocus}`}
                    >
                      <option value="open" className="bg-[#0b0f1a]">Open</option>
                      <option value="in_progress" className="bg-[#0b0f1a]">In Progress</option>
                      <option value="waiting_for_user" className="bg-[#0b0f1a]">Waiting for User</option>
                      <option value="resolved" className="bg-[#0b0f1a]">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* User Resolution Controls */}
            {showResolutionControls && (
              <div className="pt-6 border-t border-white/5">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Accept Resolution?</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleStatusChange('closed')}
                    disabled={sending}
                    className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    Accept Resolution
                  </button>
                  <button
                    onClick={() => setStatusModal({ isOpen: true, status: 'in_progress' })}
                    disabled={sending}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    Reopen Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-lg rounded-3xl p-8 border border-white/10 relative shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2">Update Ticket Status</h3>
            <p className="text-white/60 text-sm mb-6">
              You are changing the ticket status to <span className="font-bold text-white uppercase tracking-widest">{statusModal.status.replace('_', ' ')}</span>.
              Please provide a message explaining this update.
            </p>

            <textarea
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="Explain the status change to the user..."
              className={`w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 text-sm focus:outline-none transition-all resize-none min-h-[120px] mb-6 ${theme.borderFocus}`}
              autoFocus
            />

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setStatusModal({ isOpen: false, status: '' });
                  setStatusMessage('');
                }}
                disabled={sending}
                className="px-6 py-2 rounded-xl text-white/40 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusConfirm}
                disabled={!statusMessage.trim() || sending}
                className={`px-6 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 ${theme.bgSolid} ${theme.bgHover}`}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Confirm Update'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
