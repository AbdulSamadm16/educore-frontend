export const getDashboardPath = (user) => {
  const role = user?.role;
  const accountType = user?.accountType;
  if (role === 'institution_admin' || role === 'admin' || accountType === 'institution_admin') {
    return '/ins-admin';
  }

  if (
    role === 'platform_admin' ||
    role === 'super_admin' ||
    role === 'platform_owner' ||
    accountType === 'platform_admin'
  ) {
    return '/platform-admin';
  }

  if (role === 'learner') {
    return '/learner-dashboard';
  }

  if (role === 'tutor') {
    return '/tutor-dashboard';
  }


  return '/login';
};

export const expandAllowedRoles = (allowedRoles = []) => {
  const expanded = new Set(allowedRoles);

  if (allowedRoles.includes('admin')) {
    expanded.add('institution_admin');
  }

  if (allowedRoles.includes('institution_admin')) {
    expanded.add('admin');
  }

  if (allowedRoles.includes('super_admin')) {
    expanded.add('platform_admin');
    expanded.add('platform_owner');
  }

  if (allowedRoles.includes('platform_admin')) {
    expanded.add('super_admin');
    expanded.add('platform_owner');
  }

  if (allowedRoles.includes('platform_owner')) {
    expanded.add('platform_admin');
    expanded.add('super_admin');
  }

  return [...expanded];
};

export const getLoginPath = () => {
  return '/login';
};
