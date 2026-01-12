/**
 * 公式执行器
 * 支持常用 Excel 公式的模拟执行
 */

interface CellData {
  value: string;
}

interface ExecutionResult {
  success: boolean;
  value?: string;
  error?: string;
  steps: string[];
}

// 解析单元格引用 (如 A1, B2)
function parseCell(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z])(\d+)$/i);
  if (!match) return null;
  return {
    col: match[1].toUpperCase().charCodeAt(0) - 65,
    row: parseInt(match[2]) - 1,
  };
}

// 获取单元格值
function getCellValue(data: CellData[][], ref: string): string {
  const cell = parseCell(ref);
  if (!cell) return '';
  return data[cell.row]?.[cell.col]?.value || '';
}

// 获取区域数值
function getRangeValues(
  data: CellData[][],
  startRef: string,
  endRef: string
): number[] {
  const start = parseCell(startRef);
  const end = parseCell(endRef);
  if (!start || !end) return [];

  const values: number[] = [];
  for (let r = start.row; r <= end.row; r++) {
    for (let c = start.col; c <= end.col; c++) {
      const val = parseFloat(data[r]?.[c]?.value || '');
      if (!isNaN(val)) values.push(val);
    }
  }
  return values;
}

// ========== 统计函数 ==========

function execSUM(data: CellData[][], args: string): ExecutionResult {
  const rangeMatch = args.match(/([A-Z]\d+):([A-Z]\d+)/i);
  if (!rangeMatch) return { success: false, error: '无效的区域', steps: [] };

  const values = getRangeValues(data, rangeMatch[1], rangeMatch[2]);
  const sum = values.reduce((a, b) => a + b, 0);

  return {
    success: true,
    value: sum.toString(),
    steps: [
      `提取区域 ${rangeMatch[1]}:${rangeMatch[2]} 的数值`,
      `数值列表: ${values.join(', ') || '(无数值)'}`,
      `计算总和: ${sum}`,
    ],
  };
}

function execAVERAGE(data: CellData[][], args: string): ExecutionResult {
  const rangeMatch = args.match(/([A-Z]\d+):([A-Z]\d+)/i);
  if (!rangeMatch) return { success: false, error: '无效的区域', steps: [] };

  const values = getRangeValues(data, rangeMatch[1], rangeMatch[2]);
  if (values.length === 0) return { success: false, error: '#DIV/0!', steps: ['没有有效数值'] };
  
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return {
    success: true,
    value: avg.toFixed(2),
    steps: [
      `提取区域 ${rangeMatch[1]}:${rangeMatch[2]} 的数值`,
      `数值列表: ${values.join(', ')}`,
      `计算平均值: ${values.join(' + ')} / ${values.length} = ${avg.toFixed(2)}`,
    ],
  };
}

function execCOUNT(data: CellData[][], args: string): ExecutionResult {
  const rangeMatch = args.match(/([A-Z]\d+):([A-Z]\d+)/i);
  if (!rangeMatch) return { success: false, error: '无效的区域', steps: [] };

  const values = getRangeValues(data, rangeMatch[1], rangeMatch[2]);

  return {
    success: true,
    value: values.length.toString(),
    steps: [
      `统计区域 ${rangeMatch[1]}:${rangeMatch[2]} 的数值`,
      `找到 ${values.length} 个数值`,
    ],
  };
}

function execMAX(data: CellData[][], args: string): ExecutionResult {
  const rangeMatch = args.match(/([A-Z]\d+):([A-Z]\d+)/i);
  if (!rangeMatch) return { success: false, error: '无效的区域', steps: [] };

  const values = getRangeValues(data, rangeMatch[1], rangeMatch[2]);
  if (values.length === 0) return { success: false, error: '没有有效数值', steps: [] };

  const max = Math.max(...values);

  return {
    success: true,
    value: max.toString(),
    steps: [
      `提取区域 ${rangeMatch[1]}:${rangeMatch[2]} 的数值`,
      `数值列表: ${values.join(', ')}`,
      `最大值: ${max}`,
    ],
  };
}

