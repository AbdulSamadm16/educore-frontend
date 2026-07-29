import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GripVertical, Edit3, Plus, Trash2, ChevronRight, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

export default function ModuleEditor({ 
  module, 
  index, 
  courseId,
  onDelete, 
  onRename, 
  onAddLesson, 
  onDeleteLesson, 
  onRenameLesson 
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Reorder.Item
      value={module}
      className="glass-card rounded-[32px] border border-white/5"
    >
      {/* Module Title Header */}
      <div className="p-6 flex items-center justify-between bg-white/5 rounded-t-[32px]">
        <div className="flex items-center gap-4">
          <GripVertical className="text-white/20 cursor-grab shrink-0" size={20} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest leading-none mb-1">Module {index + 1}</span>
            <h4 className="text-lg font-bold text-white leading-none">{module.title}</h4>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onRename}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            data-tooltip="Rename Module"
          >
            <Edit3 size={18} />
          </button>
          <button
            type="button"
            onClick={onAddLesson}
            className="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
            data-tooltip="Add Lesson"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
            data-tooltip="Delete Module"
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            data-tooltip={isOpen ? "Collapse Module" : "Expand Module"}
          >
            <ChevronRight size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lesson List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-3">
              {module.lessons?.map((lesson) => {
                const lessonId = lesson.lessonId || lesson._id || lesson.id;
                return (
                  <div
                    key={lessonId}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-violet-500/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-violet-400/40 uppercase tracking-widest">{lesson.type}</span>
                      <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">{lesson.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {courseId && (
                        <Link
                          to={`/tutor-dashboard/discussions/${courseId}/${lessonId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-400 transition-all hover:bg-violet-500/20"
                          data-tooltip="Open lesson Q&A"
                        >
                          <MessageSquare size={14} />
                          Q&A
                        </Link>
                      )}
                      <button 
                        type="button"
                        onClick={() => onRenameLesson(lessonId)} 
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all" 
                        data-tooltip="Edit Lesson"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => onDeleteLesson(lessonId)} 
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all" 
                        data-tooltip="Delete Lesson"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {module.lessons?.length === 0 && (
                <div className="py-8 text-center bg-white/2 rounded-2xl border border-white/5 border-dashed">
                  <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest italic font-sans">No lessons in this module</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
