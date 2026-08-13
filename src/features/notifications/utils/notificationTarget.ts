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
