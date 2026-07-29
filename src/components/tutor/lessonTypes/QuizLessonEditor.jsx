import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, BookOpen, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function QuizLessonEditor({ quizMeta = {}, onMetaChange }) {
  const meta = {
    totalQuestions: 0,
    passingScore: 70,
    timeLimitInMinutes: 0,
    questions: [],
    ...quizMeta
  };

  const updateMeta = (field, value) => {
    onMetaChange({
      ...meta,
      [field]: value
    });
  };

  const questions = meta.questions || [];

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [tempQuestion, setTempQuestion] = useState({
    questionText: '',
    isMultipleAnswer: false,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false }
    ],
    explanation: '',
    points: 1
  });

  const questionTextRef = useRef(null);
  const explanationRef = useRef(null);

  useEffect(() => {
    if (isModalOpen) {
      if (questionTextRef.current) {
        questionTextRef.current.style.height = 'auto';
        questionTextRef.current.style.height = `${questionTextRef.current.scrollHeight}px`;
      }
      if (explanationRef.current) {
        explanationRef.current.style.height = 'auto';
        explanationRef.current.style.height = `${explanationRef.current.scrollHeight}px`;
      }
    }
  }, [isModalOpen, tempQuestion.questionText, tempQuestion.explanation]);

  const openAddModal = () => {
    if (questions.length >= 50) return;
    setEditingIndex(-1);
    setTempQuestion({
      questionText: '',
      isMultipleAnswer: false,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ],
      explanation: '',
      points: 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (qIdx) => {
    setEditingIndex(qIdx);
    const q = questions[qIdx];
    setTempQuestion({
      questionText: q.questionText || '',
      isMultipleAnswer: q.isMultipleAnswer || false,
      options: q.options ? q.options.map(o => ({ ...o })) : [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ],
      explanation: q.explanation || '',
      points: q.points || 1
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const saveModalQuestion = () => {
    if (!tempQuestion.questionText.trim()) {
      alert("Please enter the question text.");
      return;
    }
    if (tempQuestion.options.some(o => !o.text.trim())) {
      alert("Please fill in all options.");
      return;
    }
    if (!tempQuestion.options.some(o => o.isCorrect)) {
      alert("Please mark at least one option as correct.");
      return;
    }

    const updated = [...questions];
    if (editingIndex === -1) {
      updated.push(tempQuestion);
    } else {
      updated[editingIndex] = tempQuestion;
    }

    onMetaChange({
      ...meta,
      questions: updated,
      totalQuestions: updated.length
    });
    setIsModalOpen(false);
  };

  const handleNextQuestionAction = () => {
    if (!tempQuestion.questionText.trim()) {
      alert("Please enter the question text.");
      return;
    }
    if (tempQuestion.options.some(o => !o.text.trim())) {
      alert("Please fill in all options.");
      return;
    }
    if (!tempQuestion.options.some(o => o.isCorrect)) {
      alert("Please mark at least one option as correct.");
      return;
    }

    const updated = [...questions];
    if (editingIndex === -1) {
      updated.push(tempQuestion);
    } else {
      updated[editingIndex] = tempQuestion;
    }

    onMetaChange({
      ...meta,
      questions: updated,
      totalQuestions: updated.length
    });

    if (editingIndex >= 0 && editingIndex + 1 < updated.length) {
      const nextIdx = editingIndex + 1;
      const nextQ = updated[nextIdx];
      setEditingIndex(nextIdx);
      setTempQuestion({
        questionText: nextQ.questionText || '',
        isMultipleAnswer: nextQ.isMultipleAnswer || false,
        options: nextQ.options ? nextQ.options.map(o => ({ ...o })) : [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ],
        explanation: nextQ.explanation || '',
        points: nextQ.points || 1
      });
    } else {
      if (updated.length >= 50) {
        alert("You have reached the maximum limit of 50 questions.");
        setIsModalOpen(false);
        return;
      }
      setEditingIndex(-1);
      setTempQuestion({
        questionText: '',
        isMultipleAnswer: false,
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ],
        explanation: '',
        points: 1
      });
    }
  };

  const addModalOption = () => {
    if (tempQuestion.options.length >= 6) return;
    setTempQuestion({
      ...tempQuestion,
      options: [...tempQuestion.options, { text: '', isCorrect: false }]
    });
  };

  const deleteModalOption = (oIdx) => {
    if (tempQuestion.options.length <= 2) return;
    const wasCorrect = tempQuestion.options[oIdx].isCorrect;
    let updatedOptions = tempQuestion.options.filter((_, idx) => idx !== oIdx);
    if (wasCorrect && updatedOptions.length > 0) {
      updatedOptions[0].isCorrect = true;
    }
    setTempQuestion({
      ...tempQuestion,
      options: updatedOptions
    });
  };

  const handleCorrectOptionSelect = (oIdx) => {
    if (tempQuestion.isMultipleAnswer) {
      const updatedOptions = [...tempQuestion.options];
      updatedOptions[oIdx].isCorrect = !updatedOptions[oIdx].isCorrect;
      setTempQuestion({
        ...tempQuestion,
        options: updatedOptions
      });
    } else {
      const updatedOptions = tempQuestion.options.map((o, idx) => ({
        ...o,
        isCorrect: idx === oIdx
      }));
      setTempQuestion({
        ...tempQuestion,
        options: updatedOptions
      });
    }
  };

  const handleOptionTextChange = (oIdx, text) => {
    const updatedOptions = [...tempQuestion.options];
    updatedOptions[oIdx] = { ...updatedOptions[oIdx], text };
    setTempQuestion({
      ...tempQuestion,
      options: updatedOptions
    });
  };

  const deleteQuestion = (qIdx) => {
    const updated = questions.filter((_, idx) => idx !== qIdx);
    onMetaChange({
      ...meta,
      questions: updated,
      totalQuestions: updated.length
    });
  };

  const moveQuestion = (qIdx, direction) => {
    if (direction === 'up' && qIdx === 0) return;
    if (direction === 'down' && qIdx === questions.length - 1) return;

    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    const updated = [...questions];
    const temp = updated[qIdx];
    updated[qIdx] = updated[targetIdx];
    updated[targetIdx] = temp;
    updateMeta('questions', updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Quiz Level Configurations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-white/2 border border-gray-200 dark:border-white/5 rounded-3xl">
        <div>
          <label className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest block mb-3">
            Time Limit (Minutes - 0 for Unlimited)
          </label>
          <input
            type="number"
            min="0"
            max="180"
            value={meta.timeLimitInMinutes}
            onChange={(e) => updateMeta('timeLimitInMinutes', parseInt(e.target.value, 10) || 0)}
            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium"
            placeholder="e.g. 30"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest block mb-3">
            Passing Threshold (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={meta.passingScore}
            onChange={(e) => updateMeta('passingScore', parseInt(e.target.value, 10) || 70)}
            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium"
            placeholder="e.g. 70"
          />
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Quiz Questions (MCQ Only)</h4>
            <p className="text-[10px] text-gray-400 dark:text-white/20 font-bold uppercase tracking-widest mt-1">
              {questions.length} / 50 questions configured
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-violet-600/10"
          >
            <Plus size={14} /> Add Question
          </button>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="p-5 bg-gray-50 dark:bg-white/2 hover:bg-gray-100 dark:hover:bg-white/3 border border-gray-200 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="p-2.5 bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400 text-xs font-bold font-mono shrink-0">
                  #{qIdx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md" title={q.questionText || 'Untitled Question'}>
                    {q.questionText || <span className="text-gray-400 dark:text-white/20 italic">Untitled Question</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 dark:text-white/30 font-black uppercase tracking-wider">
                    <span>{q.options?.length || 0} Options</span>
                    <span>•</span>
                    <span className="text-violet-600 dark:text-violet-400">{q.points || 1} Points</span>
                    <span>•</span>
                    <span className={q.isMultipleAnswer ? "text-emerald-500" : "text-blue-500"}>
                      {q.isMultipleAnswer ? 'Multiple Answers' : 'Single Answer'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(qIdx)}
                  className="px-3.5 py-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-slate-700 dark:text-white hover:text-violet-600 hover:dark:text-violet-400 border border-gray-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(qIdx, 'up')}
                  disabled={qIdx === 0}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-slate-900 hover:dark:text-white rounded-xl disabled:opacity-20 transition-all cursor-pointer"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(qIdx, 'down')}
                  disabled={qIdx === questions.length - 1}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-slate-900 hover:dark:text-white rounded-xl disabled:opacity-20 transition-all cursor-pointer"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteQuestion(qIdx)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <div className="py-16 text-center bg-gray-50 dark:bg-white/2 rounded-[32px] border border-gray-200 dark:border-white/5 border-dashed">
              <BookOpen size={36} className="text-gray-300 dark:text-white/10 mx-auto mb-4" />
              <p className="text-[10px] font-bold text-gray-400 dark:text-white/20 uppercase tracking-widest italic mb-4">
                No questions configured in this quiz yet
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Add First Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Question Config Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#0b0f19] border border-gray-200 dark:border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl text-slate-900 dark:text-white flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.01]">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    {editingIndex === -1 ? 'Add Question' : `Edit Question #${editingIndex + 1}`}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-white/40 font-bold uppercase tracking-widest mt-1">
                    Configure Multiple Choice Question Parameters
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 dark:text-white/40 hover:text-slate-900 hover:dark:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                {/* Question Text */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest block mb-2">Question Text</label>
                  <textarea
                    ref={questionTextRef}
                    rows={1}
                    value={tempQuestion.questionText}
                    onChange={(e) => setTempQuestion({ ...tempQuestion, questionText: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 transition-all text-sm font-semibold resize-none overflow-hidden"
                    placeholder="e.g. Which design paradigm prioritizes glassmorphic depth?"
                  />
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">Options</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempQuestion.isMultipleAnswer}
                          onChange={(e) => {
                            const isMultiple = e.target.checked;
                            // Reset correctness if switching back to single
                            let updatedOptions = [...tempQuestion.options];
                            if (!isMultiple && updatedOptions.filter(o => o.isCorrect).length > 1) {
                              const firstCorrect = updatedOptions.findIndex(o => o.isCorrect);
                              updatedOptions = updatedOptions.map((o, idx) => ({
                                ...o,
                                isCorrect: idx === firstCorrect
                              }));
                            }
                            setTempQuestion({ ...tempQuestion, isMultipleAnswer: isMultiple, options: updatedOptions });
                          }}
                          className="w-3.5 h-3.5 rounded bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-violet-600 focus:ring-violet-500/30"
                        />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">
                          Multiple Answers
                        </span>
                      </label>
                    </div>
                    {tempQuestion.options.length < 6 && (
                      <button
                        type="button"
                        onClick={addModalOption}
                        className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-widest hover:text-violet-500 hover:dark:text-violet-300 transition-all cursor-pointer"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {tempQuestion.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-3">
                        <input
                          type={tempQuestion.isMultipleAnswer ? "checkbox" : "radio"}
                          name={tempQuestion.isMultipleAnswer ? `modal-correct-option-${oIdx}` : "modal-correct-option"}
                          checked={opt.isCorrect}
                          onChange={() => handleCorrectOptionSelect(oIdx)}
                          className={`text-violet-600 bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 focus:ring-0 cursor-pointer w-4 h-4 ${tempQuestion.isMultipleAnswer ? 'rounded' : ''}`}
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(oIdx, e.target.value)}
                          className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500/20"
                          placeholder={`Option ${oIdx + 1} text...`}
                        />
                        {tempQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => deleteModalOption(oIdx)}
                            className="p-2.5 text-gray-400 dark:text-white/25 hover:text-red-600 hover:dark:text-red-400 hover:bg-gray-100 hover:dark:bg-white/5 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score & Explanation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-white/5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest block mb-2">Points / Score</label>
                    <input
                      type="number"
                      min="1"
                      value={tempQuestion.points}
                      onChange={(e) => setTempQuestion({ ...tempQuestion, points: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all text-xs font-semibold"
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest block mb-2">Explanation (Optional)</label>
                    <textarea
                      ref={explanationRef}
                      rows={1}
                      value={tempQuestion.explanation || ''}
                      onChange={(e) => setTempQuestion({ ...tempQuestion, explanation: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all text-xs resize-none overflow-hidden"
                      placeholder="Provide explanatory context..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 border-t border-gray-200 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.02] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextQuestionAction}
                  className="px-5 py-2.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-600/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  {editingIndex >= 0 && editingIndex + 1 < questions.length ? 'Next Question' : 'Save & Add Next'}
                </button>
                <button
                  type="button"
                  onClick={saveModalQuestion}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-violet-600/25"
                >
                  {editingIndex === -1 ? 'Add to Quiz' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
