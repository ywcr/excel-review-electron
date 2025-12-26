import { useState, useEffect } from "react";

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
      <div className={`flex items-center justify-center bg-zinc-100 rounded animate-pulse ${className}`}>
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-50 text-red-500 text-xs rounded border border-red-100 p-2 ${className}`}>
        <span>⚠️</span>
        <span className="mt-1">加载失败</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`图片 ${imageId}`}
      className={`object-cover rounded border border-zinc-200 bg-white ${onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""} ${className}`}
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <span>📷</span> 图片详情
            </h3>
            <p className="text-sm text-zinc-500">
              {imageId} {position && <span className="bg-zinc-100 px-2 py-0.5 rounded text-xs ml-2">{position}</span>}
            </p>
          </div>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-0 bg-zinc-900 grid place-items-center relative group">
          <ImagePreview
            imageData={imageData}
            mimeType={mimeType}
            imageId={imageId}
            className="max-w-full max-h-full object-contain !border-0 !rounded-none"
          />
        </div>

        {details && (
          <div className="px-6 py-4 bg-white border-t border-zinc-100">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-3">图片分析数据</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {details.row && (
                <div className="bg-zinc-50 p-2 rounded">
                  <span className="text-[10px] text-zinc-400 block uppercase">行号</span>
                  <span className="text-sm font-mono text-zinc-700">{details.row}</span>
                </div>
              )}
              {details.column && (
                <div className="bg-zinc-50 p-2 rounded">
                  <span className="text-[10px] text-zinc-400 block uppercase">列号</span>
                  <span className="text-sm font-mono text-zinc-700">{details.column}</span>
                </div>
              )}
              {details.width && details.height && (
                <div className="bg-zinc-50 p-2 rounded">
                  <span className="text-[10px] text-zinc-400 block uppercase">尺寸</span>
                  <span className="text-sm font-mono text-zinc-700">
                    {details.width} × {details.height}
                  </span>
                </div>
              )}
              {details.blurScore !== undefined && (
                <div className={`p-2 rounded border ${details.isBlurry ? 'bg-red-50 border-red-100' : 'bg-zinc-50 border-zinc-100'}`}>
                  <span className={`text-[10px] block uppercase ${details.isBlurry ? 'text-red-400' : 'text-zinc-400'}`}>清晰度</span>
                  <span className={`text-sm font-mono ${details.isBlurry ? 'text-red-700 font-bold' : 'text-zinc-700'}`}>
                    {details.blurScore.toFixed(1)}
                    {details.isBlurry && " (模糊)"}
                  </span>
                </div>
              )}
              {details.isDuplicate && (
                <div className="p-2 rounded bg-amber-50 border border-amber-100">
                  <span className="text-[10px] text-amber-400 block uppercase">状态</span>
                  <span className="text-sm font-bold text-amber-700">重复图片</span>
                </div>
              )}
              {details.suspicionScore !== undefined && (
                <div className={`p-2 rounded border ${
                    details.suspicionLevel === 'HIGH' || details.suspicionLevel === 'CRITICAL' 
                    ? 'bg-red-50 border-red-100' 
                    : details.suspicionLevel === 'MEDIUM' 
                    ? 'bg-amber-50 border-amber-100' 
                    : 'bg-zinc-50 border-zinc-100'
                }`}>
                  <span className="text-[10px] text-zinc-400 block uppercase">可疑度</span>
                  <span className="text-sm font-mono text-zinc-700">
                    {details.suspicionScore} ({details.suspicionLevel})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
        className={`bg-zinc-50 border border-zinc-200 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors group ${props.className}`}
        onClick={() => setShouldLoad(true)}
      >
        <span className="text-2xl mb-1 opacity-50 group-hover:scale-110 transition-transform">🖼️</span>
        <span className="text-[10px] text-zinc-400 font-medium">点击加载</span>
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
    return <div className="p-8 text-center text-zinc-400 text-sm bg-zinc-50 rounded-lg border border-dashed border-zinc-200">暂无图片</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {images.map((image) => (
        <div
          key={image.id}
          className={`
            relative group rounded-lg overflow-hidden border transition-all cursor-pointer hover:shadow-md
            ${image.isBlurry ? 'border-red-200 bg-red-50/30' : 
              image.isDuplicate ? 'border-amber-200 bg-amber-50/30' : 
              image.suspicionLevel === "HIGH" || image.suspicionLevel === "CRITICAL" ? 'border-red-200 bg-red-50/30' :
              'border-zinc-200 bg-white'}
          `}
          onClick={() => onImageClick?.(image)}
        >
          <div className="aspect-square bg-zinc-100 overflow-hidden">
            <LazyImagePreview
              imageData={image.data}
              mimeType={image.mimeType}
              imageId={image.id}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="p-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-medium text-zinc-700 truncate" title={image.id}>{image.id}</span>
            </div>
            {image.position && (
              <span className="text-[10px] text-zinc-400 block mt-0.5">{image.position}</span>
            )}
          </div>

          {/* 状态角标 */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            {image.isBlurry && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded shadow-sm">模糊</span>
            )}
            {image.isDuplicate && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded shadow-sm">重复</span>
            )}
            {(image.suspicionLevel === "HIGH" || image.suspicionLevel === "CRITICAL") && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded shadow-sm">可疑</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
