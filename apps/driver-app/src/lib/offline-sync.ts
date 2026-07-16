import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface SyncAction {
  id: string;
  table: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: number;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

const STORAGE_KEY = 'offline_sync_queue';
const MAX_RETRY_COUNT = 5;
const BATCH_SIZE = 10;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class OfflineSyncEngine {
  static createAction(table: string, action: 'CREATE' | 'UPDATE' | 'DELETE', payload: any): SyncAction {
    return {
      id: generateId(),
      table,
      action,
      payload,
      status: SyncStatus.PENDING,
      retryCount: 0,
      createdAt: Date.now()
    };
  }

  static async getQueue(): Promise<SyncAction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async addToQueue(action: SyncAction): Promise<void> {
    const queue = await OfflineSyncEngine.getQueue();
    queue.push(action);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }

  static async addActionsToQueue(actions: SyncAction[]): Promise<void> {
    const queue = await OfflineSyncEngine.getQueue();
    queue.push(...actions);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }

  static async clearCompleted(): Promise<void> {
    const queue = await OfflineSyncEngine.getQueue();
    const pending = queue.filter(a => a.status !== SyncStatus.COMPLETED);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  }

  static async syncAll(): Promise<SyncResult> {
    const result: SyncResult = { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    let queue = await OfflineSyncEngine.getQueue();
    const pending = queue.filter(a => a.status !== SyncStatus.COMPLETED);
    if (pending.length === 0) return result;

    const batch = pending.slice(0, BATCH_SIZE);

    for (const action of batch) {
      try {
        action.status = SyncStatus.SYNCING;
        const method = action.action === 'DELETE' ? 'DELETE' : action.action === 'CREATE' ? 'POST' : 'PATCH';
      let requestData = action.action !== 'DELETE' ? action.payload : undefined;
      // Detect simple file upload payload (contains uri, name, type)
      if (requestData && typeof requestData === 'object' && 'uri' in requestData && 'name' in requestData && 'type' in requestData) {
        const formData = new FormData();
        formData.append('file', {
          uri: requestData.uri,
          name: requestData.name,
          type: requestData.type,
        } as any);
        requestData = formData;
      }
      const response = await api({
        method,
        url: `/${action.table}`,
        data: requestData,
        headers: { 'X-Sync-Id': action.id },
      });
        action.status = SyncStatus.COMPLETED;
        result.syncedCount++;
      } catch (error: any) {
        action.status = SyncStatus.FAILED;
        action.retryCount++;
        action.lastError = error?.message || 'Unknown error';
        result.failedCount++;
        result.errors.push(action.lastError || 'Unknown error');
      }
    }

    queue = await OfflineSyncEngine.getQueue();
    const updated = queue.map(a => {
      const synced = batch.find(b => b.id === a.id);
      return synced || a;
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await OfflineSyncEngine.clearCompleted();

    result.success = result.failedCount === 0;
    return result;
  }

  static async savePendingLocal(table: string, payload: any): Promise<void> {
    const key = `pending_local_${table}_${payload.id || generateId()}`;
    await AsyncStorage.setItem(key, JSON.stringify({ ...payload, _cachedAt: Date.now() }));
  }

  static async getLocalData(table: string): Promise<any[]> {
    const keys = await AsyncStorage.getAllKeys();
    const dataKeys = keys.filter(k => k.startsWith(`pending_local_${table}_`));
    const items = await Promise.all(dataKeys.map(k => AsyncStorage.getItem(k).then(val => [k, val] as [string, string | null])));
    return items.map(([_, val]) => val ? JSON.parse(val) : null).filter(Boolean);
  }

  static async cacheResponse(table: string, data: any): Promise<void> {
    const key = `cache_${table}`;
    await AsyncStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  }

  static async getCachedResponse(table: string, maxAgeMs: number = 5 * 60 * 1000): Promise<any | null> {
    try {
      const raw = await AsyncStorage.getItem(`cache_${table}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }
}
