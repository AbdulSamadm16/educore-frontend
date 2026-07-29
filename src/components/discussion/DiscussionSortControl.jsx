import { ArrowDownWideNarrow, Clock3 } from 'lucide-react';

const options = [
  { value: 'popular', label: 'Popular', icon: ArrowDownWideNarrow },
  { value: 'recent', label: 'Recent', icon: Clock3 }
];

const DiscussionSortControl = ({ value, onChange }) => {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-white/10 dark:bg-white/5">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex min-w-24 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
              active
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20'
                : 'text-gray-500 hover:text-gray-900 dark:text-white/45 dark:hover:text-white'
            }`}
          >
            <Icon size={14} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default DiscussionSortControl;
