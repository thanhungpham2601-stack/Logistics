import React, { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { stripDiacritics } from '../utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  const filtered = useMemo(() => {
    const q = stripDiacritics(query.trim());
    if (!q) return options;
    return options.filter((o) => stripDiacritics(o.label).includes(q));
  }, [options, query]);

  const closeSoon = () => {
    blurTimeout.current = setTimeout(() => setIsOpen(false), 150);
  };

  const cancelClose = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 focus-within:border-slate-400 px-3 py-1.5 rounded-lg">
        <input
          type="text"
          value={isOpen ? query : selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            cancelClose();
            setQuery('');
            setIsOpen(true);
          }}
          onBlur={closeSoon}
          placeholder={placeholder}
          className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none w-full placeholder-slate-400"
        />
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-30 top-full left-0 mt-1 w-full min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">Không tìm thấy</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  cancelClose();
                  onChange(o.value);
                  setQuery('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-slate-50 ${
                  o.value === value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
