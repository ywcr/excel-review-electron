import { useState } from "react";
import { ImageModal } from "./ImagePreview";
import "./ValidationResults.css";

interface ValidationError {
  row: number;
  column?: string;
  field: string;
  value?: any;
  message: string;
  errorType: string;
}

interface ImageValidationError {
  row: number;
  column?: string;
  field?: string;
  imageIndex: number;
  errorType: "blur" | "duplicate" | "suspicious";
  message: string;
  details?: {
    blurScore?: number;
    duplicateOf?: number;
    suspicionScore?: number;
    suspicionLevel?: string;
  };
  /** Base64 编码的缩略图数据（用于预览） */
  imageData?: string;
  /** 图片 MIME 类型 */
  mimeType?: string;
}

interface ValidationResult {
  isValid: boolean;
  needSheetSelection?: boolean;
  availableSheets?: Array<{ name: string; hasData: boolean }>;
  headerValidation?: {
    isValid: boolean;
    missingFields: string[];
    unmatchedFields: string[];
    suggestions: Array<{
      expected: string;
      actual: string;
      similarity: number;
    }>;
  };
  errors: ValidationError[];
  imageErrors?: ImageValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
    imageStats?: {
      totalImages: number;
      blurryImages: number;
      duplicateImages: number;
      suspiciousImages: number;
    };
  };
  usedSheetName?: string;
}

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

