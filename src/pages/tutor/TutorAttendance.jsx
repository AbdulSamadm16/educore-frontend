import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Users, Calendar, Search, 
  X, Mail, Check, Clock, RefreshCw, Download, 
  UserCheck, AlertCircle, FileText, CheckCircle2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

export default function TutorAttendance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'institution_admin' || user?.accountType === 'institution_admin';
  const theme = isAdmin ? 'emerald' : 'purple';

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [learners, setLearners] = useState([]);
  
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingLearners, setLoadingLearners] = useState(false);
  
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'students' | 'reports'

  // Reports tab states
  const [reportRecords, setReportRecords] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportLimit, setReportLimit] = useState(20);
  
  // Filter states for reports
  const [filterBatchId, setFilterBatchId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchReportRecords = async (page = 1) => {
    setReportLoading(true);
    try {
      const params = {
        page,
        limit: reportLimit,
        batchId: filterBatchId || undefined,
        studentId: filterStudentId || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      };
      const res = await apiClient.get('/institution-attendance/records', { params });
      if (res.data?.success || res.data?.data) {
        const payload = res.data?.data || res.data;
        setReportRecords(payload.records || []);
        setReportTotal(payload.pagination?.total || 0);
        setReportPage(payload.pagination?.page || 1);
      }
    } catch (err) {
      console.error('Error fetching report records:', err);
      toast.error('Failed to fetch attendance reports');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportReportCSV = async () => {
    const exportToast = toast.loading('Generating CSV report...');
    try {
      const params = {
        batchId: filterBatchId || undefined,
        studentId: filterStudentId || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      };
      const response = await apiClient.get('/institution-attendance/records/export.csv', {
        params,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('CSV report downloaded successfully', { id: exportToast });
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to download CSV report', { id: exportToast });
    }
  };

  const handleExportReportPDF = async () => {
    const exportToast = toast.loading('Generating PDF report...');
    try {
      const params = {
        batchId: filterBatchId || undefined,
        studentId: filterStudentId || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      };
      const response = await apiClient.get('/institution-attendance/records/export.pdf', {
        params,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF report downloaded successfully', { id: exportToast });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to download PDF report', { id: exportToast });
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportRecords(1);
    }
  }, [activeTab, filterBatchId, filterStudentId, filterDateFrom, filterDateTo]);
  const [sessionsSearch, setSessionsSearch] = useState('');
  const [studentsSearch, setStudentsSearch] = useState('');
  
  // Modal states
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // studentId => { status, note }
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Student Profile detail state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [studentHistory, setStudentHistory] = useState([]);
  const [studentError, setStudentError] = useState(null);

  useEffect(() => {
    fetchBatches();
    fetchLearners();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchSessions(selectedBatchId);
    } else {
      setSessions([]);
    }
  }, [selectedBatchId]);

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const response = await apiClient.get('/attendance/tutor/batches');
      if (response.data?.success) {
        const batchList = response.data.data.batches || [];
        setBatches(batchList);
        if (batchList.length > 0) {
          setSelectedBatchId(batchList[0]._id || batchList[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchLearners = async () => {
    setLoadingLearners(true);
    try {
      const response = await apiClient.get('/attendance/tutor/students');
      if (response.data?.success) {
        setLearners(response.data.data.users || []);
      }
    } catch (error) {
      console.error('Error fetching learners:', error);
    } finally {
      setLoadingLearners(false);
    }
  };

  const fetchBatchSessions = async (batchId) => {
    setLoadingSessions(true);
    try {
      const response = await apiClient.get(`/attendance/tutor/batches/${batchId}/history`);
      if (response.data?.success) {
        setSessions(response.data.data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching batch sessions:', error);
      toast.error('Failed to load live sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const openMarkModal = async (session) => {
    setSelectedSession(session);
    setRosterLoading(true);
    setShowMarkModal(true);
    setRosterStudents([]);
    setAttendanceMap({});

    try {
      const response = await apiClient.get(`/attendance/tutor/sessions/${session._id || session.id}/roster`);
      if (response.data?.success) {
        const students = response.data.data.students || [];
        setRosterStudents(students);
        
        // Populate initial map from loaded roster values
        const initialMap = {};
        students.forEach((item) => {
          const studentId = item.user?._id || item.user?.id;
          if (studentId) {
            initialMap[studentId] = {
              status: item.attendance?.attendanceStatus || 'present', // Default to present if not marked
              note: item.attendance?.note || ''
            };
          }
        });
        setAttendanceMap(initialMap);
      }
    } catch (error) {
      console.error('Error fetching roster for session:', error);
      toast.error('Failed to load student list');
      setShowMarkModal(false);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNoteChange = (studentId, note) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note
      }
    }));
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!selectedSession) return;

    const records = Object.entries(attendanceMap).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      note: data.note
    }));

    if (records.length === 0) {
      toast.error('Roster is empty');
      return;
    }

    setSubmittingAttendance(true);
    const saveToast = toast.loading('Saving attendance records...');
    try {
      const response = await apiClient.put(
        `/attendance/tutor/sessions/${selectedSession._id || selectedSession.id}`,
        { records }
      );
      if (response.data?.success) {
        toast.success('Attendance saved successfully!', { id: saveToast });
        setShowMarkModal(false);
        if (selectedBatchId) {
          fetchBatchSessions(selectedBatchId); // Refresh count statistics
        }
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to save attendance', { id: saveToast });
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const openStudentModal = async (student) => {
    setSelectedStudent(student);
    setLoadingStudentDetail(true);
    setShowStudentModal(true);
    setStudentHistory([]);
    setStudentError(null);

    try {
      const response = await apiClient.get(`/attendance/tutor/students/${student._id || student.id}`);
      if (response.data?.success) {
        setStudentHistory(response.data.data.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching student history:', error);
      const errCode = error.response?.data?.error?.code || error.response?.data?.errorCode;
      if (errCode === 'STUDENT_NOT_FOUND') {
        setStudentError('The requested student does not exist or does not belong to your institution.');
      } else {
        setStudentError(error.response?.data?.message || 'Failed to load student attendance log');
      }
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const handleExportSessionCSV = async (sessionId, sessionTitle) => {
    const exportToast = toast.loading('Generating session CSV report...');
    try {
      const response = await apiClient.get(`/attendance/tutor/sessions/${sessionId}/export.csv`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${sessionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Session report downloaded successfully', { id: exportToast });
    } catch (error) {
      console.error('Failed to export session attendance:', error);
      toast.error('Failed to download report', { id: exportToast });
    }
  };

  const handleExportStudentCSV = async (studentId, studentName) => {
    const exportToast = toast.loading('Generating student CSV report...');
    try {
      const response = await apiClient.get(`/attendance/tutor/students/${studentId}/export.csv`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${studentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Student report downloaded successfully', { id: exportToast });
    } catch (error) {
      console.error('Failed to export student attendance:', error);
      toast.error('Failed to download report', { id: exportToast });
    }
  };

  const formatSimpleDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter lists based on search parameters
  const filteredSessions = sessions.filter(session => {
    const searchStr = `${session.title} ${session.tutorId?.name || ''} ${session.courseId?.title || ''}`.toLowerCase();
    return searchStr.includes(sessionsSearch.toLowerCase());
  });

  const filteredStudents = learners.filter(learner => {
    const searchStr = `${learner.name} ${learner.email}`.toLowerCase();
    return searchStr.includes(studentsSearch.toLowerCase());
  });

  // Calculate metrics for selected student detail view
  const calculateStudentMetrics = () => {
    if (studentHistory.length === 0) return { rate: 0, present: 0, absent: 0, late: 0, total: 0 };
    const total = studentHistory.length;
    const presentCount = studentHistory.filter(r => r.attendanceStatus === 'present').length;
    const late = studentHistory.filter(r => r.attendanceStatus === 'late').length;
    const absent = studentHistory.filter(r => r.attendanceStatus === 'absent').length;
    
    // Late students are still present in the class
    const present = presentCount + late;
    const rate = Math.round((present / total) * 100);
    return { rate, present, absent, late, total };
  };

  const metrics = calculateStudentMetrics();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Attendance Tracking</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Mark student participation and export class performance logs</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'sessions' 
                ? theme === 'emerald'
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            Live Sessions
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'students' 
                ? theme === 'emerald'
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            Student Profiles
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'reports' 
                  ? theme === 'emerald'
                    ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Attendance Reports
            </button>
          )}
        </div>
      </div>

      {activeTab === 'sessions' ? (
        <>
          {/* Top Selection bar for sessions */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 bg-white/2 border border-white/5 rounded-2xl">
            <div className="md:col-span-4 flex items-center gap-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest shrink-0">Select Batch:</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-${theme}-500/30 cursor-pointer font-bold`}
              >
                <option value="" className="bg-[#0f172a] text-white/60">Choose Batch...</option>
                {batches.map((batch) => (
                  <option key={batch._id || batch.id} value={batch._id || batch.id} className="bg-[#0f172a] text-white">
                    {batch.name} ({batch.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-7 relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input
                type="text"
                placeholder="Search sessions in this batch..."
                value={sessionsSearch}
                onChange={(e) => setSessionsSearch(e.target.value)}
                disabled={!selectedBatchId}
                className={`w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-${theme}-500/30`}
              />
            </div>

            <div className="md:col-span-1 flex justify-end">
              <button
                onClick={() => selectedBatchId && fetchBatchSessions(selectedBatchId)}
                disabled={!selectedBatchId}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-30"
                title="Refresh sessions"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Sessions List */}
          {loadingSessions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 bg-white/2 border border-white/5 rounded-[32px] animate-pulse" />
              ))}
            </div>
          ) : !selectedBatchId ? (
            <div className="py-20 text-center border border-white/5 border-dashed rounded-[32px]">
              <ClipboardList size={48} className="text-white/10 mb-3 mx-auto" />
              <h4 className="text-sm font-bold text-white mb-1">No batch selected</h4>
              <p className="text-xs text-white/30">Please select a cohort batch to load live session attendance history.</p>
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSessions.map((session) => {
                const summary = session.attendanceSummary || { present: 0, absent: 0, late: 0 };
                const totalMarked = summary.present + summary.absent + summary.late;
                
                return (
                  <div 
                    key={session._id || session.id}
                    className={`glass-card p-6 rounded-[32px] border border-white/5 bg-white/2 hover:border-${theme}-500/20 transition-all flex flex-col justify-between group`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <span className={`text-[8px] font-black uppercase tracking-wider text-${theme}-400 bg-${theme}-500/10 border border-${theme}-500/20 px-2 py-0.5 rounded`}>
                            {session.status}
                          </span>
                          <h3 className={`text-sm font-bold text-white group-hover:text-${theme}-400 transition-colors truncate max-w-[280px] pt-1`}>
                            {session.title}
                          </h3>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">
                          {formatSimpleDate(session.startTime)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-3.5 bg-white/3 rounded-2xl border border-white/5 text-center mb-6">
                        <div>
                          <p className={`text-base font-black text-${theme}-400`}>{summary.present}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Present</p>
                        </div>
                        <div>
                          <p className="text-base font-black text-amber-400">{summary.late}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Late</p>
                        </div>
                        <div>
                          <p className="text-base font-black text-red-400">{summary.absent}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Absent</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-white/40 font-medium">
                        <p className="flex items-center gap-2">
                          <Clock size={12} className={`text-${theme}-500`} />
                          <span>Time: {formatTime(session.startTime)} – {formatTime(session.endTime)}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <UserCheck size={12} className={`text-${theme}-500`} />
                          <span>Tutor: <span className="text-white/60 font-semibold">{session.tutorId?.name || 'N/A'}</span></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                      <button
                        onClick={() => openMarkModal(session)}
                        className={`flex items-center gap-1.5 px-4 py-2 bg-${theme}-600 hover:bg-${theme}-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-${theme}-600/10`}
                      >
                        <ClipboardList size={12} /> Mark Attendance
                      </button>

                      {totalMarked > 0 && (
                        <button
                          onClick={() => handleExportSessionCSV(session._id || session.id, session.title)}
                          className="flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                        >
                          <Download size={12} /> Export CSV
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="py-24 text-center border border-white/5 border-dashed rounded-[32px]">
                <Calendar size={48} className="text-white/10 mb-4 mx-auto animate-pulse" />
                <h4 className="text-base font-bold text-white mb-2">No live sessions found</h4>
                <p className="text-xs text-white/30 max-w-sm mx-auto leading-relaxed">
                  There are no scheduled, live, or completed sessions recorded for this batch yet. Live classes can be scheduled from the live sessions manager.
                </p>
              </div>
              <div className={`p-4 bg-${theme}-500/10 border border-${theme}-500/25 rounded-2xl flex items-start gap-3 text-${theme}-400`}>
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-wider">Attendance Tracking Guide</p>
                  <p className="text-[10px] text-white/60 font-medium leading-relaxed mt-1">
                    Note: Only live classes scheduled with a specific Batch Cohort selected will show up here. Course-wide sessions are not tracked for cohort attendance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'students' ? (
        <>
          {/* Student list directory search */}
          <div className="relative w-full max-w-md bg-white/2 border border-white/5 rounded-2xl p-2.5">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input
              type="text"
              placeholder="Search learners by name or email..."
              value={studentsSearch}
              onChange={(e) => setStudentsSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Students list */}
          {loadingLearners ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/2 border border-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <div 
                  key={student._id || student.id}
                  onClick={() => openStudentModal(student)}
                  className={`p-5 bg-white/2 border border-white/5 rounded-[32px] hover:border-${theme}-500/20 cursor-pointer flex items-center justify-between group transition-all`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full bg-${theme}-500/10 border border-${theme}-500/20 text-${theme}-400 font-bold flex items-center justify-center shrink-0`}>
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold text-white group-hover:text-${theme}-400 transition-colors truncate`}>{student.name}</p>
                      <p className="text-[9px] text-white/30 font-semibold truncate mt-0.5">{student.email}</p>
                    </div>
                  </div>

                  <ArrowRight size={14} className={`text-white/20 group-hover:translate-x-1 group-hover:text-${theme}-400 transition-all shrink-0`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border border-white/5 border-dashed rounded-[32px]">
              <Users size={48} className="text-white/10 mb-4 mx-auto" />
              <h4 className="text-base font-bold text-white mb-2">No students found</h4>
              <p className="text-xs text-white/30">There are no learners matching the search criteria registered in the system.</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Top Selection bar for reports */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 bg-white/2 border border-white/5 rounded-[32px]">
            {/* Batch selector */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-1">Batch Cohort</label>
              <select
                value={filterBatchId}
                onChange={(e) => setFilterBatchId(e.target.value)}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-${theme}-500/30 cursor-pointer font-bold`}
              >
                <option value="" className="bg-[#0f172a] text-white/60">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch._id || batch.id} value={batch._id || batch.id} className="bg-[#0f172a] text-white">
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Student selector */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-1">Student</label>
              <select
                value={filterStudentId}
                onChange={(e) => setFilterStudentId(e.target.value)}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-${theme}-500/30 cursor-pointer font-bold`}
              >
                <option value="" className="bg-[#0f172a] text-white/60">All Students</option>
                {learners.map((learner) => (
                  <option key={learner._id || learner.id} value={learner._id || learner.id} className="bg-[#0f172a] text-white">
                    {learner.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-1">Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-${theme}-500/30 cursor-pointer`}
              />
            </div>

            {/* Date To */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-1">Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-${theme}-500/30 cursor-pointer`}
              />
            </div>

            {/* Clear filters button */}
            <div className="md:col-span-2 flex justify-end gap-2 mt-4 md:mt-0">
              <button
                type="button"
                onClick={() => {
                  setFilterBatchId('');
                  setFilterStudentId('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                title="Clear Filters"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Export & Actions section */}
          {reportRecords.length > 0 && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleExportReportCSV}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                <Download size={12} /> Export CSV
              </button>
              <button
                onClick={handleExportReportPDF}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                <Download size={12} /> Export PDF
              </button>
            </div>
          )}

          {/* Table or empty state */}
          {reportLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-white/2 border border-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : reportRecords.length > 0 ? (
            <div className="glass-card border border-white/5 rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest">Date</th>
                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest">Batch</th>
                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest">Student</th>
                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest">Tutor</th>
                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest">Topic</th>
                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRecords.map((record) => {
                      const session = record.attendanceSessionId || {};
                      const isPresent = record.status === 'present';
                      const isLate = record.status === 'late';
                      
                      return (
                        <tr key={record._id || record.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                          <td className="p-4 text-xs font-mono text-white/60">
                            {session.attendanceDate ? new Date(session.attendanceDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-4 text-xs font-bold text-white">
                            {session.batchId?.name || 'N/A'}
                          </td>
                          <td className="p-4">
                            <p className="text-xs font-bold text-white">{record.studentId?.name || 'Unknown'}</p>
                            <p className="text-[9px] text-white/30 font-semibold">{record.studentId?.email}</p>
                          </td>
                          <td className="p-4 text-xs font-medium text-white/60">
                            {session.tutorId?.name || 'N/A'}
                          </td>
                          <td className="p-4 text-xs font-medium text-white/60 max-w-[200px] truncate" title={session.topicCovered}>
                            {session.topicCovered || '—'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              isPresent 
                                ? `bg-${theme}-50/15 text-${theme}-400 border border-${theme}-500/20` 
                                : isLate 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {reportTotal > reportLimit && (
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
                    Total: {reportTotal} records
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchReportRecords(reportPage - 1)}
                      disabled={reportPage <= 1}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider transition-all disabled:opacity-30 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-bold text-blue-400 flex items-center px-2">
                      Page {reportPage} of {Math.ceil(reportTotal / reportLimit)}
                    </span>
                    <button
                      onClick={() => fetchReportRecords(reportPage + 1)}
                      disabled={reportPage >= Math.ceil(reportTotal / reportLimit)}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider transition-all disabled:opacity-30 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center border border-white/5 border-dashed rounded-[32px]">
              <FileText size={48} className="text-white/10 mb-4 mx-auto" />
              <h4 className="text-base font-bold text-white mb-2">No records found</h4>
              <p className="text-xs text-white/30">There are no attendance records matching the current filters.</p>
            </div>
          )}
        </>
      )}

      {/* Mark Attendance Modal */}
      <AnimatePresence>
        {showMarkModal && selectedSession && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl text-white flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                <div>
                  <h3 className={`text-base font-black uppercase tracking-wider text-${theme}-400`}>
                    Attendance Board: {selectedSession.title}
                  </h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                    Mark students as Present, Absent, or Late. Batch: {selectedSession.batchId?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowMarkModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveAttendance} className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                {rosterLoading ? (
                  <div className="space-y-3 py-10">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-white/2 border border-white/5 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : rosterStudents.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 px-4 text-[9px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">
                      <div className="col-span-5">Learner</div>
                      <div className="col-span-4 text-center">Status</div>
                      <div className="col-span-3">Optional Note</div>
                    </div>

                    <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                      {rosterStudents.map((item) => {
                        const student = item.user || {};
                        const studentId = student._id || student.id;
                        const currentData = attendanceMap[studentId] || { status: 'present', note: '' };

                        return (
                          <div 
                            key={studentId}
                            className="grid grid-cols-12 items-center p-3.5 bg-white/2 border border-white/5 rounded-2xl hover:border-white/10 transition-all gap-4"
                          >
                            {/* Learner Info */}
                            <div className="col-span-5 min-w-0 flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full bg-${theme}-500/10 border border-${theme}-500/25 text-${theme}-400 font-bold flex items-center justify-center shrink-0 text-xs`}>
                                {student.name?.charAt(0) || 'L'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate leading-none mb-1">{student.name}</p>
                                <p className="text-[9px] text-white/30 font-semibold truncate leading-none">{student.email}</p>
                              </div>
                            </div>

                            {/* Status Buttons */}
                            <div className="col-span-4 flex justify-center gap-1.5">
                              {['present', 'late', 'absent'].map((statusOption) => {
                                const isSelected = currentData.status === statusOption;
                                let btnClasses = "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ";
                                
                                if (isSelected) {
                                  if (statusOption === 'present') btnClasses += `bg-${theme}-600 border-${theme}-500 text-white shadow-md shadow-${theme}-600/10`;
                                  if (statusOption === 'late') btnClasses += "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/10";
                                  if (statusOption === 'absent') btnClasses += "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/10";
                                } else {
                                  btnClasses += "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10";
                                }

                                return (
                                  <button
                                    key={statusOption}
                                    type="button"
                                    onClick={() => handleStatusChange(studentId, statusOption)}
                                    className={btnClasses}
                                  >
                                    {statusOption}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Optional Note */}
                            <div className="col-span-3">
                              <input
                                type="text"
                                placeholder="Add note..."
                                value={currentData.note}
                                onChange={(e) => handleNoteChange(studentId, e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center border border-amber-500/20 bg-amber-500/5 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
                      <Users size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">No Learners Enrolled</p>
                      <p className="text-xs text-white/50 max-w-sm mt-1 leading-relaxed">
                        There are no students enrolled in this batch. Please manage batch configurations or associate student rosters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMarkModal(false);
                        navigate(isAdmin ? '/ins-admin/batches' : '/tutor-dashboard/live-sessions/manage');
                      }}
                      className={`px-5 py-2.5 bg-${theme}-600 hover:bg-${theme}-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-${theme}-600/15`}
                    >
                      {isAdmin ? 'Manage Batch Roster' : 'Manage Live Sessions'}
                    </button>
                  </div>
                )}

                {/* Footer panel */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMarkModal(false)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAttendance || rosterStudents.length === 0}
                    className={`px-6 py-2.5 bg-${theme}-600 hover:bg-${theme}-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-${theme}-600/25`}
                  >
                    {submittingAttendance ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Profile Detail Modal */}
      <AnimatePresence>
        {showStudentModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl text-white flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-${theme}-500/10 border border-${theme}-500/20 text-${theme}-400 font-bold flex items-center justify-center`}>
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className={`text-base font-black uppercase tracking-wider text-${theme}-400`}>
                      Attendance Profile
                    </h3>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-none mt-1">
                      {selectedStudent.name} • {selectedStudent.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Roster & Stats */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {loadingStudentDetail ? (
                  <div className="space-y-3 py-10">
                    <div className="h-20 bg-white/2 border border-white/5 rounded-2xl animate-pulse" />
                    <div className="h-44 bg-white/2 border border-white/5 rounded-2xl animate-pulse" />
                  </div>
                ) : studentError ? (
                  <div className="py-12 text-center border border-red-500/25 bg-red-500/10 rounded-3xl p-6 space-y-4">
                    <div className="w-12 h-12 mx-auto bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center">
                      <AlertCircle size={24} />
                    </div>
                    <p className="text-sm font-bold text-white">Access Violation / Error</p>
                    <p className="text-xs text-red-400 font-medium leading-relaxed max-w-md mx-auto">
                      {studentError}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* KPI Metric Blocks */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-white/2 border border-white/5 rounded-2xl text-center">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Attendance Rate</p>
                        <p className={`text-2xl font-black text-${theme}-400`}>{metrics.rate}%</p>
                      </div>
                      <div className="p-4 bg-white/2 border border-white/5 rounded-2xl text-center">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Present Classes</p>
                        <p className={`text-2xl font-black text-${theme}-400`}>{metrics.present}</p>
                      </div>
                      <div className="p-4 bg-white/2 border border-white/5 rounded-2xl text-center">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Late Arrivals</p>
                        <p className="text-2xl font-black text-amber-400">{metrics.late}</p>
                      </div>
                      <div className="p-4 bg-white/2 border border-white/5 rounded-2xl text-center">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Missed (Absent)</p>
                        <p className="text-2xl font-black text-red-400">{metrics.absent}</p>
                      </div>
                    </div>

                    {/* Detailed History logs list */}
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/30">Session Attendance Log ({metrics.total} total)</h4>
                      
                      {studentHistory.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                          {studentHistory.map((record) => {
                            const isPresent = record.attendanceStatus === 'present';
                            const isLate = record.attendanceStatus === 'late';
                            
                            return (
                              <div 
                                key={record._id || record.id}
                                className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white leading-none mb-1.5">
                                    {record.sessionId?.title || 'Unknown Class'}
                                  </p>
                                  <p className="text-[9px] text-white/35 font-semibold flex items-center gap-1.5 leading-none">
                                    <Calendar size={10} className={`text-${theme}-500/60`} />
                                    {formatSimpleDate(record.sessionId?.startTime)} • Batch: {record.batchId?.name}
                                  </p>
                                  {record.note && (
                                    <p className="text-[9px] text-amber-400/80 font-medium leading-none mt-2 truncate">
                                      Note: {record.note}
                                    </p>
                                  )}
                                </div>

                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                  isPresent 
                                    ? `bg-${theme}-50/15 text-${theme}-400 border border-${theme}-500/20` 
                                    : isLate 
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                    : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                }`}>
                                  {record.attendanceStatus}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01] p-6">
                          <FileText size={32} className="text-white/10 mb-3 mx-auto" />
                          <p className="text-xs font-bold text-white/40">No live session attendance logs have been recorded for this student yet.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
                {studentHistory.length > 0 ? (
                  <button
                    onClick={() => handleExportStudentCSV(selectedStudent._id || selectedStudent.id, selectedStudent.name)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 bg-${theme}-600 hover:bg-${theme}-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-${theme}-600/25`}
                  >
                    <Download size={12} /> Export Roster Log
                  </button>
                ) : <div />}
                
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
