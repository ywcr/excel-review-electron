import { useState, useEffect } from "react";
import "./ImagePreview.css";

interface ImagePreviewProps {
  /** 图片数据：可以是 Base64 data URL 字符串，或 Uint8Array/number[] 二进制数据 */
  imageData: string | Uint8Array | number[];
  /** MIME 类型（当 imageData 为二进制时必需） */
  mimeType?: string;
  imageId: string;
  className?: string;
  onClick?: () => void;
}

// 基础图片预览组件
export function ImagePreview({
  imageData,
  mimeType = "image/jpeg",
  imageId,
  className = "",
  onClick,
}: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      // 如果是 Base64 data URL 字符串，直接使用
      if (typeof imageData === "string") {
        setImageUrl(imageData);
        setLoading(false);
        return;
      }

      // 否则处理二进制数据
      const data =
        imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData);
      // 使用 slice 确保是 ArrayBuffer 类型
      const buffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setLoading(false);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      setError("图片加载失败");
      setLoading(false);
    }
  }, [imageData, mimeType]);

  if (loading) {
    return (
      <div className={`image-preview loading ${className}`}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`image-preview error ${className}`}>
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`图片 ${imageId}`}
      className={`image-preview ${onClick ? "clickable" : ""} ${className}`}
      onClick={onClick}
      onError={() => setError("图片显示失败")}
    />
  );
}

// 图片放大模态框
interface ImageModalProps {
  /** 图片数据：可以是 Base64 data URL 字符串，或 Uint8Array/number[] 二进制数据 */
  imageData: string | Uint8Array | number[];
  /** MIME 类型（当 imageData 为二进制时使用） */
  mimeType?: string;
  imageId: string;
  position?: string;
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  details?: {
    row?: number;
    column?: string;
    width?: number;
    height?: number;
    isBlurry?: boolean;
    blurScore?: number;
    isDuplicate?: boolean;
    suspicionScore?: number;
    suspicionLevel?: string;
  };
}

export function ImageModal({
  imageData,
  mimeType,
  imageId,
  position,
  isOpen,
  onClose,
  details,
}: ImageModalProps) {
  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h3>📷 图片详情</h3>
            <p className="modal-subtitle">
              {imageId} {position && `位置: ${position}`}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-image-container">
            <ImagePreview
              imageData={imageData}
              mimeType={mimeType}
              imageId={imageId}
              className="modal-image"
            />
          </div>

          {details && (
            <div className="modal-details">
              <h4>图片信息</h4>
              <div className="details-grid">
                {details.row && (
                  <div className="detail-item">
                    <span className="detail-label">行号</span>
                    <span className="detail-value">{details.row}</span>
                  </div>
                )}
                {details.column && (
                  <div className="detail-item">
                    <span className="detail-label">列号</span>
                    <span className="detail-value">{details.column}</span>
                  </div>
                )}
                {details.width && details.height && (
                  <div className="detail-item">
                    <span className="detail-label">尺寸</span>
                    <span className="detail-value">
                      {details.width} × {details.height}
                    </span>
                  </div>
                )}
                {details.blurScore !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">清晰度</span>
                    <span
                      className={`detail-value ${
                        details.isBlurry ? "error" : ""
                      }`}
                    >
                      {details.blurScore.toFixed(1)}
                      {details.isBlurry && " (模糊)"}
                    </span>
                  </div>
                )}
                {details.isDuplicate && (
                  <div className="detail-item">
                    <span className="detail-label">状态</span>
                    <span className="detail-value warning">重复图片</span>
                  </div>
                )}
                {details.suspicionScore !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">可疑度</span>
                    <span
                      className={`detail-value ${getSuspicionClass(
                        details.suspicionLevel
                      )}`}
                    >
                      {details.suspicionScore} ({details.suspicionLevel})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSuspicionClass(level?: string): string {
  switch (level) {
    case "LOW":
      return "";
    case "MEDIUM":
      return "warning";
    case "HIGH":
      return "error";
    case "CRITICAL":
      return "critical";
    default:
      return "";
  }
}

// 懒加载图片预览
interface LazyImagePreviewProps extends ImagePreviewProps {
  lazy?: boolean;
}

export function LazyImagePreview({
  lazy = true,
  ...props
}: LazyImagePreviewProps) {
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  if (!shouldLoad) {
    return (
      <div
        className={`image-preview lazy-placeholder ${props.className}`}
        onClick={() => setShouldLoad(true)}
      >
        <div className="lazy-content">
          <span className="lazy-icon">🖼️</span>
          <span className="lazy-text">点击加载</span>
        </div>
      </div>
    );
  }

  return <ImagePreview {...props} />;
}

// 图片缩略图网格
interface ImageThumbnailGridProps {
  images: Array<{
    id: string;
    data: Uint8Array | number[];
    mimeType: string;
    position?: string;
    row?: number;
    column?: string;
    isBlurry?: boolean;
    isDuplicate?: boolean;
    suspicionLevel?: string;
  }>;
  onImageClick?: (image: any) => void;
}

export function ImageThumbnailGrid({
  images,
  onImageClick,
}: ImageThumbnailGridProps) {
  if (images.length === 0) {
    return <div className="no-images">暂无图片</div>;
  }

  return (
    <div className="thumbnail-grid">
      {images.map((image) => (
        <div
          key={image.id}
          className={`thumbnail-item ${getImageStatusClass(image)}`}
          onClick={() => onImageClick?.(image)}
        >
          <LazyImagePreview
            imageData={image.data}
            mimeType={image.mimeType}
            imageId={image.id}
            className="thumbnail-image"
          />
          <div className="thumbnail-info">
            <span className="thumbnail-id">{image.id}</span>
            {image.position && (
              <span className="thumbnail-pos">{image.position}</span>
            )}
          </div>
          {getImageStatusBadge(image)}
        </div>
      ))}
    </div>
  );
}

function getImageStatusClass(image: any): string {
  if (image.isBlurry) return "blur";
  if (image.isDuplicate) return "duplicate";
  if (image.suspicionLevel === "HIGH" || image.suspicionLevel === "CRITICAL")
    return "suspicious";
  return "";
}

function getImageStatusBadge(image: any): JSX.Element | null {
  if (image.isBlurry) {
    return <span className="thumbnail-badge blur">模糊</span>;
  }
  if (image.isDuplicate) {
    return <span className="thumbnail-badge duplicate">重复</span>;
  }
  if (image.suspicionLevel === "HIGH" || image.suspicionLevel === "CRITICAL") {
    return <span className="thumbnail-badge suspicious">可疑</span>;
  }
  return null;
}
