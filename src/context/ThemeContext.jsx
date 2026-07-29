import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Default is light theme (false = light, true = dark)
    const saved = localStorage.getItem('educore-theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('educore-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark-mode', 'dark');
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-mode', 'dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
