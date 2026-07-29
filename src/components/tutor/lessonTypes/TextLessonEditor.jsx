import React from 'react';

export default function TextLessonEditor({ content, onContentChange }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Lesson Content (Markdown/Text)</label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-white/10 h-[300px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-mono text-sm"
          placeholder="# Introduction to the Lesson..."
        />
      </div>
    </div>
  );
}
