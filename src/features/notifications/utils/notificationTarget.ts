interface NotificationLike {
  related_module?: string;
  type?: string;
}

interface TargetUserLike {
  role?: any;
  details?: { role?: { role_name?: string } | null } | null;
}

export const getNotificationTargetUrl = (notif: NotificationLike, user?: TargetUserLike | null): string => {
  const mod = (notif.related_module || notif.type || '').toLowerCase();
  const isEmployee = user?.role === 'employee' || user?.details?.role?.role_name?.toLowerCase() === 'employee';

  if (mod.includes('loan') || mod.includes('advance')) {
    return isEmployee ? '/employee/loans-advances' : '/loans-advances?tab=pending';
  }
  if (mod.includes('leave')) {
    return '/leave-management';
  }
  if (mod.includes('tax')) {
    return isEmployee ? '/employee/payroll' : '/payroll';
  }
  if (mod.includes('reimbursement') || mod.includes('expense')) {
    return '/reimbursements';
  }
  if (mod.includes('asset')) {
    return '/assets';
  }
  if (mod.includes('profile-change') || mod.includes('profile_change')) {
    return '/employee-management/change-requests';
  }
  if (mod.includes('survey')) {
    return isEmployee ? '/surveys' : '/surveys/admin';
  }
  if (mod.includes('document')) {
    return '/documents';
  }
  if (mod.includes('news')) {
    return '/news';
  }
  if (mod.includes('exit')) {
    return '/employee-exit';
  }
  if (mod.includes('feedback')) {
    return '/surveys/admin?tab=feedback';
  }
  return `/${notif.related_module || 'dashboard'}`;
};

export const handleNotificationNavigation = (
  navigate: (to: string) => void,
  notif: any,
  user: any
) => {
  const targetUrl = getNotificationTargetUrl(notif, user);
  const currentMode = localStorage.getItem('sidebar_view_mode') || 'role';
  
  let targetMode: 'self' | 'role' = 'role';
  
  const mod = (notif.related_module || notif.type || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  const msg = (notif.message || notif.description || '').toLowerCase();
  
  if (
    targetUrl.startsWith('/employee/') || 
    targetUrl.startsWith('/my-') || 
    targetUrl === '/surveys'
  ) {
    targetMode = 'self';
  } else if (
    targetUrl === '/leave-management' || 
    targetUrl === '/reimbursements' || 
    targetUrl.startsWith('/loans-advances')
  ) {
    if (
      title.includes('your') || 
      title.includes('you ') ||
      msg.includes('your') || 
      msg.includes('you ')
    ) {
      targetMode = 'self';
    } else {
      targetMode = 'role';
    }
  } else {
    targetMode = currentMode as 'self' | 'role';
  }

  let rawRole = Array.isArray(user?.role) ? (user?.role[0] || '') : (user?.role || '');
  if (typeof rawRole === 'object' && rawRole !== null) {
    rawRole = rawRole.name || rawRole.code || rawRole.id || '';
  }
  const normalizedRole = rawRole.toString().toUpperCase().replace(/[\s_]+/g, '');
  const isStrictEmployee = normalizedRole === 'EMPLOYEE' || normalizedRole === 'USER';
  
  if (isStrictEmployee) {
    targetMode = 'self';
  }

  if (currentMode !== targetMode) {
    localStorage.setItem('sidebar_view_mode', targetMode);
    navigate(targetUrl);
    setTimeout(() => {
      window.location.reload();
    }, 50);
  } else {
    navigate(targetUrl);
  }
};
