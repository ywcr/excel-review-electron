import { useState, useCallback, useEffect } from "react";
import { DuplicateCompareModal } from "./DuplicateCompareModal";

interface DuplicateMatch {
  newImage: { path: string; name: string };
  libraryImage: { path: string; name: string };
  similarity: number;
  hammingDistance: number;
}

interface CompareResult {
  totalNewImages: number;
  totalLibraryImages: number;
  duplicates: DuplicateMatch[];
  uniqueCount: number;
  durationMs: number;
}

export function FolderCompare() {
  // 文件夹状态
  const [libraryPath, setLibraryPath] = useState("");
  const [newImagesPath, setNewImagesPath] = useState("");
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [newCount, setNewCount] = useState<number | null>(null);

  // 对比状态
  const [isComparing, setIsComparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 缩略图缓存
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());

  // 对比弹窗状态
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedDuplicateIndex, setSelectedDuplicateIndex] = useState(0);
  const [modalImages, setModalImages] = useState<{
    left: { imageData: string; position: string; imageIndex: number };
    right: { imageData: string; position: string; imageIndex: number };
  } | null>(null);

  // 监听进度更新
  useEffect(() => {
    window.electron.onProgress((data) => {
      setProgress(data.progress);
      setProgressMessage(data.message);
    });

    return () => {
      window.electron.removeProgressListener();
    };
  }, []);

  // 选择图片库文件夹
  const handleSelectLibrary = useCallback(async () => {
    const path = await window.electron.selectFolder();
    if (path) {
      setLibraryPath(path);
      setLibraryCount(null);
      setResult(null);
      
      // 扫描文件夹
      const scanResult = await window.electron.scanFolderImages(path);
      if (scanResult.success) {
        setLibraryCount(scanResult.data.imageCount);
      }
    }
  }, []);

  // 选择待验证文件夹
  const handleSelectNewImages = useCallback(async () => {
    const path = await window.electron.selectFolder();
    if (path) {
      setNewImagesPath(path);
      setNewCount(null);
      setResult(null);
      
      // 扫描文件夹
      const scanResult = await window.electron.scanFolderImages(path);
      if (scanResult.success) {
        setNewCount(scanResult.data.imageCount);
      }
    }
  }, []);

  // 开始对比
  const handleCompare = useCallback(async () => {
    if (!libraryPath || !newImagesPath) {
      setError("请先选择两个文件夹");
      return;
    }

    setIsComparing(true);
    setProgress(0);
    setProgressMessage("正在准备...");
    setError(null);
    setResult(null);

    try {
      const compareResult = await window.electron.compareFolders(libraryPath, newImagesPath);
      
      if (compareResult.success) {
        setResult(compareResult.data);
      } else {
        setError(compareResult.error || "对比失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "对比过程中发生错误");
    } finally {
      setIsComparing(false);
    }
  }, [libraryPath, newImagesPath]);

  // 加载缩略图
  const loadThumbnail = useCallback(async (imagePath: string): Promise<string> => {
    if (thumbnailCache.has(imagePath)) {
      return thumbnailCache.get(imagePath)!;
    }

    const result = await window.electron.getImageThumbnail(imagePath);
    if (result.success && result.data) {
      setThumbnailCache((prev) => new Map(prev).set(imagePath, result.data));
      return result.data;
    }
    return "";
  }, [thumbnailCache]);

  // 查看对比详情
  const handleViewCompare = useCallback(async (index: number) => {
    if (!result) return;

    const dup = result.duplicates[index];
    setSelectedDuplicateIndex(index);

    // 加载缩略图
    const [leftThumb, rightThumb] = await Promise.all([
      loadThumbnail(dup.newImage.path),
      loadThumbnail(dup.libraryImage.path),
    ]);

    setModalImages({
      left: {
        imageData: leftThumb,
        position: dup.newImage.name,
        imageIndex: index,
      },
      right: {
        imageData: rightThumb,
        position: dup.libraryImage.name,
        imageIndex: index,
      },
    });
    setShowCompareModal(true);
  }, [result, loadThumbnail]);

  // 弹窗导航
  const handleModalPrev = useCallback(async () => {
    if (selectedDuplicateIndex > 0) {
      await handleViewCompare(selectedDuplicateIndex - 1);
    }
  }, [selectedDuplicateIndex, handleViewCompare]);

  const handleModalNext = useCallback(async () => {
    if (result && selectedDuplicateIndex < result.duplicates.length - 1) {
      await handleViewCompare(selectedDuplicateIndex + 1);
    }
  }, [result, selectedDuplicateIndex, handleViewCompare]);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">📁 文件夹图片重复检测</h2>
        <p className="text-sm text-zinc-500 mt-1">
          比较两个文件夹中的图片，检测是否存在重复
        </p>
      </div>

      {/* 文件夹选择区域 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 图片库 */}
        <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📚</span>
            <span className="font-semibold text-zinc-900">图片库</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={libraryPath}
              readOnly
              placeholder="选择图片库文件夹..."
              className="flex-1 px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 truncate"
            />
            <button
              onClick={handleSelectLibrary}
              disabled={isComparing}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              选择
            </button>
          </div>
          {libraryCount !== null && (
            <p className="text-xs text-zinc-500 mt-2">
              已扫描 <span className="font-semibold text-zinc-700">{libraryCount}</span> 张图片
            </p>
          )}
        </div>

        {/* 待验证 */}
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📷</span>
            <span className="font-semibold text-zinc-900">待验证图片</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newImagesPath}
              readOnly
              placeholder="选择待验证文件夹..."
              className="flex-1 px-3 py-2 text-sm bg-white border border-amber-200 rounded-lg text-zinc-700 truncate"
            />
            <button
              onClick={handleSelectNewImages}
              disabled={isComparing}
              className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              选择
            </button>
          </div>
          {newCount !== null && (
            <p className="text-xs text-zinc-500 mt-2">
              待验证 <span className="font-semibold text-amber-700">{newCount}</span> 张图片
            </p>
          )}
        </div>
      </div>

      {/* 开始对比按钮 */}
      <div className="flex justify-center">
        <button
          onClick={handleCompare}
          disabled={isComparing || !libraryPath || !newImagesPath}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          {isComparing ? (
            <>
              <span className="animate-spin">⏳</span>
              对比中...
            </>
          ) : (
            <>
              <span>🔍</span>
              开始对比
            </>
          )}
        </button>
      </div>

      {/* 进度条 */}
      {isComparing && (
        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
          <div className="flex justify-between text-sm text-zinc-600 mb-2">
            <span>{progressMessage}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          ❌ {error}
        </div>
      )}

      {/* 对比结果 */}
      {result && (
        <div className="space-y-4">
          {/* 统计概要 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-50 rounded-xl p-4 text-center border border-zinc-200">
              <div className="text-2xl font-bold text-zinc-900">{result.totalLibraryImages}</div>
              <div className="text-xs text-zinc-500">图片库</div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-4 text-center border border-zinc-200">
              <div className="text-2xl font-bold text-zinc-900">{result.totalNewImages}</div>
              <div className="text-xs text-zinc-500">待验证</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
              <div className="text-2xl font-bold text-red-600">{result.duplicates.length}</div>
              <div className="text-xs text-red-500">重复</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-600">{result.uniqueCount}</div>
              <div className="text-xs text-emerald-500">无重复</div>
            </div>
          </div>

          {/* 重复列表 */}
          {result.duplicates.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  <span>🔴</span>
                  发现 {result.duplicates.length} 张重复图片
                </h3>
              </div>
              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
                {result.duplicates.map((dup, idx) => (
                  <div
                    key={idx}
                    className="px-5 py-3 hover:bg-zinc-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">📷</span>
                        <span className="font-medium text-zinc-900 truncate">
                          {dup.newImage.name}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-500 mt-1 ml-6 truncate">
                        ↳ 与图片库中 <span className="text-zinc-700">{dup.libraryImage.name}</span> 重复
                        <span className="ml-2 text-amber-600">(相似度 {dup.similarity}%)</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewCompare(idx)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>👁</span>
                      查看对比
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无重复提示 */}
          {result.duplicates.length === 0 && (
            <div className="bg-emerald-50 text-emerald-700 px-5 py-4 rounded-xl border border-emerald-200 text-center">
              <span className="text-2xl">✅</span>
              <p className="font-semibold mt-2">所有图片均无重复</p>
              <p className="text-sm text-emerald-600 mt-1">
                共检查 {result.totalNewImages} 张待验证图片
              </p>
            </div>
          )}

          {/* 耗时 */}
          <div className="text-center text-sm text-zinc-400">
            对比耗时: {(result.durationMs / 1000).toFixed(1)} 秒
          </div>
        </div>
      )}

      {/* 对比弹窗 */}
      {showCompareModal && modalImages && (
        <DuplicateCompareModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          leftImage={modalImages.left}
          rightImage={modalImages.right}
          currentIndex={selectedDuplicateIndex}
          totalCount={result?.duplicates.length || 0}
          onPrev={handleModalPrev}
          onNext={handleModalNext}
        />
      )}
    </div>
  );
}
