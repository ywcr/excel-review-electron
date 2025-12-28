import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { ValidationError, ImageValidationError, ValidationResult } from '../../shared/types';

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
  previewErrors?: ValidationError[];
  previewImageErrors?: ImageValidationError[];
  hasDetail?: boolean;
}

interface StoreSchema {
  history: HistoryRecord[];
  maxRecords: number;
}

const store = new Store<StoreSchema>({
  defaults: {
    history: [],
    maxRecords: 20, // 列表保留 20 条
  },
});

// 详细报告存储目录
const HISTORY_DETAIL_DIR = path.join(app.getPath('userData'), 'history_details');
// 确保目录存在
if (!fs.existsSync(HISTORY_DETAIL_DIR)) {
  fs.mkdirSync(HISTORY_DETAIL_DIR, { recursive: true });
}

/**
 * 历史记录管理器
 */
export const historyStore = {
  /**
   * 添加一条验证记录
   */
  addRecord(
    record: Omit<HistoryRecord, 'id' | 'timestamp' | 'hasDetail'>, 
    detailResult?: ValidationResult
  ): HistoryRecord {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newRecord: HistoryRecord = {
      ...record,
      id,
      timestamp: Date.now(),
      hasDetail: !!detailResult,
    };

    const history = store.get('history');
    const maxRecords = store.get('maxRecords');

    // 添加新记录到头部
    history.unshift(newRecord);

    // 超过列表最大数量时删除最旧的
    while (history.length > maxRecords) {
      const removed = history.pop();
      // 如果被移除的记录有详情文件，也一并删除
      if (removed?.hasDetail) {
        this.deleteDetailFile(removed.id);
      }
    }

    // 保存详细报告到文件
    if (detailResult) {
      this.saveDetailFile(id, detailResult);
      // 维护详细报告数量限制（仅保留最近 5 条有详情的记录）
      this.cleanupOldDetails(history, 5);
    }

    store.set('history', history);
    console.log(`📋 [历史记录] 已添加: ${record.fileName} (共 ${history.length} 条)`);

    return newRecord;
  },

  /**
   * 保存详细报告文件
   */
  saveDetailFile(id: string, result: ValidationResult) {
    try {
      const filePath = path.join(HISTORY_DETAIL_DIR, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(result));
    } catch (error) {
      console.error('❌ [历史记录] 保存详细报告失败:', error);
    }
  },

  /**
   * 删除详细报告文件
   */
  deleteDetailFile(id: string) {
    try {
      const filePath = path.join(HISTORY_DETAIL_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ [历史记录] 已清理详细文件: ${id}.json`);
      }
    } catch (error) {
      console.error('❌ [历史记录] 删除详细报告失败:', error);
    }
  },

  /**
   * 清理旧的详细报告，仅保留最近 N 条
   */
  cleanupOldDetails(history: HistoryRecord[], limit: number) {
    let count = 0;
    // 遍历历史记录，保留前 limit 个有详情的记录，其他的删除详情文件并更新标记
    const updatedHistory = history.map(record => {
      if (record.hasDetail) {
        count++;
        if (count > limit) {
          this.deleteDetailFile(record.id);
          return { ...record, hasDetail: false };
        }
      }
      return record;
    });
    
    // 如果有变化，需要更新 store (注意：这里是在 addRecord 内部调用的，addRecord 最后会 set history，所以这里返回 updatedHistory 供调用者使用或者直接修改引用)
    // 由于 map 返回新数组，我们需要让调用者知道。
    // 为了简单，我们直接操作传入的引用不可行。我们直接在这里更新 store 可能会覆盖 addRecord 后续的操作。
    // 最佳实践：addRecord 方法负责最终的 store.set。cleanupOldDetails 应该修改列表并同步删除文件。
    
    // 修正逻辑：原地修改传入的 history 数组中的对象（虽然 dirty 但有效），或者返回修改后的数组。
    // 让我们返回修改后的数组
    return updatedHistory;
  },

  /**
   * 获取详细报告
   */
  getDetail(id: string): ValidationResult | null {
    try {
      const filePath = path.join(HISTORY_DETAIL_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as ValidationResult;
      }
    } catch (error) {
      console.error('❌ [历史记录] 读取详细报告失败:', error);
    }
    return null;
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

    const [removed] = history.splice(index, 1);
    if (removed.hasDetail) {
      this.deleteDetailFile(removed.id);
    }
    
    store.set('history', history);
    console.log(`📋 [历史记录] 已删除 ID: ${id}`);
    return true;
  },

  /**
   * 清空所有记录
   */
  clearAll(): void {
    // 删除所有文件
    const history = store.get('history');
    history.forEach(record => {
      if (record.hasDetail) {
        this.deleteDetailFile(record.id);
      }
    });

    store.set('history', []);
    console.log('📋 [历史记录] 已清空');
  },
};
