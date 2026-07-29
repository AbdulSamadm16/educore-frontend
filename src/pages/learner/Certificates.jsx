import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Award, Download, Loader2, ShieldCheck, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient, { API_BASE_URL } from '../../services/api';

const formatDate = (value, fallback = 'Pending') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/certificates/my-certificates');
      const payload = response.data?.data;
      setCertificates(Array.isArray(payload) ? payload : payload?.certificates || []);
      setError('');
    } catch (err) {
      console.error('Failed to load certificates:', err);
      setError('Failed to load your certificates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCertificates();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCertificates]);

  const handleDownload = (certificate) => {
    if (!certificate.pdfUrl) {
      toast.error('Certificate PDF is not available yet.');
      return;
    }
    window.open(certificate.pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const getValidationUrl = (certificateNumber) => {
    if (!certificateNumber) return '';
    return `${window.location.origin}/verify/${encodeURIComponent(certificateNumber)}`;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Certificates</h2>
        <p className="text-blue-200/40 font-medium">Certificates for your completed courses.</p>
      </div>

      {loading ? (
        <div className="min-h-[420px] flex flex-col items-center justify-center text-white/40">
          <Loader2 size={34} className="animate-spin mb-4 text-blue-400" />
          <p className="text-xs font-black uppercase tracking-[0.3em]">Loading Certificates</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-[32px] p-12 border border-red-500/15 bg-red-500/5 flex flex-col items-center text-center">
          <AlertCircle size={42} className="text-red-400/50 mb-4" />
          <p className="text-white/60 font-semibold mb-6">{error}</p>
          <button
            type="button"
            onClick={fetchCertificates}
            className="px-7 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Try Again
          </button>
        </div>
      ) : certificates.length === 0 ? (
        <div className="glass-card rounded-[40px] p-16 border border-white/5 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-8 border border-white/10">
            <Award size={48} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Unlock your first award</h3>
          <p className="text-white/20 max-w-xs">Complete a course to generate your certificate of completion.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {certificates.map((certificate) => {
            const course = certificate.courseId || certificate.course || {};
            const validationUrl = getValidationUrl(certificate.certificateNumber);
            const isIssued = certificate.status === 'issued';

            return (
              <article
                key={certificate.id || certificate._id || certificate.certificateNumber}
                className="glass-card rounded-[32px] border border-white/5 overflow-hidden bg-white/[0.02]"
              >
                <div className="p-7 flex items-start justify-between gap-5 border-b border-white/5">
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.25em] mb-3">
                      {certificate.status || 'processing'}
                    </p>
                    <h3 className="text-xl font-black text-white truncate">{course.title || 'Course Certificate'}</h3>
                    <p className="text-xs text-white/35 mt-2 font-mono truncate">{certificate.certificateNumber}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Award size={22} />
                  </div>
                </div>

                <div className="p-7 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[10px] text-white/25 font-black uppercase tracking-widest mb-1">Issued</p>
                      <p className="text-sm text-white font-bold">{formatDate(certificate.issueDate)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[10px] text-white/25 font-black uppercase tracking-widest mb-1">Status</p>
                      <p className={`text-sm font-bold ${isIssued ? 'text-emerald-400' : 'text-amber-300'}`}>
                        {isIssued ? 'Issued' : 'Processing'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => handleDownload(certificate)}
                      disabled={!certificate.pdfUrl}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Download
                    </button>
                    {validationUrl && (
                      <>
                        <a
                          href={validationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <ShieldCheck size={16} />
                          Validate
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(validationUrl);
                            toast.success('Public link copied to clipboard!');
                          }}
                          className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          Copy Link
                        </button>
                        <a
                          href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(course.title || 'Course Certificate')}&organizationName=${encodeURIComponent('EduCore')}&issueYear=${new Date(certificate.issueDate || Date.now()).getFullYear()}&issueMonth=${new Date(certificate.issueDate || Date.now()).getMonth() + 1}&certUrl=${encodeURIComponent(validationUrl)}&certId=${encodeURIComponent(certificate.certificateNumber)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-3 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 text-[#0077b5] border border-[#0077b5]/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Share2 size={16} />
                          LinkedIn
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
