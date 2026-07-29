import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';
import UniversalModal from '../../../components/shared/UniversalModal';

const REFUND_STATUS = {
  refund_pending: {
    label: 'Pending Review',
    tone: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  refund_failed: {
    label: 'Refund Failed',
    tone: 'bg-red-500/10 text-red-400 border-red-500/20'
  },
  refund_processing: {
    label: 'Processing',
    tone: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
};

export default function PlatformRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, config: {} });
  const [filter, setFilter] = useState('all');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/refunds/pending');
      setRefunds(response.data?.data?.refunds || []);
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
      toast.error('Failed to load pending refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const executeProcess = async (paymentId, action, reason = null) => {
    setProcessingId(paymentId);
    try {
      const response = await apiClient.post(`/admin/refunds/${paymentId}/process`, { action, reason });
      toast.success(response.data?.message || 'Refund action completed');
      fetchRefunds();
    } catch (error) {
      console.error(`Failed to ${action} refund:`, error);
      const errorMessage = error.response?.data?.message || 'Refund could not be completed. It remains in the queue.';
      setModalConfig({
        isOpen: true,
        config: {
          type: 'alert',
          title: action === 'retry' ? 'Retry Refund Failed' : 'Refund Failed',
          message: errorMessage,
          confirmText: 'Close'
        }
      });
      fetchRefunds();
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcess = (refund, action) => {
    const paymentId = refund._id;
    if (action === 'approve') {
      setModalConfig({
        isOpen: true,
        config: {
          type: 'confirm',
          title: 'Approve & Refund',
          message: 'This will approve the request and initiate a full Razorpay refund. Course access will remain paused and cannot be restored unless the refund is rejected before approval.',
          onConfirm: () => executeProcess(paymentId, 'approve')
        }
      });
    } else if (action === 'retry') {
      setModalConfig({
        isOpen: true,
        config: {
          type: 'confirm',
          title: 'Retry Refund',
          message: 'Retry the full Razorpay refund for this failed request?',
          onConfirm: () => executeProcess(paymentId, 'retry')
        }
      });
    } else if (action === 'reject') {
      setModalConfig({
        isOpen: true,
        config: {
          type: 'prompt',
          title: 'Reject Refund',
          message: 'Please provide a reason for rejecting this refund request. This will be sent to the learner.',
          inputPlaceholder: 'e.g. You have already consumed more than 20% of the course.',
          onConfirm: (reason) => {
            if (!reason?.trim()) {
              toast.error('A reason is required to reject a refund request.');
              return;
            }
            executeProcess(paymentId, 'reject', reason);
          }
        }
      });
    }
  };

  const filteredRefunds = refunds.filter((refund) => (
    filter === 'all' || refund.paymentStatus === filter
  ));

  const counts = refunds.reduce((acc, refund) => {
    acc[refund.paymentStatus] = (acc[refund.paymentStatus] || 0) + 1;
    return acc;
  }, {});

  if (loading && refunds.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Refund Queue</h1>
          <p className="text-white/40">Review learner refund requests and retry failed Razorpay refunds.</p>
        </div>
        <button
          onClick={fetchRefunds}
          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All', count: refunds.length },
          { key: 'refund_pending', label: 'Pending', count: counts.refund_pending || 0 },
          { key: 'refund_processing', label: 'Processing', count: counts.refund_processing || 0 },
          { key: 'refund_failed', label: 'Failed', count: counts.refund_failed || 0 }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === tab.key
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {filteredRefunds.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 rounded-3xl border-dashed border-white/10 flex flex-col items-center justify-center text-center"
            >
              <AlertCircle size={48} className="text-white/20 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Refunds Found</h3>
              <p className="text-white/40">There are no refund requests matching this view.</p>
            </motion.div>
          ) : (
            filteredRefunds.map((refund) => {
              const status = REFUND_STATUS[refund.paymentStatus] || {
                label: refund.paymentStatus || 'Unknown',
                tone: 'bg-white/5 text-white/40 border-white/10'
              };
              const isFailed = refund.paymentStatus === 'refund_failed';
              const isPending = refund.paymentStatus === 'refund_pending';

              return (
              <motion.div
                key={refund._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-6 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${status.tone}`}>
                      {status.label}
                    </span>
                    <span className="text-white/40 text-xs font-bold uppercase tracking-wider">
                      {formatDateTime(refund.updatedAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {refund.courseId?.title || 'Unknown Course'}
                  </h3>
                  <div className="text-white/60 text-sm flex items-center gap-4">
                    <span><strong className="text-white">Learner:</strong> {refund.learnerId?.name} ({refund.learnerId?.email})</span>
                    <span><strong className="text-white">Amount:</strong> {refund.currency} {refund.amount}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-white/40">
                    <span><strong className="text-white/70">Payment ID:</strong> {refund.transactionId || 'Not available'}</span>
                    <span><strong className="text-white/70">Refund ID:</strong> {refund.razorpayRefundId || 'Not created yet'}</span>
                    <span><strong className="text-white/70">Attempts:</strong> {refund.refundAttempts || 0}</span>
                  </div>
                  {isFailed && (
                    <div 
                      onClick={() => setModalConfig({
                        isOpen: true,
                        config: {
                          type: 'alert',
                          title: 'Refund Failure Details',
                          message: refund.refundFailureReason || 'Razorpay refund failed. Retry the refund after checking gateway balance or issue details.',
                          confirmText: 'Close'
                        }
                      })}
                      className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 text-red-200 text-xs leading-relaxed cursor-pointer transition-all flex items-center justify-between group/banner"
                    >
                      <span className="flex-1">{refund.refundFailureReason || 'Razorpay refund failed.'}</span>
                      <span className="text-[9px] uppercase tracking-widest text-red-400 font-bold ml-2 shrink-0 select-none group-hover/banner:text-red-300 transition-colors">View Details</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  {isPending && (
                    <button
                      onClick={() => handleProcess(refund, 'reject')}
                      disabled={processingId === refund._id}
                      className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === refund._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      Reject
                    </button>
                  )}
                  {isPending && (
                    <button
                      onClick={() => handleProcess(refund, 'approve')}
                      disabled={processingId === refund._id}
                      className="flex-1 md:flex-none px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === refund._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      Approve & Refund
                    </button>
                  )}
                  {isFailed && (
                    <button
                      onClick={() => handleProcess(refund, 'retry')}
                      disabled={processingId === refund._id}
                      className="flex-1 md:flex-none px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === refund._id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                      Retry Refund
                    </button>
                  )}
                </div>
              </motion.div>
            );
            })
          )}
        </AnimatePresence>
      </div>

      <UniversalModal 
        isOpen={modalConfig.isOpen} 
        config={modalConfig.config} 
        onClose={() => setModalConfig({ isOpen: false, config: {} })} 
      />
    </div>
  );
}
