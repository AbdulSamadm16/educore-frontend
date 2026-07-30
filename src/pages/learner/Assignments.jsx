import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, Clock, Calendar, CheckCircle2, 
  AlertCircle, ChevronRight, BookOpen, Loader2,
  CheckCircle, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';

export default function Assignments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState('pending'); // 'pending', 'submitted', 'graded', 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssignmentsData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch active enrolled courses
      const enrollmentsRes = await apiClient.get('/enrollments/my-courses', {
        params: { limit: 50 }
      });
      const enrollments = enrollmentsRes.data.data.enrollments || [];

      if (enrollments.length === 0) {
        setAssignments([]);
        setError(null);
        return;
      }

      // 2. Fetch all curriculums and submissions in parallel
      const curriculumPromises = enrollments.map(async (e) => {
        const courseId = e.course?._id || e.course?.id;
        if (!courseId) return null;
        try {
          const res = await apiClient.get(`/courses/${courseId}/curriculum`);
          return {
            courseId,
            courseTitle: e.course?.title || 'Untitled Course',
            modules: res.data.data.modules || []
          };
        } catch (err) {
          console.error(`Failed to fetch curriculum for course ${courseId}:`, err);
          return null;
        }
      });

      const [curriculumsResult, submissionsRes] = await Promise.all([
        Promise.all(curriculumPromises),
        apiClient.get('/submissions/my-submissions').catch((err) => {
          console.error('Failed to fetch submissions:', err);
          return { data: { data: [] } };
        })
      ]);

      const curriculums = curriculumsResult.filter(Boolean);
      const submissions = submissionsRes.data.data || [];

      // 3. Map curriculum lessons to assignments list
      const mappedAssignments = [];
      curriculums.forEach((curr) => {
        curr.modules.forEach((mod) => {
          (mod.lessons || []).forEach((lesson) => {
            if (lesson.type === 'assignment') {
              // Find matching submissions for this assignment lesson
              const lessonSubmissions = submissions.filter((sub) => {
                const subLessonId = sub.lessonId?._id || sub.lessonId?.id || sub.lessonId;
                return String(subLessonId) === String(lesson.id || lesson._id || lesson.lessonId);
              });

              let status = 'pending';
              let grade = null;
              let attemptNumber = 0;

              if (lessonSubmissions.length > 0) {
                // The submissions are sorted by createdAt descending from backend
                const latestSub = lessonSubmissions[0];
                status = latestSub.status === 'graded' ? 'graded' : 'submitted';
                grade = latestSub.grade;
                attemptNumber = latestSub.attemptNumber;
              }

              mappedAssignments.push({
                lessonId: lesson.id || lesson._id || lesson.lessonId,
                courseId: curr.courseId,
                courseTitle: curr.courseTitle,
                title: lesson.title,
                description: lesson.description || '',
                instructions: lesson.assignmentMeta?.instructions || '',
                dueDate: lesson.assignmentMeta?.dueDate || null,
                maxMarks: lesson.assignmentMeta?.maxMarks || 100,
                status,
                grade,
                attemptNumber
              });
            }
          });
        });
      });

      setAssignments(mappedAssignments);
      setError(null);
    } catch (err) {
      console.error('Error fetching assignments data:', err);
      setError('Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignmentsData();
  }, [fetchAssignmentsData]);

  const handleOpenAssignment = (courseId, lessonId) => {
    navigate(`/learner-dashboard/player/${courseId}/${lessonId}`);
  };

  const getDueDateLabel = (dateStr) => {
    if (!dateStr) return 'No Due Date';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return 'No Due Date';
    return dateObj.toLocaleDateString(undefined, { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr);
    return !isNaN(dateObj.getTime()) && new Date() > dateObj;
  };

  // Metrics
  const totalCount = assignments.length;
  const pendingCount = assignments.filter((a) => a.status === 'pending').length;
  const submittedCount = assignments.filter((a) => a.status === 'submitted').length;
  const gradedCount = assignments.filter((a) => a.status === 'graded').length;

  // Filtered List
  const filteredAssignments = assignments.filter((a) => {
    const matchesFilter = filter === 'all' || a.status === filter;
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-blue-400 font-bold tracking-[0.2em] uppercase animate-pulse text-sm">Loading Assignments</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-[1400px] mx-auto space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-2 leading-none">
            My <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Assignments</span>
          </h2>
          <p className="text-blue-200/40 text-lg font-medium">Track your tasks, submit solutions, and review grades.</p>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-80 relative group">
          <input
            type="text"
            placeholder="Search assignments or courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-6 pr-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors">
            <ClipboardList size={18} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard label="Total Tasks" value={totalCount} subtitle="Assigned" color="blue" />
        <SummaryCard label="Pending" value={pendingCount} subtitle="To Hand In" color="yellow" highlight={pendingCount > 0} />
        <SummaryCard label="Submitted" value={submittedCount} subtitle="Under Review" color="violet" />
        <SummaryCard label="Graded" value={gradedCount} subtitle="Completed" color="emerald" />
      </div>

      <div className="h-px bg-white/5" />

      {/* Filters and List */}
      <div className="space-y-6">
        <div className="flex overflow-x-auto max-w-full custom-scrollbar whitespace-nowrap bg-white/5 p-1 rounded-2xl border border-white/5">
          {[
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'submitted', label: `Submitted (${submittedCount})` },
            { id: 'graded', label: `Graded (${gradedCount})` },
            { id: 'all', label: `All (${totalCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="glass-card p-12 rounded-[40px] border border-red-500/10 bg-red-500/5 flex flex-col items-center justify-center text-center">
            <AlertCircle size={48} className="text-red-400/20 mb-4" />
            <p className="text-white/60 font-medium mb-6">{error}</p>
            <button 
              onClick={fetchAssignmentsData}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Try Again
            </button>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAssignments.map((a, idx) => {
                const overdue = a.status === 'pending' && isOverdue(a.dueDate);
                return (
                  <motion.div
                    key={a.lessonId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="glass-card rounded-[32px] border border-white/5 bg-white/2 hover:border-blue-500/20 transition-all flex flex-col justify-between overflow-hidden group shadow-xl"
                  >
                    <div className="p-8 space-y-6">
                      {/* Badge / Metadata */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 min-w-0">
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] block truncate">
                            {a.courseTitle}
                          </span>
                          <h3 className="text-xl font-bold text-white leading-snug group-hover:text-blue-400 transition-colors line-clamp-1">
                            {a.title}
                          </h3>
                        </div>
                        <StatusBadge status={a.status} overdue={overdue} />
                      </div>

                      {/* Description */}
                      {a.description && (
                        <p className="text-xs text-white/50 leading-relaxed font-medium line-clamp-2">
                          {a.description}
                        </p>
                      )}

                      {/* Marks / Due Date */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-white/35">
                          <Calendar size={14} className="shrink-0" />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${overdue ? 'text-red-400 font-bold' : ''}`}>
                            {overdue ? 'Overdue: ' : ''}{getDueDateLabel(a.dueDate)}
                          </span>
                        </div>
                        <div className="text-[10px] font-black text-white/35 uppercase tracking-widest">
                          Max Marks: <span className="text-white">{a.maxMarks}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA bar */}
                    <div 
                      onClick={() => handleOpenAssignment(a.courseId, a.lessonId)}
                      className="px-8 py-4 bg-white/1 border-t border-white/5 group-hover:bg-blue-600/5 transition-all cursor-pointer flex items-center justify-between text-xs font-bold text-white/60 group-hover:text-blue-400"
                    >
                      <span className="font-bold uppercase tracking-wider text-[10px]">
                        {a.status === 'pending' ? 'Start Assignment' : 'View Solution / Attempt Details'}
                      </span>
                      <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-transform group-hover:text-blue-400" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="glass-card rounded-[40px] p-20 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center text-white/10 mb-6 border border-white/5">
              {filter === 'pending' ? <CheckCircle size={32} /> : <Inbox size={32} />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === 'pending' ? 'All caught up!' : 'No assignments found'}
            </h3>
            <p className="text-white/20 max-w-sm text-xs leading-relaxed">
              {filter === 'pending' 
                ? 'You do not have any pending assignments to hand in. Keep up the excellent work!' 
                : `No assignments fit the current filter state.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponents
function SummaryCard({ label, value, subtitle, color, highlight }) {
  const colorMap = {
    blue: 'from-blue-500/10 to-cyan-500/10 border-blue-500/10 text-blue-400',
    yellow: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/10 text-yellow-400',
    violet: 'from-violet-500/10 to-purple-500/10 border-violet-500/10 text-violet-400',
    emerald: 'from-emerald-500/10 to-green-500/10 border-emerald-500/10 text-emerald-400'
  };

  return (
    <div className={`glass-card p-6 rounded-[28px] border bg-gradient-to-br ${colorMap[color] || colorMap.blue} ${
      highlight ? 'ring-2 ring-yellow-500/20' : ''
    }`}>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-white">{value}</span>
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider">{subtitle}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status, overdue }) {
  if (overdue) {
    return (
      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase tracking-wider">
        Overdue
      </span>
    );
  }

  switch (status) {
    case 'graded':
      return (
        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
          Graded
        </span>
      );
    case 'submitted':
      return (
        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider">
          Submitted
        </span>
      );
    default:
      return (
        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] font-black uppercase tracking-wider">
          Pending
        </span>
      );
  }
}
