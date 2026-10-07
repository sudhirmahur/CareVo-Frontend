import { useCallback, useMemo } from 'react';
import { getErrorMessage } from '../api/errors';
import { notificationApi } from '../api/notification.api';
import { normalizeNotification } from '../utils/normalizers';
import { unwrapList } from '../utils/helpers';
import useApi from './useApi';
import useToast from './useToast';

/** Shared by the bell dropdown and the Notifications page. */
export default function useNotifications() {
  const toast = useToast();
  const request = useCallback(() => notificationApi.list(), []);
  const { data, loading, error, notAvailable, reload, setData } = useApi(request);

  const notifications = useMemo(() => unwrapList(data).map(normalizeNotification), [data]);
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const markRead = useCallback(
    async (id) => {
      try {
        await notificationApi.markRead(id);
        setData(unwrapList(data).map((item) => (normalizeNotification(item).id === id ? { ...item, is_read: true, read: true } : item)));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [data, setData, toast],
  );

  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setData(unwrapList(data).map((item) => ({ ...item, is_read: true, read: true })));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [data, setData, toast]);

  return { notifications, unreadCount, loading, error, notAvailable, reload, markRead, markAllRead };
}
