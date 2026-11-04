// סיכום התקנות האפליקציה מכל האתרים (content-type: app-install בבאקאנד המשותף)
import { strapiGet } from './strapiClient';

export interface AppInstallSummary {
    total: number;
    last30: number;
    byPlatform: { android: number; ios: number; desktop: number };
    bySite: Record<string, { total: number; android: number; ios: number; desktop: number; last30: number }>;
}

export async function getAppInstallSummary(): Promise<AppInstallSummary> {
    return strapiGet<AppInstallSummary>('/api/app-installs/summary');
}
