import { useState, useMemo } from "react";
import { ImageModal } from "./ImagePreview";
import { DuplicateCompareModal } from "./DuplicateCompareModal";
import { GhostButton, OutlineButton } from "./UI/Buttons";
import { useAIChat } from "../contexts/AIChatContext";
import type { ValidationError, ImageValidationError, ValidationResult } from "../../shared/types";

interface ValidationResultsProps {
  result: ValidationResult;
  taskName: string;
  fileName?: string;
  onExport?: () => void;
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  required: "必填项缺失",
  enum: "类型不符",
  timeRange: "时间范围错误",
  duration: "时长不符",
  dateInterval: "日期间隔冲突",
  frequency: "频次超限",
  unique: "重复值",
  structure: "结构错误",
  dateFormat: "日期格式错误",
  prohibitedContent: "禁用内容",
  sameImplementer: "同一人拜访",
  medicalLevel: "医疗类型错误",
};

const IMAGE_ERROR_TYPE_LABELS: Record<string, string> = {
  blur: "模糊",
  duplicate: "重复",
  suspicious: "可疑",
  seasonMismatch: "季节不符",
  border: "边框",

  objectDuplicate: "物体重复",
};

// Ask AI 按钮组件
function AskAIButton({ 
  error, 
  taskName, 
  fileName 
}: { 
  error: ValidationError; 
  taskName: string; 
  fileName?: string;
}) {
  const { setSelectedError, updateTask, openChat } = useAIChat();
  
  const handleClick = () => {
    updateTask(taskName, fileName);
    setSelectedError({
      row: error.row,
      field: error.field,
      errorType: error.errorType,
      value: String(error.value ?? ''),
      expected: error.message
    });
    openChat();
  };
  
  return (
    <button
      onClick={handleClick}
      className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline"
      title="询问 AI 如何修复"
    >
      🤖 问问
    </button>
  );
}

