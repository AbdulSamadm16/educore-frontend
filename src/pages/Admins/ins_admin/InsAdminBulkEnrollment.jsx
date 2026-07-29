import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Send,
  Upload,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const parseCsv = (text) => {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length === 0) return [];

  const table = lines.map(parseCsvLine);
  
  // Try mapping headers
  const firstRow = table[0].map(normalizeHeader);
  let nameIdx = -1;
  let emailIdx = -1;

  firstRow.forEach((col, idx) => {
    if (col.includes('name') || col.includes('username') || col.includes('fullname') || col.includes('userid')) {
      nameIdx = idx;
    } else if (col.includes('email') || col.includes('mail') || col.includes('emailaddress') || col.includes('id')) {
      emailIdx = idx;
    }
  });

  const hasHeaders = nameIdx >= 0 || emailIdx >= 0;
  
  if (nameIdx === -1) nameIdx = 0;
  if (emailIdx === -1) emailIdx = firstRow.length > 1 ? 1 : 0;

  const dataRows = hasHeaders ? table.slice(1) : table;

  return dataRows.map((cells, index) => {
    const name = cells[nameIdx]?.trim() || '';
    const email = cells[emailIdx]?.trim().toLowerCase() || '';
    return {
      rowNumber: (hasHeaders ? 1 : 0) + index + 1,
      studentName: name,
      studentEmail: email
    };
  }).filter((row) => row.studentEmail || row.studentName);
};

