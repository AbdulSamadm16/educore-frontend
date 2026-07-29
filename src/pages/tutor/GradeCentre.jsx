import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, ClipboardList, Search, 
  FileText, ExternalLink, ChevronRight, X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';

export default function GradeCentre() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  
  // Data lists
  const [submissions, setSubmissions] = useState([]);

  // Active items being graded in the modal
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Grade form states
  const [awardGrade, setAwardGrade] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    fetchGradingData();
  }, []);

  const fetchGradingData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/submissions/tutor/list');
      setSubmissions(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch grading details:', e);
      toast.error('Failed to load grading records.');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmissionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const maxMarks = selectedSubmission.lessonId?.maxMarks || selectedSubmission.lessonId?.assignmentMeta?.maxMarks || 100;
    const gradeVal = parseFloat(awardGrade);

    if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > maxMarks) {
      toast.error(`Please award a grade between 0 and maximum points (${maxMarks}).`);
      return;
    }

    const toastId = toast.loading('Saving assignment grade...');
    try {
      await apiClient.patch(`/submissions/${selectedSubmission.id || selectedSubmission._id}/grade`, {
        grade: gradeVal,
        feedback: feedbackText
      });
      toast.success('Assignment graded successfully!', { id: toastId });
      setSelectedSubmission(null);
      fetchGradingData();
    } catch (err) {
      console.error('Grading failed:', err);
      toast.error(err.response?.data?.message || 'Failed to submit grade.', { id: toastId });
    }
  };

  const openGradingDesk = (sub) => {
    setSelectedSubmission(sub);
    setAwardGrade(sub.grade !== null ? String(sub.grade) : '');
    setFeedbackText(sub.feedback || '');
  };

  // Unique Courses for filtering
  const uniqueCourses = React.useMemo(() => {
    const map = new Map();
    submissions.forEach(sub => {
      if (sub.courseId && (sub.courseId._id || sub.courseId.id)) {
        const id = sub.courseId._id || sub.courseId.id;
        map.set(String(id), sub.courseId.title || 'Unknown Course');
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [submissions]);

  // Filters
  const filteredSubmissions = submissions.filter(sub => {
    if (selectedCourseId !== 'all') {
      const cId = sub.courseId?._id || sub.courseId?.id || sub.courseId;
      if (String(cId) !== String(selectedCourseId)) return false;
    }
    const sName = (sub.userId?.name || '').toLowerCase();
    const lTitle = (sub.lessonId?.title || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return sName.includes(query) || lTitle.includes(query);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center relative group w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Filter by student name or lesson title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>
        
        {uniqueCourses.length > 0 && (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
          >
            <option value="all" className="bg-[#0f172a] text-white">All Courses</option>
            {uniqueCourses.map(c => (
              <option key={c.id} value={c.id} className="bg-[#0f172a] text-white">
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-[32px] border border-white/5 bg-white/2 overflow-hidden">
          {filteredSubmissions.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/1">
                    <th className="p-6">Student</th>
                    <th className="p-6">Assignment Lesson</th>
                    <th className="p-6">Submitted Date</th>
                    <th className="p-6">Attempt</th>
                    <th className="p-6">Status</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-white/70">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id || sub._id} className="hover:bg-white/1 transition-all">
                      <td className="p-6">
                        <p className="font-bold text-white">{sub.userId?.name || 'Student'}</p>
                        <p className="text-xs text-white/30">{sub.userId?.email || '—'}</p>
                      </td>
                      <td className="p-6">
                        <p className="font-bold text-white/80">{sub.lessonId?.title || 'Assignment'}</p>
                        <p className="text-[10px] text-purple-400/80 font-bold uppercase tracking-wider mt-1">{sub.courseId?.title || 'Unknown Course'}</p>
                      </td>
                      <td className="p-6 text-xs text-white/40">
                        {new Date(sub.createdAt).toLocaleString()}
                      </td>
                      <td className="p-6 font-mono font-bold">#{sub.attemptNumber}</td>
                      <td className="p-6">
                        {sub.status === 'graded' ? (
                          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest">
                            Graded: {sub.grade} Points
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-black uppercase tracking-widest">
                            Pending Grade
                          </span>
                        )}
                      </td>
                      <td className="p-6 text-right">
                        <button
                          onClick={() => openGradingDesk(sub)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          Grade Desk <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center text-white/20 italic text-sm">
              <ClipboardList size={40} className="mx-auto mb-4 opacity-40 text-purple-400" />
              No assignment submissions found.
            </div>
          )}
        </div>
      )}

      {/* Assignment Grading Desk Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedSubmission(null)}
            className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl transition-all"
          />
          <div
            className="relative w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-50 text-white animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                  <ClipboardList size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wider">Assignment Grading Desk</h3>
                  <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-0.5">
                    Student: {selectedSubmission.userId?.name} · Attempt #{selectedSubmission.attemptNumber}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleGradeSubmissionSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
              <div>
                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Assignment Instructions</h4>
                <p className="text-sm text-white/60 bg-white/1 p-4 rounded-2xl border border-white/5 leading-relaxed font-medium">
                  {selectedSubmission.lessonId?.assignmentMeta?.instructions || 'Read the lecture files and submit.'}
                </p>
              </div>

              {/* Submitted text */}
              {selectedSubmission.content && (
                <div>
                  <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Submitted Online Text</h4>
                  <div className="text-sm text-white bg-white/2 p-5 rounded-2xl border border-white/5 leading-relaxed font-medium whitespace-pre-line">
                    "{selectedSubmission.content}"
                  </div>
                </div>
              )}

              {/* Submitted files hosted on Cloudinary */}
              {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">Submitted Files (Cloudinary Hosted)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedSubmission.attachments.map((file, idx) => {
                      const cleanUrl = (file.fileUrl || '').split('?')[0].toLowerCase();
                      const isOfficeDoc = 
                        cleanUrl.endsWith('.docx') || 
                        cleanUrl.endsWith('.doc') || 
                        cleanUrl.endsWith('.xlsx') || 
                        cleanUrl.endsWith('.xls') || 
                        cleanUrl.endsWith('.pptx') || 
                        cleanUrl.endsWith('.ppt');

                      let viewUrl = file.fileUrl;
                      if (isOfficeDoc) {
                        viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.fileUrl)}`;
                      }

                      return (
                        <div
                          key={idx}
                          className="flex flex-col p-4 bg-white/2 border border-white/5 rounded-2xl gap-3 text-sm font-bold transition-all hover:border-purple-500/20"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={18} className="shrink-0 text-purple-400" />
                            <span className="truncate text-white font-bold" title={file.title || 'Attachment file'}>
                              {file.title || 'Attachment file'}
                            </span>
                          </div>
                          
                          <div className="flex">
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ExternalLink size={12} />
                              View Attachment
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grade Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">
                    Award Score (Max: {selectedSubmission.lessonId?.maxMarks || selectedSubmission.lessonId?.assignmentMeta?.maxMarks || 100})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={awardGrade}
                    onChange={(e) => setAwardGrade(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-black text-sm"
                    placeholder="e.g. 85"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">
                    Tutor Grade Comments
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 h-28 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all text-xs"
                    placeholder="Enter constructive remarks, rubrics details, or follow-up tips..."
                  />
                </div>
              </div>

              {/* Footer buttons inside Modal */}
              <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-purple-600/20"
                >
                  Deploy Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