function execMIN(data: CellData[][], args: string): ExecutionResult {
  const rangeMatch = args.match(/([A-Z]\d+):([A-Z]\d+)/i);
  if (!rangeMatch) return { success: false, error: '无效的区域', steps: [] };

  const values = getRangeValues(data, rangeMatch[1], rangeMatch[2]);
  if (values.length === 0) return { success: false, error: '没有有效数值', steps: [] };

  const min = Math.min(...values);

  return {
    success: true,
    value: min.toString(),
    steps: [
      `提取区域 ${rangeMatch[1]}:${rangeMatch[2]} 的数值`,
      `数值列表: ${values.join(', ')}`,
      `最小值: ${min}`,
    ],
  };
}

function execCOUNTIF(data: CellData[][], args: string): ExecutionResult {
  // COUNTIF(A1:A10, "条件")
  const match = args.match(/([A-Z]\d+):([A-Z]\d+)\s*,\s*"([^"]+)"/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const start = parseCell(match[1]);
  const end = parseCell(match[2]);
  const condition = match[3];
  if (!start || !end) return { success: false, error: '无效的区域', steps: [] };

  let count = 0;
  const steps: string[] = [`在区域 ${match[1]}:${match[2]} 中查找 "${condition}"`];

  for (let r = start.row; r <= end.row; r++) {
    for (let c = start.col; c <= end.col; c++) {
      const cellValue = data[r]?.[c]?.value || '';
      if (cellValue === condition) count++;
    }
  }

  steps.push(`找到 ${count} 个匹配项`);
  return { success: true, value: count.toString(), steps };
}

function execSUMIF(data: CellData[][], args: string): ExecutionResult {
  // SUMIF(A1:A10, "条件", B1:B10)
  const match = args.match(/([A-Z]\d+):([A-Z]\d+)\s*,\s*"([^"]+)"\s*,\s*([A-Z]\d+):([A-Z]\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const condStart = parseCell(match[1]);
  const condEnd = parseCell(match[2]);
  const condition = match[3];
  const sumStart = parseCell(match[4]);
  if (!condStart || !condEnd || !sumStart) return { success: false, error: '无效的区域', steps: [] };

  let sum = 0;
  const steps: string[] = [`条件区域: ${match[1]}:${match[2]}, 条件: "${condition}", 求和区域: ${match[4]}:${match[5]}`];
  const matches: string[] = [];

  for (let r = condStart.row; r <= condEnd.row; r++) {
    const condValue = data[r]?.[condStart.col]?.value || '';
    if (condValue === condition) {
      const sumRow = sumStart.row + (r - condStart.row);
      const numValue = parseFloat(data[sumRow]?.[sumStart.col]?.value || '0');
      if (!isNaN(numValue)) {
        sum += numValue;
        matches.push(`行${r + 1}: ${numValue}`);
      }
    }
  }

  steps.push(`匹配的值: ${matches.join(', ') || '(无)'}`);
  steps.push(`总和: ${sum}`);
  return { success: true, value: sum.toString(), steps };
}

// ========== 文本函数 ==========

