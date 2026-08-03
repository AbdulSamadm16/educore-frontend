import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ThemeToggle – pill-style toggle button with animated thumb.
 * Place inside any header area.
 */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle-btn ${isDark ? 'is-dark' : ''}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Moon size={14} strokeWidth={2.5} />
      ) : (
        <Sun size={14} strokeWidth={2.5} />
      )}
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>
      <span className="hidden sm:inline" style={{ fontSize: '12px' }}>
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
