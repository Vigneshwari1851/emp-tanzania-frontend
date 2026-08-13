import { UserRole } from "@/shared/types/rbac";

export const LmsNotificationType = {
  ENROLLMENT: 'ENROLLMENT',
  REMINDER: 'REMINDER',
  ESCALATION: 'ESCALATION',
  COMPLETION: 'COMPLETION',
  SYSTEM: 'SYSTEM'
} as const;

export type LmsNotificationType = typeof LmsNotificationType[keyof typeof LmsNotificationType];

export const LmsNotificationPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const;

export type LmsNotificationPriority = typeof LmsNotificationPriority[keyof typeof LmsNotificationPriority];

export interface LmsNotification {
  id: string;
  type: LmsNotificationType;
  priority: LmsNotificationPriority;
  title: string;
  message: string;
  courseName?: string;
  dueDate?: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: {
    score?: number;
    certificateUrl?: string;
    escalationLevel?: number;
  };
}

export interface NotificationTemplate {
  id: string;
  type: LmsNotificationType;
  subject: string;
  body: string;
  lastUpdated: string;
}

export interface EscalationRule {
  daysOverdue: number;
  recipientRole: UserRole;
  urgency: 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Mock Data
export const mockLmsNotifications: LmsNotification[] = [
  {
    id: 'notif-1',
    type: LmsNotificationType.ENROLLMENT,
    priority: LmsNotificationPriority.MEDIUM,
    title: 'New Course Assigned',
    message: 'You have been enrolled in "Advanced Cybersecurity 2026".',
    courseName: 'Advanced Cybersecurity 2026',
    dueDate: '2026-06-15',
    createdAt: new Date().toISOString(),
    isRead: false,
    actionUrl: '/learning/courses/101'
  },
  {
    id: 'notif-2',
    type: LmsNotificationType.REMINDER,
    priority: LmsNotificationPriority.HIGH,
    title: 'Training Due Soon',
    message: 'Your compliance training "Data Privacy & Ethics" is due in 3 days.',
    courseName: 'Data Privacy & Ethics',
    dueDate: '2026-05-17',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isRead: false,
    actionUrl: '/learning/courses/202'
  },
  {
    id: 'notif-3',
    type: LmsNotificationType.COMPLETION,
    priority: LmsNotificationPriority.LOW,
    title: 'Course Completed',
    message: 'Congratulations! You successfully completed "Project Management Essentials".',
    courseName: 'Project Management Essentials',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    isRead: true,
    metadata: {
      score: 94,
      certificateUrl: '/certificates/cert-123.pdf'
    }
  },
  {
    id: 'notif-4',
    type: LmsNotificationType.ESCALATION,
    priority: LmsNotificationPriority.CRITICAL,
    title: 'Urgent: Overdue Training Escalated',
    message: 'Training for Sarah Wilson is 7 days overdue and has been escalated to your dashboard.',
    courseName: 'Security Awareness',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    isRead: false,
    metadata: {
      escalationLevel: 1
    }
  }
];

export const mockTemplates: NotificationTemplate[] = [
  {
    id: 'tpl-1',
    type: LmsNotificationType.ENROLLMENT,
    subject: 'Course Enrollment: {{course_name}}',
    body: `Hello {{user_name}},\n\nYou have been enrolled in: {{course_name}}.\nDue Date: {{due_date}}\n\nPlease complete this training by the deadline.\n\nL&D Team`,
    lastUpdated: '2026-01-10'
  },
  {
    id: 'tpl-2',
    type: LmsNotificationType.REMINDER,
    subject: 'Reminder: {{course_name}} is due on {{due_date}}',
    body: `Hello {{user_name}},\n\nThis is a reminder that your training "{{course_name}}" is due on {{due_date}}.\n\nL&D Team`,
    lastUpdated: '2026-01-15'
  }
];

export const useLmsNotifications = () => {
  return {
    notifications: mockLmsNotifications,
    isLoading: false,
    markAsRead: (id: string) => console.log('Marking read:', id)
  };
};

export const useNotificationSettings = () => {
  return {
    templates: mockTemplates,
    escalationRules: [
      { daysOverdue: 1, recipientRole: UserRole.EMPLOYEE, urgency: 'MEDIUM' },
      { daysOverdue: 7, recipientRole: UserRole.MANAGER, urgency: 'HIGH' },
      { daysOverdue: 14, recipientRole: UserRole.ADMIN, urgency: 'CRITICAL' }
    ] as EscalationRule[]
  };
};
