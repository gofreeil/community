// דיווח התקנת האפליקציה (PWA) לבאקאנד - מכשיר אחד נספר פעם אחת.
// appinstalled: אנדרואיד/דסקטופ. ב-iOS אין אירוע כזה, לכן נספרת גם הפעלה ראשונה במצב standalone.
const DEVICE_KEY = 'app_install_device_id';
const SENT_KEY = 'app_install_reported';

export function reportAppInstall(source: 'appinstalled' | 'standalone_launch', platform: 'android' | 'ios' | 'desktop'): void {
    try {
        if (source === 'standalone_launch' && localStorage.getItem(SENT_KEY)) return;
        let deviceId = localStorage.getItem(DEVICE_KEY);
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem(DEVICE_KEY, deviceId);
        }
        localStorage.setItem(SENT_KEY, '1');
        void fetch('/api/app-install', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ deviceId, platform, source }),
            keepalive: true
        }).catch(() => {});
    } catch { /* ignore */ }
}
