/**
 * 公式实验室组件
 * 提供表格编辑和公式执行功能
 */
import { useState, useCallback, useEffect } from 'react';
import { ExcelFunction } from '../../../shared/function-library';
import { executeFormula as executeFormulaFn, getSupportedFunctions } from './formula-executor';

interface FormulaLabProps {
  initialFunction?: ExcelFunction | null;
  initialFormula?: string;
  onBack: () => void;
}

interface CellData {
  value: string;
}

// 默认示例数据
const DEFAULT_DATA: CellData[][] = [
  [{ value: '姓名' }, { value: '部门' }, { value: '电话' }],
  [{ value: '张三' }, { value: '销售部' }, { value: '13800001111' }],
  [{ value: '李四' }, { value: '技术部' }, { value: '13800002222' }],
  [{ value: '王五' }, { value: '财务部' }, { value: '13800003333' }],
  [{ value: '' }, { value: '' }, { value: '' }],
];

// 列标题 (A, B, C, ...)
const getColumnLabel = (index: number): string => {
  return String.fromCharCode(65 + index);
};

export function FormulaLab({ initialFunction, initialFormula, onBack }: FormulaLabProps) {
  // 表格数据
  const [data, setData] = useState<CellData[][]>(DEFAULT_DATA);
  
  // 公式输入 - 优先使用 initialFormula，其次使用 initialFunction 的示例
  const [formula, setFormula] = useState(
    initialFormula || initialFunction?.examples[0]?.formula || '=VLOOKUP("李四", A1:C4, 3, FALSE)'
  );
  
  // 执行结果
  const [result, setResult] = useState<{
    success: boolean;
    value?: string;
    error?: string;
    steps?: string[];
  } | null>(null);

  // 更新单元格
  const updateCell = useCallback((row: number, col: number, value: string) => {
    setData(prev => {
      const newData = [...prev];
      newData[row] = [...newData[row]];
      newData[row][col] = { value };
      return newData;
    });
  }, []);

  // 添加行
  const addRow = () => {
    setData(prev => [
      ...prev,
      Array(prev[0]?.length || 3).fill(null).map(() => ({ value: '' }))
    ]);
  };

  // 添加列
  const addColumn = () => {
    setData(prev => prev.map(row => [...row, { value: '' }]));
  };

  // 重置数据
  const resetData = () => {
    setData(DEFAULT_DATA);
    setResult(null);
  };

  // 执行公式
  const handleExecuteFormula = () => {
    const result = executeFormulaFn(formula, data);
    setResult(result);
  };

  // 复制公式
  const copyFormula = () => {
    navigator.clipboard.writeText(formula);
  };

  return (
    <div className="fl-lab-view">
      <button className="fl-back-btn" onClick={onBack}>
        ← 返回
      </button>

      <div className="fl-lab-header">
        <h2>🧪 公式实验室</h2>
        <p>输入测试数据和公式，实时验证计算结果</p>
      </div>

      {/* 数据表格 */}
      <div className="fl-lab-section">
        <div className="fl-lab-section-header">
          <h3 className="fl-lab-section-title">测试数据 (可编辑)</h3>
          <div className="fl-lab-section-actions">
            <button className="fl-lab-section-btn" onClick={addRow}>+ 添加行</button>
            <button className="fl-lab-section-btn" onClick={addColumn}>+ 添加列</button>
            <button className="fl-lab-section-btn" onClick={resetData}>🔄 重置</button>
          </div>
        </div>
        <div className="fl-spreadsheet">
          <table className="fl-spreadsheet-table">
            <thead>
              <tr>
                <th className="row-header"></th>
                {data[0]?.map((_, colIdx) => (
                  <th key={colIdx}>{getColumnLabel(colIdx)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <th className="row-header">{rowIdx + 1}</th>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx}>
                      <input
                        type="text"
                        className="fl-spreadsheet-cell"
                        value={cell.value}
                        onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 公式输入 */}
      <div className="fl-lab-section">
        <div className="fl-lab-section-header">
          <h3 className="fl-lab-section-title">公式输入</h3>
        </div>
        <div className="fl-formula-input-wrapper">
          <input
            type="text"
            className="fl-formula-input"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder='输入公式，如 =VLOOKUP("张三", A1:C4, 3, FALSE)'
          />
          <div className="fl-formula-actions">
            <button className="fl-execute-btn" onClick={handleExecuteFormula}>
              ▶ 执行
            </button>
          </div>
        </div>
      </div>

      {/* 执行结果 */}
      {result && (
        <div className="fl-lab-section">
          <div className="fl-lab-section-header">
            <h3 className="fl-lab-section-title">执行结果</h3>
          </div>
          <div className="fl-result-content">
            <div className={`fl-result-value ${result.success ? '' : 'error'}`}>
              {result.success ? '✅' : '❌'} {result.success ? `结果: ${result.value}` : result.error}
            </div>
            
            {result.steps && result.steps.length > 0 && (
              <div className="fl-result-steps">
                <h4>执行过程：</h4>
                <ol>
                  {result.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="fl-result-actions">
              <button className="fl-copy-btn" onClick={copyFormula}>
                📋 复制公式
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
