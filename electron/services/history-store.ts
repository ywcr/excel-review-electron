import Store from 'electron-store';

export interface HistoryRecord {
  id: string;
  fileName: string;
  filePath: string;
  taskName: string;
  timestamp: number;
  summary: {
    totalRows: number;
    errorCount: number;
    imageErrorCount: number;
  };
  isValid: boolean;
}

interface StoreSchema {
  history: HistoryRecord[];
  maxRecords: number;
}

const store = new Store<StoreSchema>({
  defaults: {
    history: [],
    maxRecords: 20, // 最多保存 20 条历史记录
  },
});

/**
 * 历史记录管理器
 */
export const historyStore = {
  /**
   * 添加一条验证记录
   */
  addRecord(record: Omit<HistoryRecord, 'id' | 'timestamp'>): HistoryRecord {
    const newRecord: HistoryRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };

    const history = store.get('history');
    const maxRecords = store.get('maxRecords');

    // 添加新记录到头部
    history.unshift(newRecord);

    // 超过最大数量时删除最旧的
    while (history.length > maxRecords) {
      history.pop();
    }

    store.set('history', history);
    console.log(`📋 [历史记录] 已添加: ${record.fileName} (共 ${history.length} 条)`);

    return newRecord;
  },

  /**
   * 获取所有历史记录
   */
  getAll(): HistoryRecord[] {
    return store.get('history');
  },

  /**
   * 根据 ID 获取单条记录
   */
  getById(id: string): HistoryRecord | undefined {
    return store.get('history').find((r) => r.id === id);
  },

  /**
   * 删除单条记录
   */
  deleteById(id: string): boolean {
    const history = store.get('history');
    const index = history.findIndex((r) => r.id === id);
    if (index === -1) return false;

    history.splice(index, 1);
    store.set('history', history);
    console.log(`📋 [历史记录] 已删除 ID: ${id}`);
    return true;
  },

  /**
   * 清空所有记录
   */
  clearAll(): void {
    store.set('history', []);
    console.log('📋 [历史记录] 已清空');
  },

  /**
   * 设置最大记录数
   */
  setMaxRecords(max: number): void {
    store.set('maxRecords', Math.max(1, max));
    // 裁剪超出的记录
    const history = store.get('history');
    if (history.length > max) {
      store.set('history', history.slice(0, max));
    }
  },
};
