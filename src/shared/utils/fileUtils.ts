import { BASE_URL } from '@/shared/services/config';

/**
 * Constructs the full URL for a profile picture or any uploaded file.
 * Handles both relative paths saved in the DB and legacy full URLs.
 */
export const getProfilePictureUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  const cleanBaseUrl = BASE_URL.replace(/\/rafiki\/?$/, "");
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBaseUrl}${cleanPath}`;
};

/**
 * Constructs the full URL for any uploaded asset (course thumbnails, etc.)
 */
export const getAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  const cleanBaseUrl = BASE_URL.replace(/\/rafiki\/?$/, "");
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBaseUrl}${cleanPath}`;
};
