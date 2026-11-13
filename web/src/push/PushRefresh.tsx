import { useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { currentPushSupport } from '../lib/platform';
import { refreshPushToken } from './enablePush';

/** Renders nothing; re-registers the FCM token on start when permission is already granted. */
export function PushRefresh() {
  const uid = useAuth().user?.uid;
  useEffect(() => {
    if (!uid || currentPushSupport() !== 'supported') return;
    refreshPushToken(uid).catch((e) => console.error('refreshPushToken failed', e));
  }, [uid]);
  return null;
}