export function ValidationResults({
  result,
  taskName,
  fileName,
  onExport,
}: ValidationResultsProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<ImageValidationError | null>(
    null
  );
  const errorsPerPage = 20;

  const { errors, summary, imageErrors } = result;

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
    <div className="validation-results">
      {/* 头部信息 */}
      <div className="results-header">
        <h2>📊 验证结果</h2>
        {onExport && (errors.length > 0 || (imageErrors?.length ?? 0) > 0) && (
          <button onClick={onExport} className="btn-export">
            📥 导出Excel
          </button>
        )}
      </div>

      {/* 基本信息卡片 */}
      <div className="info-cards">
        {fileName && (
          <div className="info-card">
            <span className="info-label">文件名</span>
            <span className="info-value">{fileName}</span>
          </div>
        )}
        <div className="info-card">
          <span className="info-label">任务类型</span>
          <span className="info-value">{taskName}</span>
        </div>
        {result.usedSheetName && (
          <div className="info-card">
            <span className="info-label">工作表</span>
            <span className="info-value">{result.usedSheetName}</span>
          </div>
        )}
        <div className={`info-card ${result.isValid ? "success" : "error"}`}>
          <span className="info-label">验证状态</span>
          <span className="info-value">
            {result.isValid ? "✅ 通过" : "❌ 未通过"}
          </span>
        </div>
      </div>

      {/* 表头验证失败提示 */}
      {result.headerValidation && !result.headerValidation.isValid && (
        <div className="header-error-box">
          <h4>⚠️ 表头验证失败</h4>
          <p>Excel文件的表头与所选任务模板不匹配，请检查以下问题：</p>
          {result.headerValidation.missingFields.length > 0 && (
            <div className="missing-fields">
              <strong>缺失的必需字段：</strong>
              <div className="field-tags">
                {result.headerValidation.missingFields.map((field, i) => (
                  <span key={i} className="field-tag">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.headerValidation.suggestions &&
            result.headerValidation.suggestions.length > 0 && (
              <div className="suggestions">
                <strong>可能的匹配建议：</strong>
                <ul>
                  {result.headerValidation.suggestions.map((s, i) => (
                    <li key={i}>
                      期望 "<strong>{s.expected}</strong>" → 找到 "
                      <strong>{s.actual}</strong>" (相似度:{" "}
                      {Math.round(s.similarity * 100)}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* 统计摘要 */}
      <div className="summary-stats">
        <div className="stat-box">
          <span className="stat-number">{summary.totalRows}</span>
          <span className="stat-label">总行数</span>
        </div>
        <div className="stat-box success">
          <span className="stat-number">{summary.validRows}</span>
          <span className="stat-label">有效行数</span>
        </div>
        <div className="stat-box error">
          <span className="stat-number">{summary.errorCount}</span>
          <span className="stat-label">错误数量</span>
        </div>
      </div>

      {/* 图片统计 */}
      {summary.imageStats && summary.imageStats.totalImages > 0 && (
        <div className="image-stats-section">
          <h4>📷 图片验证统计</h4>
          <div className="image-stats-grid">
            <div className="stat-box">
              <span className="stat-number">
                {summary.imageStats.totalImages}
              </span>
              <span className="stat-label">总图片数</span>
            </div>
            <div className="stat-box error">
              <span className="stat-number">
                {summary.imageStats.blurryImages}
              </span>
              <span className="stat-label">模糊图片</span>
            </div>
            <div className="stat-box warning">
              <span className="stat-number">
                {summary.imageStats.duplicateImages}
              </span>
              <span className="stat-label">重复图片</span>
            </div>
            <div className="stat-box warning">
              <span className="stat-number">
                {summary.imageStats.suspiciousImages}
              </span>
              <span className="stat-label">可疑图片</span>
            </div>
          </div>
        </div>
      )}

      {/* 数据错误详情 */}
      {errors.length > 0 && (
        <div className="errors-section">
          <div className="errors-header">
            <h3>📝 数据错误详情</h3>
            <div className="filter-group">
              <label>筛选：</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">全部错误 ({errors.length})</option>
                {errorTypes.map((type) => (
                  <option key={type} value={type}>
                    {getErrorTypeLabel(type)} (
                    {errors.filter((e) => e.errorType === type).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="errors-table-wrapper">
            <table className="errors-table">
              <thead>
                <tr>
                  <th>行号</th>
                  <th>字段</th>
                  <th>错误类型</th>
                  <th>错误信息</th>
                  <th>当前值</th>
                </tr>
              </thead>
              <tbody>
                {paginatedErrors.map((err, idx) => (
                  <tr key={idx}>
                    <td>{err.row}</td>
                    <td>{err.field}</td>
                    <td>
                      <span className={`error-badge ${err.errorType}`}>
                        {getErrorTypeLabel(err.errorType)}
                      </span>
                    </td>
                    <td>{err.message}</td>
                    <td className="value-cell">
                      {err.value !== undefined ? String(err.value) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">
                显示 {startIndex + 1} 到{" "}
                {Math.min(startIndex + errorsPerPage, filteredErrors.length)}{" "}
                条，共 {filteredErrors.length} 条错误
              </span>
              <div className="page-buttons">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-page"
                >
                  上一页
                </button>
                <span className="page-current">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="btn-page"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 图片错误详情 */}
      {imageErrors && imageErrors.length > 0 && (
        <div className="image-errors-section">
          <h3>🖼️ 图片错误详情</h3>
          <div className="errors-table-wrapper">
            <table className="errors-table">
              <thead>
                <tr>
                  <th>图片#</th>
                  <th>位置</th>
                  <th>错误类型</th>
                  <th>错误信息</th>
                  <th>详细信息</th>
                  <th>预览</th>
                </tr>
              </thead>
              <tbody>
                {imageErrors.map((err, idx) => (
                  <tr key={idx}>
                    <td>#{err.imageIndex}</td>
                    <td>
                      行{err.row}
                      {err.column && ` ${err.column}列`}
                    </td>
                    <td>
                      <span className={`img-error-badge ${err.errorType}`}>
                        {err.errorType === "blur"
                          ? "模糊"
                          : err.errorType === "duplicate"
                          ? "重复"
                          : "可疑"}
                      </span>
                    </td>
                    <td>{err.message}</td>
                    <td className="details-cell">
                      {err.details?.blurScore !== undefined && (
                        <span>清晰度: {err.details.blurScore.toFixed(1)}</span>
                      )}
                      {err.details?.duplicateOf !== undefined && (
                        <span>与图片#{err.details.duplicateOf}重复</span>
                      )}
                      {err.details?.suspicionScore !== undefined && (
                        <span>
                          可疑度: {err.details.suspicionScore} (
                          {err.details.suspicionLevel})
                        </span>
                      )}
                    </td>
                    <td>
                      {err.imageData ? (
                        <button
                          className="btn-preview"
                          onClick={() => setPreviewImage(err)}
                          title="点击查看大图"
                        >
                          🔍 查看
                        </button>
                      ) : (
                        <span className="no-preview">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewImage && previewImage.imageData && (
        <ImageModal
          imageData={previewImage.imageData}
          imageId={`图片 #${previewImage.imageIndex}`}
          position={`行${previewImage.row}${
            previewImage.column ? ` ${previewImage.column}列` : ""
          }`}
          message={previewImage.message}
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          details={{
            row: previewImage.row,
            column: previewImage.column,
            isBlurry: previewImage.errorType === "blur",
            blurScore: previewImage.details?.blurScore,
            isDuplicate: previewImage.errorType === "duplicate",
            suspicionScore: previewImage.details?.suspicionScore,
            suspicionLevel: previewImage.details?.suspicionLevel,
          }}
        />
      )}

      {/* 验证通过提示 */}
      {result.isValid && errors.length === 0 && (
        <div className="success-message">
          <div className="success-icon">✅</div>
          <h3>验证通过！</h3>
          <p>所有数据均符合验证规则要求。</p>
        </div>
      )}
    </div>
  );
}
