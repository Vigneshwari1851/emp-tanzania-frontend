import axiosInstance from '@/shared/services/axiosInstance';

export const sendWish = async (recipientId: number, type: 'birthday' | 'anniversary') => {
  const response = await axiosInstance.post('/notifications/send-wish', {
    recipient_id: recipientId,
    type,
  });
  return response.data;
};