function execLEFT(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/([A-Z]\d+)\s*,\s*(\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const text = getCellValue(data, match[1]);
  const count = parseInt(match[2]);
  const result = text.substring(0, count);

  return {
    success: true,
    value: result,
    steps: [
      `读取 ${match[1]} 的值: "${text}"`,
      `从左边取 ${count} 个字符`,
      `结果: "${result}"`,
    ],
  };
}

function execRIGHT(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/([A-Z]\d+)\s*,\s*(\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const text = getCellValue(data, match[1]);
  const count = parseInt(match[2]);
  const result = text.substring(text.length - count);

  return {
    success: true,
    value: result,
    steps: [
      `读取 ${match[1]} 的值: "${text}"`,
      `从右边取 ${count} 个字符`,
      `结果: "${result}"`,
    ],
  };
}

function execMID(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/([A-Z]\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const text = getCellValue(data, match[1]);
  const start = parseInt(match[2]) - 1;
  const count = parseInt(match[3]);
  const result = text.substring(start, start + count);

  return {
    success: true,
    value: result,
    steps: [
      `读取 ${match[1]} 的值: "${text}"`,
      `从第 ${start + 1} 个字符开始取 ${count} 个`,
      `结果: "${result}"`,
    ],
  };
}

function execLEN(data: CellData[][], args: string): ExecutionResult {
  const cellRef = args.trim();
  const text = getCellValue(data, cellRef);

  return {
    success: true,
    value: text.length.toString(),
    steps: [
      `读取 ${cellRef} 的值: "${text}"`,
      `字符长度: ${text.length}`,
    ],
  };
}

function execTRIM(data: CellData[][], args: string): ExecutionResult {
  const cellRef = args.trim();
  const text = getCellValue(data, cellRef);
  const result = text.trim().replace(/\s+/g, ' ');

  return {
    success: true,
    value: result,
    steps: [
      `读取 ${cellRef} 的值: "${text}"`,
      `去除多余空格后: "${result}"`,
    ],
  };
}

function execCONCATENATE(data: CellData[][], args: string): ExecutionResult {
  const parts = args.split(',').map(p => p.trim());
  const values: string[] = [];
  const steps: string[] = [];

  for (const part of parts) {
    if (part.startsWith('"') && part.endsWith('"')) {
      const text = part.slice(1, -1);
      values.push(text);
      steps.push(`字面值: "${text}"`);
    } else {
      const text = getCellValue(data, part);
      values.push(text);
      steps.push(`${part} = "${text}"`);
    }
  }

  const result = values.join('');
  steps.push(`合并结果: "${result}"`);
  return { success: true, value: result, steps };
}

function execSUBSTITUTE(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/([A-Z]\d+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const text = getCellValue(data, match[1]);
  const find = match[2];
  const replace = match[3];
  const result = text.split(find).join(replace);

  return {
    success: true,
    value: result,
    steps: [
      `读取 ${match[1]} 的值: "${text}"`,
      `将 "${find}" 替换为 "${replace}"`,
      `结果: "${result}"`,
    ],
  };
}

// ========== 数学函数 ==========

function execROUND(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/([A-Z]\d+|\d+\.?\d*)\s*,\s*(-?\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  let num: number;
  if (/^[A-Z]\d+$/i.test(match[1])) {
    num = parseFloat(getCellValue(data, match[1]));
  } else {
    num = parseFloat(match[1]);
  }

  const digits = parseInt(match[2]);
  const factor = Math.pow(10, digits);
  const result = Math.round(num * factor) / factor;

  return {
    success: true,
    value: result.toString(),
    steps: [
      `数值: ${num}`,
      `保留 ${digits} 位小数`,
      `结果: ${result}`,
    ],
  };
}

function execABS(data: CellData[][], args: string): ExecutionResult {
  const cellRef = args.trim();
  let num: number;

  if (/^[A-Z]\d+$/i.test(cellRef)) {
    num = parseFloat(getCellValue(data, cellRef));
  } else {
    num = parseFloat(cellRef);
  }

  const result = Math.abs(num);

  return {
    success: true,
    value: result.toString(),
    steps: [
      `数值: ${num}`,
      `绝对值: ${result}`,
    ],
  };
}

function execINT(data: CellData[][], args: string): ExecutionResult {
  const cellRef = args.trim();
  let num: number;

  if (/^[A-Z]\d+$/i.test(cellRef)) {
    num = parseFloat(getCellValue(data, cellRef));
  } else {
    num = parseFloat(cellRef);
  }

  const result = Math.floor(num);

  return {
    success: true,
    value: result.toString(),
    steps: [
      `数值: ${num}`,
      `向下取整: ${result}`,
    ],
  };
}

function execMOD(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/([A-Z]\d+|\d+)\s*,\s*(\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  let num: number;
  if (/^[A-Z]\d+$/i.test(match[1])) {
    num = parseFloat(getCellValue(data, match[1]));
  } else {
    num = parseFloat(match[1]);
  }

  const divisor = parseInt(match[2]);
  if (divisor === 0) return { success: false, error: '#DIV/0!', steps: ['除数不能为0'] };

  const result = num % divisor;

  return {
    success: true,
    value: result.toString(),
    steps: [
      `被除数: ${num}`,
      `除数: ${divisor}`,
      `余数: ${result}`,
    ],
  };
}

// ========== 查找函数 ==========

function execVLOOKUP(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/"([^"]+)"\s*,\s*([A-Z]\d+):([A-Z]\d+)\s*,\s*(\d+)\s*,\s*(TRUE|FALSE)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const lookupValue = match[1];
  const colIndex = parseInt(match[4]) - 1;
  const start = parseCell(match[2]);
  if (!start) return { success: false, error: '无效的区域', steps: [] };

  const steps: string[] = [`在第一列查找 "${lookupValue}"`];

  for (let i = 0; i < data.length; i++) {
    if (data[i][start.col]?.value === lookupValue) {
      const result = data[i][start.col + colIndex]?.value || '';
      steps.push(`找到匹配项在第 ${i + 1} 行`);
      steps.push(`返回该行第 ${colIndex + 1} 列的值: "${result}"`);
      return { success: true, value: result, steps };
    }
  }

  steps.push('未找到匹配项');
  return { success: false, error: '#N/A', steps };
}

function execINDEX(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/([A-Z]\d+):([A-Z]\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const start = parseCell(match[1]);
  if (!start) return { success: false, error: '无效的区域', steps: [] };

  const rowOffset = parseInt(match[3]) - 1;
  const colOffset = parseInt(match[4]) - 1;
  const result = data[start.row + rowOffset]?.[start.col + colOffset]?.value || '';

  return {
    success: true,
    value: result,
    steps: [
      `区域: ${match[1]}:${match[2]}`,
      `行偏移: ${rowOffset + 1}, 列偏移: ${colOffset + 1}`,
      `结果: "${result}"`,
    ],
  };
}

function execMATCH(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/"([^"]+)"\s*,\s*([A-Z]\d+):([A-Z]\d+)\s*,\s*(\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const lookupValue = match[1];
  const start = parseCell(match[2]);
  const end = parseCell(match[3]);
  if (!start || !end) return { success: false, error: '无效的区域', steps: [] };

  const steps: string[] = [`在区域 ${match[2]}:${match[3]} 中查找 "${lookupValue}"`];

  // 判断是行还是列
  const isColumn = start.col === end.col;
  
  if (isColumn) {
    for (let r = start.row; r <= end.row; r++) {
      if (data[r]?.[start.col]?.value === lookupValue) {
        const position = r - start.row + 1;
        steps.push(`找到匹配项在第 ${position} 个位置`);
        return { success: true, value: position.toString(), steps };
      }
    }
  } else {
    for (let c = start.col; c <= end.col; c++) {
      if (data[start.row]?.[c]?.value === lookupValue) {
        const position = c - start.col + 1;
        steps.push(`找到匹配项在第 ${position} 个位置`);
        return { success: true, value: position.toString(), steps };
      }
    }
  }

  steps.push('未找到匹配项');
  return { success: false, error: '#N/A', steps };
}

function execXLOOKUP(data: CellData[][], args: string): ExecutionResult {
  // XLOOKUP("查找值", 查找区域, 返回区域, [未找到值])
  // 支持两种格式: B1:B10 或 B:B
  const match = args.match(/"([^"]+)"\s*,\s*([A-Z])(?:(\d+):([A-Z])(\d+)|:([A-Z]))\s*,\s*([A-Z])(?:(\d+):([A-Z])(\d+)|:([A-Z]))(?:\s*,\s*"([^"]*)")?/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const lookupValue = match[1];
  const notFoundValue = match[12] || '#N/A';

  // 解析查找区域
  let lookupCol: number, lookupStartRow: number, lookupEndRow: number;
  if (match[6]) {
    // 整列格式 B:B
    lookupCol = match[2].toUpperCase().charCodeAt(0) - 65;
    lookupStartRow = 0;
    lookupEndRow = data.length - 1;
  } else {
    // 范围格式 B1:B10
    lookupCol = match[2].toUpperCase().charCodeAt(0) - 65;
    lookupStartRow = parseInt(match[3]) - 1;
    lookupEndRow = parseInt(match[5]) - 1;
  }

  // 解析返回区域
  let returnCol: number;
  if (match[11]) {
    // 整列格式 A:A
    returnCol = match[7].toUpperCase().charCodeAt(0) - 65;
  } else {
    // 范围格式 A1:A10
    returnCol = match[7].toUpperCase().charCodeAt(0) - 65;
  }

  const steps: string[] = [
    `查找值: "${lookupValue}"`,
    `查找列: ${String.fromCharCode(65 + lookupCol)}`,
    `返回列: ${String.fromCharCode(65 + returnCol)}`,
  ];

  // 在查找列中搜索
  for (let r = lookupStartRow; r <= lookupEndRow && r < data.length; r++) {
    if (data[r]?.[lookupCol]?.value === lookupValue) {
      const result = data[r]?.[returnCol]?.value || '';
      steps.push(`在第 ${r + 1} 行找到匹配`);
      steps.push(`返回对应值: "${result}"`);
      return { success: true, value: result, steps };
    }
  }

  steps.push(`未找到匹配项，返回: "${notFoundValue}"`);
  if (notFoundValue === '#N/A') {
    return { success: false, error: '#N/A', steps };
  }
  return { success: true, value: notFoundValue, steps };
}

function execHLOOKUP(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/"([^"]+)"\s*,\s*([A-Z]\d+):([A-Z]\d+)\s*,\s*(\d+)\s*,\s*(TRUE|FALSE)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const lookupValue = match[1];
  const rowIndex = parseInt(match[4]) - 1;
  const start = parseCell(match[2]);
  const end = parseCell(match[3]);
  if (!start || !end) return { success: false, error: '无效的区域', steps: [] };

  const steps: string[] = [`在第一行查找 "${lookupValue}"`];

  for (let c = start.col; c <= end.col; c++) {
    if (data[start.row]?.[c]?.value === lookupValue) {
      const result = data[start.row + rowIndex]?.[c]?.value || '';
      steps.push(`找到匹配项在第 ${c - start.col + 1} 列`);
      steps.push(`返回该列第 ${rowIndex + 1} 行的值: "${result}"`);
      return { success: true, value: result, steps };
    }
  }

  steps.push('未找到匹配项');
  return { success: false, error: '#N/A', steps };
}

function execCOUNTA(data: CellData[][], args: string): ExecutionResult {
  const rangeMatch = args.match(/([A-Z]\d+):([A-Z]\d+)/i);
  if (!rangeMatch) return { success: false, error: '无效的区域', steps: [] };

  const start = parseCell(rangeMatch[1]);
  const end = parseCell(rangeMatch[2]);
  if (!start || !end) return { success: false, error: '无效的区域', steps: [] };

  let count = 0;
  for (let r = start.row; r <= end.row; r++) {
    for (let c = start.col; c <= end.col; c++) {
      const val = data[r]?.[c]?.value;
      if (val !== undefined && val !== null && val !== '') count++;
    }
  }

  return {
    success: true,
    value: count.toString(),
    steps: [
      `统计区域 ${rangeMatch[1]}:${rangeMatch[2]} 的非空单元格`,
      `找到 ${count} 个非空单元格`,
    ],
  };
}

function execFIND(data: CellData[][], args: string): ExecutionResult {
  const match = args.match(/"([^"]*)"\s*,\s*([A-Z]\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const findText = match[1];
  const text = getCellValue(data, match[2]);
  const position = text.indexOf(findText);

  if (position === -1) {
    return {
      success: false,
      error: '#VALUE!',
      steps: [
        `在 "${text}" 中查找 "${findText}"`,
        '未找到',
      ],
    };
  }

  return {
    success: true,
    value: (position + 1).toString(),
    steps: [
      `在 "${text}" 中查找 "${findText}"`,
      `找到位置: ${position + 1}`,
    ],
  };
}

