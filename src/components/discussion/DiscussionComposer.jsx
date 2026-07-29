import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Send, X } from 'lucide-react';

const MAX_CHARS = 1000;

const DiscussionComposer = ({
  initialValue = '',
  submitLabel = 'Post',
  placeholder = 'Write a question or comment...',
  compact = false,
  loading = false,
  onSubmit,
  onCancel
}) => {
  const [content, setContent] = useState(initialValue);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const imagePreview = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const remaining = MAX_CHARS - content.length;
  const canSubmit = content.trim().length > 0 && remaining >= 0 && !loading;

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    await onSubmit({
      contentMarkdown: content,
      imageFile
    });

    if (!initialValue) {
      setContent('');
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] ${
        compact ? 'space-y-3' : 'space-y-4'
      }`}
    >
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, MAX_CHARS + 1))}
        placeholder={placeholder}
        rows={compact ? 3 : 4}
        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition focus:border-violet-400 focus:bg-white dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-white/25 dark:focus:border-violet-500"
      />

      {imagePreview && (
        <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
          <img src={imagePreview} alt="Selected attachment" className="max-h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              setImageFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md border border-gray-200/80 transition hover:bg-white dark:bg-black/70 dark:text-white dark:border-white/10 dark:hover:bg-black"
            aria-label="Remove selected image"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-violet-300 hover:text-violet-600 dark:border-white/10 dark:text-white/45 dark:hover:border-violet-500/50 dark:hover:text-violet-300"
            aria-label="Attach image"
          >
            <ImagePlus size={18} />
          </button>
          <span className={`text-xs font-bold ${remaining < 0 ? 'text-red-500' : 'text-gray-400 dark:text-white/35'}`}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

export default DiscussionComposer;