const validateRows = (rows, selectedCourseId) => {
  const seen = new Set();

  return rows.map((row) => {
    const errors = [];
    const duplicateKey = row.studentEmail;

    if (!row.studentName) {
      errors.push('Student name is required');
    }

    if (!row.studentEmail) {
      errors.push('Student email is required');
    } else if (!emailPattern.test(row.studentEmail)) {
      errors.push('Invalid email format');
    }

    if (!selectedCourseId) {
      errors.push('Select a course first');
    }

    if (row.studentEmail) {
      if (seen.has(duplicateKey)) {
        errors.push('Duplicate row');
      }
      seen.add(duplicateKey);
    }

    return {
      ...row,
      courseId: selectedCourseId,
      valid: errors.length === 0,
      errors
    };
  });
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const downloadCsv = (filename, rows) => {
  const header = ['Row', 'Student Name', 'Student Email', 'Course ID', 'Status', 'Errors'];
  const csvRows = rows.map((row) => [
    row.rowNumber,
    row.studentName,
    row.studentEmail,
    row.courseId,
    row.valid ? 'Valid' : 'Failed',
    (row.errors || []).join('; ')
  ]);
  const csv = [header, ...csvRows].map((cells) => cells.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadTemplate = () => {
  const csvContent = "data:text/csv;charset=utf-8,Full Name,Email Address\nJohn Doe,john.doe@example.com\nJane Smith,jane.smith@example.com\n";
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "bulk_enrollment_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function InsAdminBulkEnrollment() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmationSummary, setConfirmationSummary] = useState(null);

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const response = await apiClient.get('/courses/admin/all', {
        params: { status: 'published' }
      });
      setCourses(response.data?.data?.courses || []);
    } catch (error) {
      console.error('Failed to load courses for bulk enrollment:', error);
      toast.error('Failed to load courses.');
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCourses();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCourses]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course._id || course.id) === String(selectedCourseId)),
    [courses, selectedCourseId]
  );

  const previewRows = useMemo(() => validateRows(rows, selectedCourseId), [rows, selectedCourseId]);
  const validRows = previewRows.filter((row) => row.valid);
  const failedRows = previewRows.filter((row) => !row.valid);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setConfirmationSummary(null);

    const reader = new FileReader();
    reader.onload = () => {
      const parsedRows = parseCsv(String(reader.result || ''));
      setRows(parsedRows);
      if (parsedRows.length === 0) {
        toast.error('No enrollment rows found in the CSV.');
      } else {
        toast.success(`${parsedRows.length} rows ready for preview.`);
      }
    };
    reader.onerror = () => toast.error('Unable to read the CSV file.');
    reader.readAsText(file);
  };

  const handleConfirm = async () => {
    if (!selectedCourseId) {
      toast.error('Select a course before confirming enrollment.');
      return;
    }

    if (validRows.length === 0) {
      toast.error('There are no valid rows to enroll.');
      return;
    }

    setConfirming(true);
    try {
      const emails = validRows.map((row) => row.studentEmail);
      const response = await apiClient.post(`/enrollments/admin/bulk/${selectedCourseId}`, {
        emails
      });
      const data = response.data?.data || {};
      const successful = data.successful || data.success || [];
      const failed = data.failed || [];
      const failedResultRows = failed.map((item) => {
        const failedEmail = item.email || item.studentEmail;
        const matchingRow = validRows.find((row) => String(row.studentEmail) === String(failedEmail));
        return {
          ...(matchingRow || {}),
          rowNumber: matchingRow?.rowNumber || '',
          studentEmail: failedEmail || matchingRow?.studentEmail || '',
          courseId: selectedCourseId,
          valid: false,
          errors: [item.reason || item.message || 'Enrollment failed']
        };
      });

      setConfirmationSummary({
        successCount: data.successCount ?? successful.length,
        failedCount: data.failedCount ?? failed.length,
        failedRows: failedResultRows
      });
      toast.success('Bulk enrollment submitted.');
    } catch (error) {
      console.error('Bulk enrollment failed:', error);
      toast.error(error.response?.data?.message || 'Bulk enrollment failed.');
    } finally {
      setConfirming(false);
    }
  };

  const clearPreview = () => {
    setRows([]);
    setFileName('');
    setConfirmationSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-[1400px] mx-auto space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">Bulk Enrollment</h2>
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Select a course, then upload a CSV containing student Name and Email.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Download size={16} className="text-emerald-400" />
            Download Template
          </button>
          {failedRows.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(`bulk-enrollment-failed-${new Date().toISOString().slice(0, 10)}.csv`, failedRows)}
              className="flex items-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <Download size={16} />
              Failed Report
            </button>
          )}
          <button
            type="button"
            onClick={clearPreview}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <XCircle size={16} />
            Clear
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || validRows.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#02130a] rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
          >
            {confirming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Confirm Enrollment
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-2 min-h-52 rounded-[32px] border border-white/5 bg-white/[0.03] p-8 flex flex-col justify-between">
          <BookOpen size={32} className="text-emerald-400" />
          <div>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-3">Course</p>
            <div className="relative">
              <select
                value={selectedCourseId}
                onChange={(event) => {
                  setSelectedCourseId(event.target.value);
                  setConfirmationSummary(null);
                }}
                disabled={coursesLoading}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pr-11 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              >
                <option value="" className="bg-[#0b0f19]">
                  {coursesLoading ? 'Loading courses...' : 'Select course'}
                </option>
                {courses.map((course) => (
                  <option key={course._id || course.id} value={course._id || course.id} className="bg-[#0b0f19]">
                    {course.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
            {selectedCourse && (
              <p className="text-xs text-white/35 mt-3">
                Selected: <span className="text-emerald-400 font-bold">{selectedCourse.title}</span>
              </p>
            )}
          </div>
        </div>

        <label className="xl:col-span-2 min-h-52 border border-dashed border-emerald-500/30 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] rounded-[32px] flex flex-col items-center justify-center text-center cursor-pointer transition-all px-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload size={38} className="text-emerald-400 mb-4" />
          <p className="text-white font-black tracking-tight">{fileName || 'Upload CSV'}</p>
          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-2">Columns: Full Name, Email Address</p>
        </label>

        <SummaryTile icon={FileText} label="Rows" value={previewRows.length} color="text-white" />
        <SummaryTile icon={CheckCircle2} label="Will Enroll" value={validRows.length} color="text-emerald-400" />
        <SummaryTile icon={AlertTriangle} label="Failed Rows" value={failedRows.length} color="text-red-400" />
      </section>

      {confirmationSummary && (
        <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest mb-1">Confirmation Summary</p>
            <p className="text-sm text-white/70">
              {confirmationSummary.successCount} successful, {confirmationSummary.failedCount} failed
            </p>
          </div>
          {confirmationSummary.failedRows?.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(`bulk-enrollment-confirmation-failed-${new Date().toISOString().slice(0, 10)}.csv`, confirmationSummary.failedRows)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Download size={14} />
              Download Failed
            </button>
          )}
        </div>
      )}

      <section className="rounded-[32px] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
             <thead className="bg-white/[0.03] border-b border-white/5">
              <tr className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                <th className="px-6 py-4">Row</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Student Email</th>
                <th className="px-6 py-4">Selected Course</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Validation</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-white/25 font-bold">
                    No preview rows
                  </td>
                </tr>
              ) : (
                previewRows.map((row, index) => (
                  <motion.tr
                    key={`${row.rowNumber}-${row.studentEmail}-${row.courseId}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.015 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-white/50 font-mono">{row.rowNumber}</td>
                    <td className="px-6 py-4 text-sm text-white font-semibold">{row.studentName || <span className="text-red-400 italic font-normal">Missing</span>}</td>
                    <td className="px-6 py-4 text-sm text-white/75">{row.studentEmail || <span className="text-red-400 italic font-normal">Missing</span>}</td>
                    <td className="px-6 py-4 text-xs text-white/60">{selectedCourse?.title || 'No course selected'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                        row.valid
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {row.valid ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {row.valid ? 'Valid' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-white/40">
                      {row.errors.length > 0 ? row.errors.join(', ') : 'Ready'}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-6 min-h-52 flex flex-col justify-between">
      <Icon size={26} className={color} />
      <div>
        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-4xl font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}