function execTEXTJOIN(data: CellData[][], args: string): ExecutionResult {
  // TEXTJOIN(",", TRUE, A1:A5)
  const match = args.match(/"([^"]*)"\s*,\s*(TRUE|FALSE)\s*,\s*([A-Z]\d+):([A-Z]\d+)/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const delimiter = match[1];
  const ignoreEmpty = match[2].toUpperCase() === 'TRUE';
  const start = parseCell(match[3]);
  const end = parseCell(match[4]);
  if (!start || !end) return { success: false, error: '无效的区域', steps: [] };

  const values: string[] = [];
  for (let r = start.row; r <= end.row; r++) {
    for (let c = start.col; c <= end.col; c++) {
      const val = data[r]?.[c]?.value || '';
      if (!ignoreEmpty || val !== '') values.push(val);
    }
  }

  const result = values.join(delimiter);

  return {
    success: true,
    value: result,
    steps: [
      `分隔符: "${delimiter}", 忽略空值: ${ignoreEmpty}`,
      `收集值: ${values.map(v => `"${v}"`).join(', ')}`,
      `结果: "${result}"`,
    ],
  };
}

// ========== 逻辑函数 ==========

function execIF(data: CellData[][], args: string): ExecutionResult {
  // 简化的 IF 解析：IF(A1>10, "大", "小")
  const match = args.match(/([A-Z]\d+)\s*(>=|<=|>|<|=)\s*(\d+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"/i);
  if (!match) return { success: false, error: '参数格式错误', steps: [] };

  const cellValue = parseFloat(getCellValue(data, match[1]));
  const operator = match[2];
  const compareValue = parseFloat(match[3]);
  const trueValue = match[4];
  const falseValue = match[5];

  let result = false;
  switch (operator) {
    case '>=': result = cellValue >= compareValue; break;
    case '<=': result = cellValue <= compareValue; break;
    case '>': result = cellValue > compareValue; break;
    case '<': result = cellValue < compareValue; break;
    case '=': result = cellValue === compareValue; break;
  }

  return {
    success: true,
    value: result ? trueValue : falseValue,
    steps: [
      `读取 ${match[1]} 的值: ${cellValue}`,
      `判断条件: ${cellValue} ${operator} ${compareValue} = ${result ? 'TRUE' : 'FALSE'}`,
      `返回: "${result ? trueValue : falseValue}"`,
    ],
  };
}

// ========== 主执行函数 ==========

const FUNCTION_MAP: Record<string, (data: CellData[][], args: string) => ExecutionResult> = {
  // 统计
  SUM: execSUM,
  AVERAGE: execAVERAGE,
  COUNT: execCOUNT,
  COUNTA: execCOUNTA,
  MAX: execMAX,
  MIN: execMIN,
  COUNTIF: execCOUNTIF,
  SUMIF: execSUMIF,
  // 文本
  LEFT: execLEFT,
  RIGHT: execRIGHT,
  MID: execMID,
  LEN: execLEN,
  TRIM: execTRIM,
  CONCATENATE: execCONCATENATE,
  SUBSTITUTE: execSUBSTITUTE,
  FIND: execFIND,
  TEXTJOIN: execTEXTJOIN,
  // 数学
  ROUND: execROUND,
  ABS: execABS,
  INT: execINT,
  MOD: execMOD,
  // 查找
  VLOOKUP: execVLOOKUP,
  HLOOKUP: execHLOOKUP,
  XLOOKUP: execXLOOKUP,
  INDEX: execINDEX,
  MATCH: execMATCH,
  // 逻辑
  IF: execIF,
};

export function executeFormula(
  formula: string,
  data: CellData[][]
): ExecutionResult {
  const formulaTrim = formula.trim();
  if (!formulaTrim.startsWith('=')) {
    return { success: false, error: '公式必须以 = 开头', steps: [] };
  }

  // 解析函数名和参数
  const match = formulaTrim.match(/^=\s*([A-Z]+)\s*\((.*)\)\s*$/i);
  if (!match) {
    return { success: false, error: '无法解析公式格式', steps: [] };
  }

  const funcName = match[1].toUpperCase();
  const args = match[2];

  const executor = FUNCTION_MAP[funcName];
  if (!executor) {
    return {
      success: false,
      error: '暂不支持此公式的模拟执行',
      steps: [
        `函数 ${funcName} 尚未实现`,
        `当前支持: ${Object.keys(FUNCTION_MAP).join(', ')}`,
      ],
    };
  }

  try {
    return executor(data, args);
  } catch (err) {
    return {
      success: false,
      error: '执行错误',
      steps: [(err as Error).message],
    };
  }
}

// 获取支持的函数列表
export function getSupportedFunctions(): string[] {
  return Object.keys(FUNCTION_MAP);
}
