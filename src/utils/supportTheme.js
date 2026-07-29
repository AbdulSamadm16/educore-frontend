export const getTheme = (role) => {
  // Institution Admin / Admin roles
  if (['admin', 'super_admin', 'institution_admin'].includes(role)) {
    return {
      text: 'text-emerald-400',
      bgLight: 'bg-emerald-500/10',
      bgSolid: 'bg-emerald-600',
      bgHover: 'hover:bg-emerald-500',
      borderFocus: 'focus:border-emerald-500/50',
      borderHover: 'hover:border-emerald-500/30',
      ringFocus: 'focus:ring-emerald-500/30',
      shadow: 'shadow-emerald-600/20',
      spinner: 'border-emerald-500',
    };
  }
  
  // Platform Admin roles
  if (['platform_owner', 'platform_admin', 'platform_support'].includes(role)) {
    return {
      text: 'text-amber-400',
      bgLight: 'bg-amber-500/10',
      bgSolid: 'bg-amber-600',
      bgHover: 'hover:bg-amber-500',
      borderFocus: 'focus:border-amber-500/50',
      borderHover: 'hover:border-amber-500/30',
      ringFocus: 'focus:ring-amber-500/30',
      shadow: 'shadow-amber-600/20',
      spinner: 'border-amber-500',
    };
  }

  // Learner role
  if (role === 'learner') {
    return {
      text: 'text-blue-400',
      bgLight: 'bg-blue-500/10',
      bgSolid: 'bg-blue-600',
      bgHover: 'hover:bg-blue-500',
      borderFocus: 'focus:border-blue-500/50',
      borderHover: 'hover:border-blue-500/30',
      ringFocus: 'focus:ring-blue-500/30',
      shadow: 'shadow-blue-600/20',
      spinner: 'border-blue-500',
    };
  }

  // Default / Tutor role
  return {
    text: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    bgSolid: 'bg-purple-600',
    bgHover: 'hover:bg-purple-500',
    borderFocus: 'focus:border-purple-500/50',
    borderHover: 'hover:border-purple-500/30',
    ringFocus: 'focus:ring-purple-500/30',
    shadow: 'shadow-purple-600/20',
    spinner: 'border-purple-500',
  };
};