export function ValidationResults({
  result,
  taskName,
  fileName,
  onExport,
}: ValidationResultsProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [imageFilterType, setImageFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [imageCurrentPage, setImageCurrentPage] = useState(1);
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<ImageValidationError | null>(
    null
  );
  // 当前预览的索引（用于导航）
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  // 重复图片对比状态
  const [compareImage, setCompareImage] = useState<ImageValidationError | null>(
    null
  );
  // 当前对比的索引（用于导航）
  const [compareIndex, setCompareIndex] = useState<number>(0);
  const errorsPerPage = 20;
  const imageErrorsPerPage = 20;

  const { errors, summary, imageErrors } = result;

  // 图片错误类型优先级（用于排序）
  // 重复类优先显示，其次是边框、季节不符等
  const IMAGE_ERROR_TYPE_ORDER: Record<string, number> = {
    duplicate: 1,
    objectDuplicate: 2,
    border: 3,
    watermark: 4,
    seasonMismatch: 5,
    blur: 6,
    suspicious: 7,
  };

  // 获取唯一的图片错误类型
  const imageErrorTypes = useMemo(() => {
    if (!imageErrors) return [];
    return Array.from(new Set(imageErrors.map((e) => e.errorType)));
  }, [imageErrors]);

  // 排序并筛选后的图片错误
  const filteredAndSortedImageErrors = useMemo(() => {
    if (!imageErrors) return [];
    
    // 先筛选
    const filtered = imageFilterType === "all" 
      ? imageErrors 
      : imageErrors.filter(e => e.errorType === imageFilterType);
    
    // 再排序：按类型优先级分组，同类型内按图片索引排序
    return [...filtered].sort((a, b) => {
      const orderA = IMAGE_ERROR_TYPE_ORDER[a.errorType] || 99;
      const orderB = IMAGE_ERROR_TYPE_ORDER[b.errorType] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.imageIndex - b.imageIndex;
    });
  }, [imageErrors, imageFilterType]);

  // 筛选出可对比的重复图片错误（有对比数据的）
  const duplicateErrorsForCompare = useMemo(() => {
    if (!imageErrors) return [];
    return imageErrors.filter(
      (e) => 
        (e.errorType === "duplicate" || e.errorType === "objectDuplicate") &&
        e.imageData &&
        e.details?.duplicateOfImageData
    );
  }, [imageErrors]);

  // 获取唯一的错误类型
  const errorTypes = Array.from(new Set(errors.map((e) => e.errorType)));

  // 过滤错误
  const filteredErrors =
    filterType === "all"
      ? errors
      : errors.filter((e) => e.errorType === filterType);

  // 分页
  const totalPages = Math.ceil(filteredErrors.length / errorsPerPage);
  const startIndex = (currentPage - 1) * errorsPerPage;
  const paginatedErrors = filteredErrors.slice(
    startIndex,
    startIndex + errorsPerPage
  );

  const getErrorTypeLabel = (type: string) => {
    return ERROR_TYPE_LABELS[type] || type;
  };

  return (
    <div className="space-y-8 font-sans">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 border-l-2 border-black pl-3">审核结果</h2>
        {onExport && (errors.length > 0 || (imageErrors?.length ?? 0) > 0) && (
          <GhostButton onClick={onExport} className="border border-zinc-200">
            📥 导出 Excel
          </GhostButton>
        )}
      </div>

      {/* 基本信息卡片 - 极简 Data Grid 风格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
        {fileName && (
          <div className="bg-white p-4">
            <span className="block text-xs font-semibold text-zinc-600 mb-1">文件名</span>
            <span className="block text-sm font-mono text-zinc-900 truncate" title={fileName}>{fileName}</span>
          </div>
        )}
        <div className="bg-white p-4">
          <span className="block text-xs font-semibold text-zinc-600 mb-1">任务类型</span>
          <span className="block text-sm font-medium text-zinc-900">{taskName}</span>
        </div>
        {result.usedSheetName && (
          <div className="bg-white p-4">
            <span className="block text-xs font-semibold text-zinc-600 mb-1">工作表</span>
            <span className="block text-sm font-medium font-mono text-zinc-900">{result.usedSheetName}</span>
          </div>
        )}
        <div className={`bg-white p-4 ${result.isValid ? "bg-green-50/30" : "bg-red-50/30"}`}>
          <span className="block text-xs font-semibold text-zinc-600 mb-1">状态</span>
          <span className={`block text-sm font-bold ${result.isValid ? "text-green-600" : "text-red-600"}`}>
            {result.isValid ? "✅ 通过" : "❌ 未通过"}
          </span>
        </div>
      </div>

      {/* 表头验证失败提示 */}
      {result.headerValidation && !result.headerValidation.isValid && (
        <div className="bg-amber-50 rounded-lg p-6 border border-amber-100">
          <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
            <span>⚠️</span> 表头不匹配
          </h4>
          <p className="text-sm text-amber-800 mb-4">Excel 表头与任务模板要求不匹配。</p>
          
          {result.headerValidation.missingFields.length > 0 && (
            <div className="mb-4">
              <strong className="text-xs font-bold text-amber-900 uppercase tracking-wide">缺失字段</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.headerValidation.missingFields.map((field, i) => (
                  <span key={i} className="px-2 py-1 bg-white border border-amber-200 text-amber-800 text-xs rounded font-mono">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {result.headerValidation.suggestions && result.headerValidation.suggestions.length > 0 && (
            <div>
              <strong className="text-xs font-bold text-amber-900 uppercase tracking-wide">匹配建议</strong>
              <ul className="mt-2 space-y-1">
                {result.headerValidation.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-amber-800 font-mono">
                    期望 <span className="font-bold">{s.expected}</span> → 找到 <span className="font-bold">{s.actual}</span> (相似度 {Math.round(s.similarity * 100)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="p-4 border-l-4 border-zinc-200 pl-4 bg-zinc-50/50">
          <span className="block text-3xl font-bold text-zinc-900">{summary.totalRows}</span>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">总行数</span>
        </div>
        <div className="p-4 border-l-4 border-green-200 pl-4 bg-zinc-50/50">
          <span className="block text-3xl font-bold text-green-700">{summary.validRows}</span>
          <span className="text-xs font-bold text-green-600/60 uppercase tracking-wider">有效行数</span>
        </div>
        <div className="p-4 border-l-4 border-red-200 pl-4 bg-zinc-50/50">
          <span className="block text-3xl font-bold text-red-700">{summary.errorCount}</span>
          <span className="text-xs font-bold text-red-600/60 uppercase tracking-wider">错误数量</span>
        </div>
      </div>

      {/* 图片统计 */}
      {summary.imageStats && summary.imageStats.totalImages > 0 && (
        <div className="border-t border-zinc-100 pt-6">
          <h4 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            📷 图片验证统计
          </h4>
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-zinc-50 rounded p-3 text-center border border-zinc-100">
              <span className="block text-xl font-bold text-zinc-900">{summary.imageStats.totalImages}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">总数</span>
            </div>
            <div className="bg-red-50/50 rounded p-3 text-center border border-red-100/50">
              <span className="block text-xl font-bold text-red-700">{summary.imageStats.blurryImages}</span>
              <span className="text-[10px] font-bold text-red-600/70 uppercase">模糊</span>
            </div>
            <div className="bg-amber-50/50 rounded p-3 text-center border border-amber-100/50">
              <span className="block text-xl font-bold text-amber-700">{summary.imageStats.duplicateImages}</span>
              <span className="text-[10px] font-bold text-amber-600/70 uppercase">重复</span>
            </div>
            <div className="bg-zinc-50 rounded p-3 text-center border border-zinc-100">
              <span className="block text-xl font-bold text-zinc-700">{summary.imageStats.suspiciousImages}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">可疑</span>
            </div>
            <div className="bg-blue-50/50 rounded p-3 text-center border border-blue-100/50">
              <span className="block text-xl font-bold text-blue-700">{summary.imageStats.seasonMismatchImages || 0}</span>
              <span className="text-[10px] font-bold text-blue-600/70 uppercase">季节不符</span>
            </div>
            <div className="bg-rose-50/50 rounded p-3 text-center border border-rose-100/50">
              <span className="block text-xl font-bold text-rose-700">{summary.imageStats.borderImages || 0}</span>
              <span className="text-[10px] font-bold text-rose-600/70 uppercase">边框</span>
            </div>
          </div>
        </div>
      )}

      {/* 图片验证跳过提示 */}
      {summary.imageValidationSkipped && (
        <div className={`rounded-lg p-4 border ${
          summary.imageValidationSkipReason === '此任务类型无需图片验证'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {summary.imageValidationSkipReason === '此任务类型无需图片验证' ? 'ℹ️' : '⚠️'}
            </span>
            <div>
              <h4 className={`text-sm font-bold mb-1 ${
                summary.imageValidationSkipReason === '此任务类型无需图片验证'
                  ? 'text-blue-900'
                  : 'text-amber-900'
              }`}>图片验证已跳过</h4>
              <p className={`text-sm ${
                summary.imageValidationSkipReason === '此任务类型无需图片验证'
                  ? 'text-blue-800'
                  : 'text-amber-800'
              }`}>
                {summary.imageValidationSkipReason || '文件过大，无法进行图片验证'}
              </p>
              {/* 只有非"任务类型无需"的情况才显示拆分建议 */}
              {summary.imageValidationSkipReason !== '此任务类型无需图片验证' && (
                <p className="text-xs text-amber-600 mt-2">
                  建议：将文件拆分成多个较小的文件（小于 2GB）后重新审核。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 数据错误详情 - Notion Database Style */}
      {errors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">数据错误</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">筛选：</span>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-medium text-zinc-900 focus:ring-0 cursor-pointer hover:bg-zinc-50 rounded py-1 px-2"
              >
                <option value="all">全部错误 ({errors.length})</option>
                {errorTypes.map((type) => (
                  <option key={type} value={type}>
                    {getErrorTypeLabel(type)} ({errors.filter((e) => e.errorType === type).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-zinc-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-16">行号</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-32">字段</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-32">类型</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200">错误信息</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-48 text-right">当前值</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-20 text-center">AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-sm">
                {paginatedErrors.map((err, idx) => (
                  <tr key={idx} className="group hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 text-zinc-500">{err.row}</td>
                    <td className="py-3 px-4 text-zinc-900 font-medium">{err.field}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-100/50">
                        {getErrorTypeLabel(err.errorType)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{err.message}</td>
                    <td className="py-3 px-4 text-right text-zinc-500 truncate max-w-[200px]" title={String(err.value)}>
                      {err.value !== undefined ? String(err.value) : <span className="text-zinc-300">-</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <AskAIButton error={err} taskName={taskName} fileName={fileName} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">
                显示 {startIndex + 1}-{Math.min(startIndex + errorsPerPage, filteredErrors.length)} 条，共 {filteredErrors.length} 条
              </span>
              <div className="flex gap-2">
                <OutlineButton
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 py-0 text-xs"
                >
                  上一页
                </OutlineButton>
                <OutlineButton
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3 py-0 text-xs"
                >
                  下一页
                </OutlineButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 图片错误详情 - 按类型分组排序，支持筛选 */}
      {(imageErrors?.length ?? 0) > 0 && (
        <div className="space-y-4 pt-8 border-t border-zinc-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">图片错误</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">筛选：</span>
              <select
                value={imageFilterType}
                onChange={(e) => {
                  setImageFilterType(e.target.value);
                  setImageCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-medium text-zinc-900 focus:ring-0 cursor-pointer hover:bg-zinc-50 rounded py-1 px-2"
              >
                <option value="all">全部类型 ({imageErrors?.length || 0})</option>
                {imageErrorTypes.map((type) => (
                  <option key={type} value={type}>
                    {IMAGE_ERROR_TYPE_LABELS[type] || type} ({imageErrors?.filter((e) => e.errorType === type).length})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto border-t border-zinc-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-20">序号</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-32">位置</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-24">类型</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200">详情</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-400 font-normal uppercase tracking-wider border-b border-zinc-200 w-24 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-sm">
                {filteredAndSortedImageErrors
                  .slice((imageCurrentPage - 1) * imageErrorsPerPage, imageCurrentPage * imageErrorsPerPage)
                  .map((err, idx) => (
                  <tr key={idx} className="group hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 text-zinc-500">#{err.imageIndex}</td>
                    <td className="py-3 px-4 text-zinc-900">
                      行{err.row}
                      {err.column && ` 列${err.column}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                        err.errorType === 'blur' ? 'bg-red-50 text-red-700 border-red-100' :
                        err.errorType === 'duplicate' ? 'bg-amber-50 text-amber-700 border-amber-100' :

                        err.errorType === 'objectDuplicate' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        err.errorType === 'border' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        err.errorType === 'seasonMismatch' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}>
                        {IMAGE_ERROR_TYPE_LABELS[err.errorType] || err.errorType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      <div className="flex flex-col gap-0.5">
                        <span>{err.message}</span>
                        {err.details?.blurScore !== undefined && (
                          <span className="text-xs text-zinc-400">清晰度: {err.details.blurScore.toFixed(1)}</span>
                        )}
                        {err.details?.duplicateOf !== undefined && (
                          <span className="text-xs text-zinc-400">
                            与 {err.details.duplicateOfPosition || `图片 #${err.details.duplicateOf}`} 重复
                          </span>
                        )}

                        {err.details?.objectDuplicate && (
                          <span className="text-xs text-purple-500">
                            {err.details.objectDuplicate.objectClassCN}: {err.details.objectDuplicate.image1Position} ↔ {err.details.objectDuplicate.image2Position}
                            {' '}(相似度: {(err.details.objectDuplicate.similarity * 100).toFixed(0)}%)
                          </span>
                        )}
                        {err.details?.seasonMismatchReason && (
                          <span className="text-xs text-blue-500">{err.details.seasonMismatchReason}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 重复图片对比按钮 */}
                        {(err.errorType === 'duplicate' || err.errorType === 'objectDuplicate') && err.imageData && err.details?.duplicateOfImageData && (
                          <button
                            onClick={() => {
                              // 找到当前错误在可对比列表中的索引
                              const idx = duplicateErrorsForCompare.findIndex(e => e === err);
                              setCompareIndex(idx >= 0 ? idx : 0);
                              setCompareImage(err);
                            }}
                            className={`text-xs font-medium hover:underline cursor-pointer transition-colors ${
                              err.errorType === 'objectDuplicate' ? 'text-purple-600 hover:text-purple-700' :
                              'text-amber-600 hover:text-amber-700'
                            }`}
                          >
                            对比
                          </button>
                        )}
                        {err.imageData ? (
                          <button
                            onClick={() => {
                              // 找到当前错误在排序后列表中的索引
                              const idx = filteredAndSortedImageErrors.findIndex(e => e === err);
                              setPreviewIndex(idx >= 0 ? idx : 0);
                              setPreviewImage(err);
                            }}
                            className="text-xs font-medium text-zinc-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                          >
                            查看
                          </button>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 图片错误分页 */}
          {Math.ceil(filteredAndSortedImageErrors.length / imageErrorsPerPage) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">
                显示 {(imageCurrentPage - 1) * imageErrorsPerPage + 1}-{Math.min(imageCurrentPage * imageErrorsPerPage, filteredAndSortedImageErrors.length)} 条，共 {filteredAndSortedImageErrors.length} 条
              </span>
              <div className="flex gap-2">
                <OutlineButton
                  onClick={() => setImageCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={imageCurrentPage === 1}
                  className="h-8 px-3 py-0 text-xs"
                >
                  上一页
                </OutlineButton>
                <OutlineButton
                  onClick={() => setImageCurrentPage((p) => Math.min(Math.ceil(filteredAndSortedImageErrors.length / imageErrorsPerPage), p + 1))}
                  disabled={imageCurrentPage === Math.ceil(filteredAndSortedImageErrors.length / imageErrorsPerPage)}
                  className="h-8 px-3 py-0 text-xs"
                >
                  下一页
                </OutlineButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewImage && previewImage.imageData && (
        <ImageModal
          imageData={previewImage.imageData}
          imageId={`图片 #${previewImage.imageIndex}`}
          position={`行${previewImage.row}${previewImage.column ? ` 列${previewImage.column}` : ""}`}
          message={previewImage.message}
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          currentIndex={previewIndex}
          totalCount={filteredAndSortedImageErrors.filter(e => e.imageData).length}
          onPrev={() => {
            // 找到上一个有图片数据的错误
            for (let i = previewIndex - 1; i >= 0; i--) {
              if (filteredAndSortedImageErrors[i]?.imageData) {
                setPreviewIndex(i);
                setPreviewImage(filteredAndSortedImageErrors[i]);
                break;
              }
            }
          }}
          onNext={() => {
            // 找到下一个有图片数据的错误
            for (let i = previewIndex + 1; i < filteredAndSortedImageErrors.length; i++) {
              if (filteredAndSortedImageErrors[i]?.imageData) {
                setPreviewIndex(i);
                setPreviewImage(filteredAndSortedImageErrors[i]);
                break;
              }
            }
          }}
          details={{
            row: previewImage.row,
            column: previewImage.column,
            isBlurry: previewImage.errorType === "blur",
            blurScore: previewImage.details?.blurScore,
            isDuplicate: previewImage.errorType === "duplicate",
            suspicionScore: previewImage.details?.suspicionScore,
            suspicionLevel: previewImage.details?.suspicionLevel,
            errorMessage: previewImage.message,
            errorType: previewImage.errorType,
            seasonMismatchReason: previewImage.details?.seasonMismatchReason,
          }}
        />
      )}

      {/* 重复图片对比模态框 */}
      {compareImage && compareImage.imageData && compareImage.details?.duplicateOfImageData && (
        <DuplicateCompareModal
          isOpen={!!compareImage}
          onClose={() => setCompareImage(null)}
          leftImage={{
            imageData: compareImage.imageData,
            position: `行${compareImage.row}${compareImage.column ? ` 列${compareImage.column}` : ""}`,
            imageIndex: compareImage.imageIndex,
          }}
          rightImage={{
            imageData: compareImage.details.duplicateOfImageData,
            position: compareImage.details.duplicateOfPosition || `图片 #${compareImage.details.duplicateOf}`,
            imageIndex: compareImage.details.duplicateOf || 0,
          }}
          currentIndex={compareIndex}
          totalCount={duplicateErrorsForCompare.length}
          onPrev={() => {
            if (compareIndex > 0) {
              const prevErr = duplicateErrorsForCompare[compareIndex - 1];
              setCompareIndex(compareIndex - 1);
              setCompareImage(prevErr);
            }
          }}
          onNext={() => {
            if (compareIndex < duplicateErrorsForCompare.length - 1) {
              const nextErr = duplicateErrorsForCompare[compareIndex + 1];
              setCompareIndex(compareIndex + 1);
              setCompareImage(nextErr);
            }
          }}
        />
      )}
      {/* 验证通过提示 */}
      {result.isValid && errors.length === 0 && (
        <div className="bg-green-50 rounded-lg p-8 text-center border border-green-100">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✅
          </div>
          <h3 className="text-lg font-bold text-green-900 mb-2">验证通过</h3>
          <p className="text-green-700">所有数据均符合验证规则要求。</p>
        </div>
      )}
    </div>
  );
}
