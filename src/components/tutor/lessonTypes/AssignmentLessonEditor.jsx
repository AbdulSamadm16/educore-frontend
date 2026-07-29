import React from 'react';

export default function AssignmentLessonEditor({ assignmentMeta = {}, onMetaChange }) {
  const meta = {
    instructions: '',
    submissionType: 'file',
    maxMarks: 100,
    allowMultipleSubmissions: false,
    dueDate: null,
    allowLateSubmissions: true,
    ...assignmentMeta
  };

  const updateMeta = (field, value) => {
    onMetaChange({
      ...meta,
      [field]: value
    });
  };

  // Helper to extract the local date component (YYYY-MM-DD)
  const getLocalDatePart = (d) => {
    if (!d) return '';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return '';
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const date = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}`;
    } catch (e) {
      return '';
    }
  };

  // Helper to extract the local time component (HH:MM)
  const getLocalTimePart = (d) => {
    if (!d) return '';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return '';
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  // Combine separate date and time values into a unified UTC string
  const handleDateTimeChange = (newDateStr, newTimeStr) => {
    if (!newDateStr) {
      updateMeta('dueDate', null);
      return;
    }
    const timeStr = newTimeStr || '23:59';
    try {
      const combined = new Date(`${newDateStr}T${timeStr}:00`);
      updateMeta('dueDate', isNaN(combined.getTime()) ? null : combined.toISOString());
    } catch (e) {
      updateMeta('dueDate', null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">
          Assignment Instructions
        </label>
        <textarea
          value={meta.instructions}
          onChange={(e) => updateMeta('instructions', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 h-32 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all text-sm"
          placeholder="Provide clear technical guidelines, files to refer to, and submission format expectations..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">
            Submission Formats
          </label>
          <select
            value={meta.submissionType}
            onChange={(e) => updateMeta('submissionType', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all cursor-pointer"
          >
            <option value="file" className="bg-[#0b0f1a]">File Upload Only</option>
            <option value="text" className="bg-[#0b0f1a]">Online Text Editor Only</option>
            <option value="both" className="bg-[#0b0f1a]">Both File and Text Allowed</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">
            Maximum Marks
          </label>
          <input
            type="number"
            min="1"
            value={meta.maxMarks}
            onChange={(e) => updateMeta('maxMarks', parseInt(e.target.value, 10) || 100)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium"
            placeholder="e.g. 100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={getLocalDatePart(meta.dueDate)}
              onChange={(e) => handleDateTimeChange(e.target.value, getLocalTimePart(meta.dueDate))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium cursor-pointer"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">
              Due Time (Optional)
            </label>
            <input
              type="time"
              value={getLocalTimePart(meta.dueDate)}
              onChange={(e) => handleDateTimeChange(getLocalDatePart(meta.dueDate), e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-4 pt-3">
          <div className="flex items-center gap-4 p-4 bg-white/2 rounded-2xl border border-white/5">
            <input
              type="checkbox"
              id="allowMultipleSubmissions"
              checked={meta.allowMultipleSubmissions}
              onChange={(e) => updateMeta('allowMultipleSubmissions', e.target.checked)}
              className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="allowMultipleSubmissions" className="text-sm font-bold text-white/60 cursor-pointer select-none">
              Allow Multiple Submissions
            </label>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/2 rounded-2xl border border-white/5">
            <input
              type="checkbox"
              id="allowLateSubmissions"
              checked={meta.allowLateSubmissions}
              onChange={(e) => updateMeta('allowLateSubmissions', e.target.checked)}
              className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="allowLateSubmissions" className="text-sm font-bold text-white/60 cursor-pointer select-none">
              Allow Late Submissions
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
