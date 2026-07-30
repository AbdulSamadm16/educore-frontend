import React, { useEffect, useState } from 'react';
import greenLogo from '../../assets/green-logo.png';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Award, AlertTriangle, Loader2, Download, Calendar, User, BookOpen } from 'lucide-react';
import apiClient from '../../services/api';

export default function VerifyCertificate() {
  const { certificateNumber } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        setLoading(true);
        // Using the public validation endpoint
        const res = await apiClient.get(`/certificates/validate/${encodeURIComponent(certificateNumber)}`);
        setCertificate(res.data?.data);
        setError(null);
      } catch (err) {
        console.error('Failed to verify certificate:', err);
        setError('Certificate not found or invalid.');
        setCertificate(null);
      } finally {
        setLoading(false);
      }
    };

    if (certificateNumber) {
      verifyCertificate();
    }
  }, [certificateNumber]);

  const handleDownload = () => {
    if (certificate?.pdfUrl) {
      window.open(certificate.pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 lg:p-8 font-inter overflow-hidden relative">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-3xl glass-panel border border-white/10 rounded-[32px] p-8 md:p-12 relative z-10 shadow-2xl bg-black/40 backdrop-blur-xl">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mx-auto mb-6">
             <img src={greenLogo} alt="EduCore" className="w-14 h-14 object-contain brightness-0 invert" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
             <Award size={40} className="text-blue-400 hidden" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Certificate Verification</h1>
          <p className="text-white/50 text-sm">Verify the authenticity of an EduCore certificate</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/40">
            <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-[0.2em]">Verifying Record...</p>
          </div>
        ) : error || !certificate ? (
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-10 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Invalid Certificate</h2>
            <p className="text-red-400/70 text-sm mb-6 max-w-md mx-auto">
              We could not find a valid certificate matching the ID <span className="font-mono text-white/80">{certificateNumber}</span>. Please check the URL and try again.
            </p>
            <Link to="/" className="inline-block px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold border border-white/10 transition-colors">
              Return Home
            </Link>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-emerald-400 font-black text-lg">Verified Authentic</h3>
                <p className="text-emerald-400/70 text-sm">This certificate was officially issued by EduCore.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel border border-white/5 bg-white/5 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2 text-white/40">
                  <User size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Recipient</span>
                </div>
                <p className="text-lg font-bold text-white truncate" title={certificate.userId?.name}>{certificate.userId?.name || 'Unknown Learner'}</p>
              </div>

              <div className="glass-panel border border-white/5 bg-white/5 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2 text-white/40">
                  <BookOpen size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Course</span>
                </div>
                <p className="text-lg font-bold text-white truncate" title={certificate.courseId?.title}>{certificate.courseId?.title || 'Unknown Course'}</p>
              </div>

              <div className="glass-panel border border-white/5 bg-white/5 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2 text-white/40">
                  <Calendar size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Issue Date</span>
                </div>
                <p className="text-lg font-bold text-white">{formatDate(certificate.issueDate)}</p>
              </div>

              <div className="glass-panel border border-white/5 bg-white/5 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2 text-white/40">
                  <Award size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Certificate ID</span>
                </div>
                <p className="text-lg font-mono text-white">{certificate.certificateNumber}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
              <button 
                onClick={handleDownload}
                disabled={!certificate.pdfUrl}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download PDF
              </button>
              <Link 
                to="/"
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-sm transition-colors flex items-center justify-center"
              >
                Go to EduCore
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
