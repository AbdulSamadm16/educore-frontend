import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Mail,
  Search,
  User,
  Users,
  X
} from 'lucide-react';
import apiClient from '../../services/api';
import { AnimatePresence, motion } from 'framer-motion';

const STUDENTS_PER_PAGE = 15;

const formatDate = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateCSV = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const getCourseId = (course) => {
  if (!course) return '';
  if (typeof course === 'object') {
    return String(course._id || course.id || '');
  }
  return String(course);
};

const getProgress = (studentRecord) => {
  if (!studentRecord?.enrollments || studentRecord.enrollments.length === 0) return 0;
  const total = studentRecord.enrollments.reduce((sum, e) => sum + (Number(e.progressPercentage) || 0), 0);
  return Math.round(total / studentRecord.enrollments.length);
};

export default function TutorStudents() {
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const uniqueCourses = useMemo(() => {
    const courseMap = new Map();
    courses.forEach((course) => {
      const cId = getCourseId(course);
      if (cId && !courseMap.has(cId)) {
        courseMap.set(cId, course);
      }
    });
    enrollments.forEach((studentRecord) => {
      if (studentRecord.enrollments) {
        studentRecord.enrollments.forEach((e) => {
          const course = e.courseId;
          const cId = getCourseId(course);
          if (cId && !courseMap.has(cId)) {
            courseMap.set(cId, course);
          }
        });
      }
    });
    return Array.from(courseMap.values());
  }, [courses, enrollments]);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/enrollments/tutor/students', {
          params: {
            page,
            limit: STUDENTS_PER_PAGE,
            search: searchTerm.trim() || undefined,
            courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined
          }
        });
        const data = response.data.data || {};
        const pagination = data.pagination || {};
        setEnrollments(data.enrollments || []);
        setCourses(data.courses || []);
        setTotalPages(pagination.pages || 1);
        setTotalEnrollments(pagination.total || 0);
        setError('');
      } catch (err) {
        console.error('Error fetching tutor students:', err);
        setError('Failed to retrieve your students.');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [page, searchTerm, selectedCourseId]);

  const handleExport = async () => {
    let exportEnrollments = enrollments;

    if (totalEnrollments > enrollments.length) {
      try {
        const response = await apiClient.get('/enrollments/tutor/students', {
          params: {
            page: 1,
            limit: totalEnrollments,
            search: searchTerm.trim() || undefined,
            courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined
          }
        });
        exportEnrollments = response.data.data.enrollments || [];
      } catch (err) {
        console.error('Error exporting tutor students:', err);
      }
    }

    const headers = ['Student Name', 'Email', 'Course Enrolled', 'Enrolled Date', 'Progress %', 'Status'];
    const rows = exportEnrollments.map((studentRecord) => {
      const courseTitles = studentRecord.enrollments.map(e => e.courseId?.title || 'Unknown Course').join('; ');
      const totalProg = studentRecord.enrollments.reduce((sum, e) => sum + (Number(e.progressPercentage) || 0), 0);
      const avgProg = studentRecord.enrollments.length > 0 ? Math.round(totalProg / studentRecord.enrollments.length) : 0;
      const statuses = Array.from(new Set(studentRecord.enrollments.map(e => e.status || 'active'))).join('; ');

      return [
        studentRecord.userId?.name || 'Anonymous Student',
        studentRecord.userId?.email || 'N/A',
        courseTitles,
        formatDateCSV(studentRecord.enrolledAt || studentRecord.createdAt),
        `${avgProg}%`,
        statuses
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Enrolled_Students_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openProgressDetail = async (studentRecord) => {
    setSelectedEnrollment(studentRecord);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-end mb-6">
        <button
          onClick={handleExport}
          disabled={totalEnrollments === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white border border-white/10 rounded-2xl font-bold transition-all"
        >
          <Download size={18} />
          Export to CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
        <div className="md:col-span-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/20 transition-all"
          />
        </div>

        <div className="md:col-span-4 relative">
          <select
            value={selectedCourseId}
            onChange={(event) => {
              setSelectedCourseId(event.target.value);
              setPage(1);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-6 text-sm text-white/60 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/20 transition-all appearance-none cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f19]">All Courses</option>
            {uniqueCourses.map((course) => (
              <option key={course._id} value={course._id} className="bg-[#0b0f19]">
                {course.title}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
        </div>
      </div>

      {error ? (
        <div className="glass-card rounded-[32px] p-20 border border-red-500/20 bg-red-500/5 text-center">
          <AlertCircle size={48} className="text-red-400/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Unable to load students</h3>
          <p className="text-red-200/50">{error}</p>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="glass-card rounded-[32px] p-20 border border-white/5 text-center">
          <Users size={48} className="text-white/10 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-white mb-2">No students found</h3>
          <p className="text-white/40">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="rounded-[32px] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-white/[0.03] border-b border-white/5">
                <tr className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment, index) => (
                  <StudentRow
                    key={enrollment._id || index}
                    enrollment={enrollment}
                    index={index}
                    onOpen={openProgressDetail}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && totalEnrollments > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalEnrollments}
          pageSize={STUDENTS_PER_PAGE}
          itemLabel="students"
          onPageChange={setPage}
        />
      )}

      <ProgressModal
        enrollment={selectedEnrollment}
        onClose={() => setSelectedEnrollment(null)}
      />
    </div>
  );
}

function Pagination({ page, totalPages, totalItems, pageSize, itemLabel, onPageChange }) {
  const startItem = Math.min((page - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(page * pageSize, totalItems);

  const pages = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let index = 1; index <= totalPages; index += 1) pages.push(index);
  } else if (page <= 3) {
    pages.push(1, 2, 3, 4, '...', totalPages);
  } else if (page >= totalPages - 2) {
    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
  }

  return (
    <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-white/5 pt-8">
      <p className="text-sm text-white/40 font-medium">
        Showing <span className="text-white font-bold">{startItem}</span> to{' '}
        <span className="text-white font-bold">{endItem}</span> of{' '}
        <span className="text-white font-bold">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all disabled:opacity-30 disabled:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((pageNumber, index) => (
          pageNumber === '...' ? (
            <span key={`dots-${index}`} className="px-3 text-white/20 select-none">...</span>
          ) : (
            <button
              type="button"
              key={`page-${pageNumber}`}
              onClick={() => onPageChange(pageNumber)}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                pageNumber === page
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 border border-purple-500'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              {pageNumber}
            </button>
          )
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all disabled:opacity-30 disabled:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function StudentRow({ enrollment, index, onOpen }) {
  const studentName = enrollment.userId?.name || 'Anonymous Student';
  const studentEmail = enrollment.userId?.email || 'N/A';
  const avatar = enrollment.userId?.profile?.avatarUrl;
  const initials = studentName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase();
  const courseCount = enrollment.enrollments?.length || 0;

  return (
    <motion.tr
      role="button"
      tabIndex={0}
      onClick={() => onOpen(enrollment)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(enrollment);
        }
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer focus:outline-none focus:bg-white/[0.04]"
    >
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            {avatar ? (
              <img src={avatar} alt={studentName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-black text-purple-400">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate max-w-[180px]" title={studentName}>{studentName}</p>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">
              {courseCount} {courseCount === 1 ? 'Course' : 'Courses'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2 text-white/50">
          <Mail size={14} />
          <span className="text-xs font-medium truncate max-w-[220px]" title={studentEmail}>{studentEmail}</span>
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-widest">
          <Eye size={14} />
          View Profile
        </span>
      </td>
    </motion.tr>
  );
}

function ProgressModal({ enrollment, onClose }) {
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    setSelectedCourse(null);
  }, [enrollment]);

  const student = enrollment?.userId || {};
  const studentName = student.name || 'Anonymous Student';
  const studentEmail = student.email || 'N/A';

  return (
    <AnimatePresence>
      {enrollment && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="glass-card rounded-[36px] border border-gray-200 dark:border-white/10 w-full max-w-6xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-900 dark:text-white"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-gray-200 dark:border-white/5 flex items-start justify-between gap-6 bg-gray-50/50 dark:bg-white/2">
              <div className="min-w-0">
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-[0.3em] mb-3">Student Hub</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate">{studentName}</h3>
                <p className="text-sm text-gray-500 dark:text-white/40 truncate">{studentEmail}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {!selectedCourse ? (
              <div className="p-8 flex-1 overflow-y-auto min-h-0 custom-scrollbar text-slate-900 dark:text-white">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-purple-600 dark:text-purple-400" /> Enrolled Courses
                  </h4>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    {enrollment.enrollments?.length || 0} Total
                  </span>
                </div>

                <div className="rounded-[28px] border border-gray-200 dark:border-white/5 overflow-hidden">
                  <table className="w-full text-left min-w-[720px]">
                    <thead className="bg-gray-100/50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/5">
                      <tr className="text-[10px] text-gray-500 dark:text-white/30 font-black uppercase tracking-widest">
                        <th className="px-5 py-4">Course Name</th>
                        <th className="px-5 py-4">Enrolled Date</th>
                        <th className="px-5 py-4">Progress</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollment.enrollments?.map((e, idx) => {
                        const progress = Number(e.progressPercentage || 0);
                        const isCompleted = e.status === 'completed' || progress >= 100;
                        return (
                          <tr
                            key={e._id || idx}
                            onClick={() => setSelectedCourse(e)}
                            className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer group"
                          >
                            <td className="px-5 py-5">
                              <div className="flex items-center gap-3">
                                <BookOpen size={16} className="text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  {e.courseId?.title || 'Unknown Course'}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-5 text-xs font-semibold text-gray-500 dark:text-white/40">
                              {formatDate(e.enrolledAt || e.createdAt)}
                            </td>
                            <td className="px-5 py-5">
                              <div className="w-36">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black text-slate-800 dark:text-white">{progress}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-5">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                e.status === 'completed' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                                e.status === 'active' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
                                'text-gray-500 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
                              }`}>
                                {e.status || 'active'}
                              </span>
                            </td>
                            <td className="px-5 py-5 text-right">
                              <button
                                type="button"
                                className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-colors shadow-sm cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 flex-1 overflow-y-auto min-h-0 custom-scrollbar text-slate-900 dark:text-white">
                {/* Back Button and Course Info */}
                <div className="flex flex-col gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(null)}
                    className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                    Back to Course List
                  </button>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/5 pb-6">
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white">{selectedCourse.courseId?.title || 'Course Details'}</h4>
                      <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                        Enrolled on {formatDate(selectedCourse.enrolledAt || selectedCourse.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 dark:text-white/30 font-black uppercase tracking-widest">Progress</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{selectedCourse.progressPercentage || 0}%</p>
                      </div>
                      <div className="w-24 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-purple-600"
                          style={{ width: `${selectedCourse.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quiz results */}
                <div className="mb-8">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Award size={18} className="text-purple-600 dark:text-purple-400" /> Quiz Results
                  </h4>
                  {selectedCourse.quizResults && selectedCourse.quizResults.length > 0 ? (
                    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 overflow-hidden">
                      <table className="w-full text-left min-w-[620px]">
                        <thead className="bg-gray-100/50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/5">
                          <tr className="text-[10px] text-gray-500 dark:text-white/30 font-black uppercase tracking-widest">
                            <th className="px-5 py-4">Quiz Lesson</th>
                            <th className="px-5 py-4">Attempts</th>
                            <th className="px-5 py-4">Latest Score</th>
                            <th className="px-5 py-4">Best Score</th>
                            <th className="px-5 py-4">Passing Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCourse.quizResults.map((qResult, qIdx) => (
                            <tr key={qResult.lessonId || qIdx} className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                              <td className="px-5 py-4 text-sm text-slate-800 dark:text-white font-semibold">
                                {qResult.quizTitle}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono font-bold text-gray-500 dark:text-white/60">
                                {qResult.attemptsCount} {qResult.attemptsCount === 1 ? 'attempt' : 'attempts'}
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-700 dark:text-white/80 font-bold">
                                {qResult.latestScore} / {qResult.maxScore} ({Math.round(qResult.percentage)}%)
                              </td>
                              <td className="px-5 py-4 text-xs text-purple-600 dark:text-purple-400 font-bold">
                                {qResult.bestScore} / {qResult.maxScore}
                              </td>
                              <td className="px-5 py-4">
                                {qResult.passed ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">Pass</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider">Fail</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] p-8 text-center text-xs text-gray-500 dark:text-white/35 italic font-medium">
                      No quizzes attempted by this learner in this course yet.
                    </div>
                  )}
                </div>

                {/* Assignment Submissions */}
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Award size={18} className="text-purple-600 dark:text-purple-400" /> Assignment Submissions
                  </h4>
                  {selectedCourse.submissions && selectedCourse.submissions.length > 0 ? (
                    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 overflow-hidden">
                      <table className="w-full text-left min-w-[620px]">
                        <thead className="bg-gray-100/50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/5">
                          <tr className="text-[10px] text-gray-500 dark:text-white/30 font-black uppercase tracking-widest">
                            <th className="px-5 py-4">Assignment</th>
                            <th className="px-5 py-4">Submit Date</th>
                            <th className="px-5 py-4">Attempt</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Grade</th>
                            <th className="px-5 py-4">Attachments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCourse.submissions.map((sub, sIdx) => (
                            <tr key={sub._id || sIdx} className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                              <td className="px-5 py-4">
                                <div className="text-sm text-slate-800 dark:text-white font-semibold">{sub.assignmentTitle}</div>
                                {sub.feedback && (
                                  <div className="text-[10px] text-slate-500 dark:text-white/40 mt-1 max-w-[280px]">
                                    <span className="font-bold">Feedback:</span> {sub.feedback}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-white/40">
                                {formatDate(sub.submittedAt)}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono font-bold text-gray-500 dark:text-white/60">
                                #{sub.attemptNumber}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                  sub.status === 'graded' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                                  sub.status === 'returned' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                                  'text-blue-500 bg-blue-500/10 border-blue-500/20'
                                }`}>
                                  {sub.status || 'submitted'}
                                  {sub.isLate && ' · Late'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-xs font-bold text-purple-600 dark:text-purple-400">
                                {sub.grade !== null ? `${sub.grade} / 100` : '-'}
                              </td>
                              <td className="px-5 py-4">
                                {sub.attachments && sub.attachments.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {sub.attachments.map((file, fIdx) => (
                                      <a
                                        key={fIdx}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 underline font-semibold truncate max-w-[120px]"
                                        title={file.title || 'Attachment'}
                                      >
                                        {file.title || 'View File'}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] p-8 text-center text-xs text-gray-500 dark:text-white/35 italic font-medium">
                      No assignments submitted by this learner in this course yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DetailTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] p-5 min-w-0 shadow-sm border-dashed">
      <Icon size={18} className="text-purple-600 dark:text-purple-400 mb-4" />
      <p className="text-[10px] text-gray-400 dark:text-white/30 font-black uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm text-slate-800 dark:text-white font-bold truncate" title={value}>{value}</p>
    </div>
  );
}
