export type NotificationType = 'system' | 'mention' | 'request' | 'file' | 'edit' | 'join';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationAttachment {
  name: string;
  size?: string;
  type: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  userName: string;
  userAvatar?: string;
  userInitials?: string;
  action: string;
  target?: string;
  metadata?: string;
  timestamp: string;
  isRead: boolean;
  content?: string;
  actions?: NotificationAction[];
  attachment?: NotificationAttachment;
}
