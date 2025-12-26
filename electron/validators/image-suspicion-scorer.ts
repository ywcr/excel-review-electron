// 📊 图片可疑度评分系统
// 采用0-100分制，提供灰度判断而非黑白二分
//
// 评分维度：
// - 尺寸/比例检测 (0-30分)
// - EXIF完整性检测 (0-25分)
// - 格式/压缩检测 (0-20分)
// - 视觉特征检测 (0-30分) ← 包括截图、边框、水印
// - 元数据一致性 (0-10分)
//
// 总分越高越可疑：
// 0-20:  正常 (绿色)
// 20-40: 可疑 (黄色)
// 40-60: 疑似异常 (橙色)
// 60+:   高度可疑 (红色)

// ====== 配置 ======

// 常见手机比例库（更全面）
const PHONE_ASPECT_RATIOS = [
  { ratio: 4/3, label: '4:3 (传统)', tolerance: 0.1, anomaly: 0 },
  { ratio: 3/4, label: '3:4 (传统竖屏)', tolerance: 0.1, anomaly: 0 },
  { ratio: 16/9, label: '16:9 (标准)', tolerance: 0.1, anomaly: 0 },
  { ratio: 9/16, label: '9:16 (标准竖屏)', tolerance: 0.1, anomaly: 0 },
  { ratio: 18/9, label: '18:9 (全面屏)', tolerance: 0.1, anomaly: 0 },
  { ratio: 9/18, label: '9:18 (全面屏竖屏)', tolerance: 0.1, anomaly: 0 },
  { ratio: 19.5/9, label: '19.5:9 (iPhone X)', tolerance: 0.1, anomaly: 0 },
  { ratio: 9/19.5, label: '9:19.5 (iPhone X竖屏)', tolerance: 0.1, anomaly: 0 },
  { ratio: 20/9, label: '20:9 (小米/OPPO)', tolerance: 0.1, anomaly: 0 },
  { ratio: 9/20, label: '9:20 (小米/OPPO竖屏)', tolerance: 0.1, anomaly: 0 },
  { ratio: 21/9, label: '21:9 (Sony)', tolerance: 0.12, anomaly: 0 },
  { ratio: 9/21, label: '9:21 (Sony竖屏)', tolerance: 0.12, anomaly: 0 },
  { ratio: 1, label: '1:1 (正方形)', tolerance: 0.05, anomaly: 3 }, // 略可疑
];

// 常见屏幕分辨率（用于截图检测）
const COMMON_SCREEN_RESOLUTIONS = [
  // 显示器截图
  { width: 1920, height: 1080, label: '1080p显示器截图', anomaly: 20 },
  { width: 2560, height: 1440, label: '2K显示器截图', anomaly: 20 },
  { width: 3840, height: 2160, label: '4K显示器截图', anomaly: 20 },
  { width: 1366, height: 768, label: '笔记本屏幕截图', anomaly: 20 },
  { width: 1280, height: 720, label: '720p屏幕截图', anomaly: 20 },
  { width: 1440, height: 900, label: 'Mac笔记本截图', anomaly: 20 },
  { width: 2880, height: 1800, label: 'MacBook Pro截图', anomaly: 20 },
  // 手机截图（允许，但标记）
  { width: 1080, height: 1920, label: '手机全屏截图', anomaly: 5 },
  { width: 1080, height: 2340, label: '全面屏手机截图', anomaly: 5 },
  { width: 1125, height: 2436, label: 'iPhone X截图', anomaly: 5 },
  { width: 1170, height: 2532, label: 'iPhone 12/13截图', anomaly: 5 },
];

// ====== 核心评分函数 ======

/**
 * 计算图片可疑度总分
 * @param {Object} params - 图片信息
 * @returns {Object} 评分结果
 */
function calculateImageSuspicionScore({
  width,
  height,
  megapixels,
  mimeType,
  sizeBytes,
  exif,
  hasBorder,
  borderSides,
  borderWidth,
  hasWatermark,
  watermarkRegions,
  watermarkConfidence
}) {
  let totalScore = 0;
  const factors = [];

  // === 1. 尺寸/比例检测 (0-30分) ===
  const dimensionResult = evaluateDimensions(width, height, megapixels);
  totalScore += dimensionResult.score;
  factors.push(...dimensionResult.factors);

  // === 2. EXIF完整性检测 (0-25分) ===
  const exifResult = evaluateExif(exif);
  totalScore += exifResult.score;
  factors.push(...exifResult.factors);

  // === 3. 格式/压缩检测 (0-20分) ===
  const formatResult = evaluateFormat(mimeType, sizeBytes, megapixels);
  totalScore += formatResult.score;
  factors.push(...formatResult.factors);

  // === 4. 视觉特征检测 (0-30分)：截图、边框、水印 ===
  const visualResult = evaluateVisualFeatures(width, height, hasBorder, borderSides, borderWidth, hasWatermark, watermarkRegions, watermarkConfidence);
  totalScore += visualResult.score;
  factors.push(...visualResult.factors);

  // === 5. 元数据一致性检测 (0-10分) ===
  const consistencyResult = evaluateConsistency(width, height, megapixels, exif, sizeBytes);
  totalScore += consistencyResult.score;
  factors.push(...consistencyResult.factors);

  // 计算等级
  const level = getSuspicionLevel(totalScore);

  return {
    suspicionScore: Math.round(totalScore),
    suspicionLevel: level.level,
    suspicionLabel: level.label,
    suspicionColor: level.color,
    factors: factors.filter(f => f) // 移除空因素
  };
}

/**
 * 根据分数获取可疑度等级
 */
function getSuspicionLevel(score) {
  if (score < 20) return { level: 'LOW', label: '正常', color: 'green' };
  if (score < 40) return { level: 'MEDIUM', label: '可疑', color: 'yellow' };
  if (score < 60) return { level: 'HIGH', label: '疑似异常', color: 'orange' };
  return { level: 'CRITICAL', label: '高度可疑', color: 'red' };
}

// ====== 各维度评分函数 ======

/**
 * 1. 尺寸/比例评分 (0-30分)
 */
function evaluateDimensions(width, height, megapixels) {
  let score = 0;
  const factors = [];

  const longSide = Math.max(width || 0, height || 0);
  const shortSide = Math.min(width || 0, height || 0);
  const aspect = shortSide > 0 ? longSide / shortSide : 0;

  // 比例检测：灰度评分
  const aspectResult = getAspectAnomalyScore(aspect);
  score += aspectResult.score;
  if (aspectResult.reason) factors.push(aspectResult.reason);

  // 分辨率检测：阶梯评分
  const resolutionResult = getResolutionAnomalyScore(shortSide, longSide, megapixels);
  score += resolutionResult.score;
  if (resolutionResult.reason) factors.push(resolutionResult.reason);

  return { score, factors };
}

/**
 * 比例异常评分
 */
function getAspectAnomalyScore(aspect) {
  if (!aspect || aspect === 0) return { score: 0, reason: null };

  // 查找最接近的比例
  let minDiff = Infinity;
  let matchedAspect = null;

  for (const aspectDef of PHONE_ASPECT_RATIOS) {
    const diff = Math.abs(aspect - aspectDef.ratio);
    const threshold = aspectDef.tolerance * aspectDef.ratio;

    if (diff < minDiff) {
      minDiff = diff;
      matchedAspect = aspectDef;
    }

    // 在容差范围内
    if (diff <= threshold) {
      return { 
        score: aspectDef.anomaly, 
        reason: aspectDef.anomaly > 0 ? `比例${aspectDef.label}` : null
      };
    }
  }

  // 没有匹配任何常见比例
  if (minDiff > 0.3) {
    return {
      score: 15,
      reason: `罕见比例${aspect.toFixed(2)}:1`
    };
  } else {
    return {
      score: 8,
      reason: `非标准比例${aspect.toFixed(2)}:1 (接近${matchedAspect.label})`
    };
  }
}

/**
 * 分辨率异常评分（阶梯制）
 */
function getResolutionAnomalyScore(shortSide, longSide, megapixels) {
  const mp = megapixels || 0;

  if (mp >= 2.0) {
    return { score: 0, reason: null }; // 正常
  } else if (mp >= 1.0) {
    return { score: 5, reason: `像素偏低(${mp.toFixed(1)}MP)` };
  } else if (mp >= 0.5) {
    return { score: 10, reason: `像素较低(${mp.toFixed(1)}MP)` };
  } else if (mp > 0) {
    return { score: 15, reason: `像素过低(${mp.toFixed(2)}MP)` };
  }
  return { score: 0, reason: null };
}

/**
 * 2. EXIF完整性评分 (0-25分)
 */
function evaluateExif(exif) {
  let score = 0;
  const factors = [];

  // 无EXIF：中度可疑（考虑到微信等会剥离）
  if (!exif || !exif.hasExif) {
    score += 12;
    factors.push('无EXIF信息');
  }
  // 有EXIF但不完整：略可疑
  else if (!exif.make || !exif.model || !exif.dateTimeOriginal) {
    score += 8;
    factors.push('EXIF不完整');
  }
  // 有完整EXIF：检查真实性
  else {
    const authenticity = checkExifAuthenticity(exif);
    score += authenticity.score;
    if (authenticity.reason) factors.push(authenticity.reason);
  }

  // 编辑软件标签：分级处理
  if (exif && exif.software) {
    const softwareRisk = assessSoftwareRisk(exif.software);
    score += softwareRisk.score;
    if (softwareRisk.reason) factors.push(softwareRisk.reason);
  }

  return { score, factors };
}

/**
 * 检查EXIF真实性
 */
function checkExifAuthenticity(exif) {
  const exifString = JSON.stringify(exif);

  // 异常时间（Unix元年等）
  if (/1970:01:01|1980:01:01/.test(exifString)) {
    return { score: 10, reason: 'EXIF时间异常' };
  }

  // 异常值（Unknown、全0等）
  if (/Unknown|^0+$/.test(exifString)) {
    return { score: 8, reason: 'EXIF值异常' };
  }

  return { score: 0, reason: null };
}

/**
 * 评估软件风险
 */
function assessSoftwareRisk(software) {
  // 专业编辑软件：高风险
  if (/photoshop|illustrator|gimp|lightroom/i.test(software)) {
    return { score: 10, reason: `专业编辑软件:${software.slice(0,20)}` };
  }
  // 美化软件：中风险
  if (/meitu|美图|picsart|vsco/i.test(software)) {
    return { score: 5, reason: `美化软件:${software.slice(0,20)}` };
  }
  // 社交软件：低风险
  if (/wechat|微信|qq|instagram|facebook/i.test(software)) {
    return { score: 2, reason: '社交软件处理' };
  }
  return { score: 0, reason: null };
}

/**
 * 3. 格式/压缩评分 (0-20分)
 */
function evaluateFormat(mimeType, sizeBytes, megapixels) {
  let score = 0;
  const factors = [];

  // 格式检测
  if (/gif/i.test(mimeType || '')) {
    score += 12;
    factors.push('GIF格式(动图)');
  } else if (/webp/i.test(mimeType || '')) {
    score += 5;
    factors.push('WebP格式');
  } else if (/png/i.test(mimeType || '') && (megapixels || 0) < 1) {
    score += 6;
    factors.push('小像素PNG');
  }

  // 压缩强度
  if (megapixels && megapixels > 0 && sizeBytes) {
    const kbPerMP = (sizeBytes / 1024) / megapixels;
    if (megapixels < 1.0 && kbPerMP < 120) {
      score += 8;
      factors.push(`强压缩(${kbPerMP.toFixed(0)}KB/MP)`);
    } else if (kbPerMP > 1000) {
      score += 3;
      factors.push(`低压缩(${kbPerMP.toFixed(0)}KB/MP,可能未优化)`);
    }
  }

  return { score, factors };
}

/**
 * 4. 视觉特征评分 (0-30分)
 * 包括截图、边框、水印检测
 */
function evaluateVisualFeatures(width, height, hasBorder, borderSides, borderWidth, hasWatermark, watermarkRegions, watermarkConfidence) {
  let score = 0;
  const factors = [];

  // 截图检测 (0-20分)
  const screenshotCheck = detectScreenshot(width, height);
  if (screenshotCheck.isScreenshot) {
    score += screenshotCheck.anomaly;
    factors.push(screenshotCheck.reason);
  }

  // 边框检测 (0-8分)
  if (hasBorder && borderSides && borderSides.length > 0) {
    score += 8;
    const borderDesc = borderSides.map((side) => {
      const sideNames = { top: '上', bottom: '下', left: '左', right: '右' };
      const width = borderWidth?.[side];
      return `${sideNames[side] || side}${width ? `(${width}px)` : ''}`;
    }).join('、');
    factors.push(`存在边框: ${borderDesc}`);
  }

  // 水印检测 (0-15分)
  if (hasWatermark && watermarkRegions && watermarkRegions.length > 0) {
    const watermarkScore = evaluateWatermark(watermarkRegions, watermarkConfidence);
    score += watermarkScore.score;
    if (watermarkScore.reason) {
      factors.push(watermarkScore.reason);
    }
  }

  return { score, factors };
}

/**
 * 截图检测
 */
function detectScreenshot(width, height) {
  for (const res of COMMON_SCREEN_RESOLUTIONS) {
    if ((width === res.width && height === res.height) ||
        (width === res.height && height === res.width)) {
      return {
        isScreenshot: true,
        anomaly: res.anomaly,
        reason: `疑似${res.label}(${width}x${height})`
      };
    }
  }

  return { isScreenshot: false, anomaly: 0, reason: null };
}

/**
 * 水印检测评分 (0-15分)
 */
function evaluateWatermark(watermarkRegions, watermarkConfidence) {
  const regionCount = watermarkRegions.length;
  const confidence = watermarkConfidence || 0;
  let score = 0;
  let reason = '';

  // 根据检测到的水印区域数量评分
  if (regionCount >= 3) {
    // 3个或以上区域有水印：高度可疑
    score = 12;
    const regionNames = {
      topLeft: '左上',
      topRight: '右上',
      leftMiddle: '左中',
      rightMiddle: '右中',
      bottomLeft: '左下',
      bottomRight: '右下',
      centerBottom: '底部中间'
    };
    const regionsDesc = watermarkRegions.map(r => regionNames[r] || r).join('、');
    reason = `多处水印(${regionsDesc})`;
  } else if (regionCount === 2) {
    // 2个区域有水印：中度可疑
    score = 8;
    const regionNames = {
      topLeft: '左上',
      topRight: '右上',
      leftMiddle: '左中',
      rightMiddle: '右中',
      bottomLeft: '左下',
      bottomRight: '右下',
      centerBottom: '底部中间'
    };
    const regionsDesc = watermarkRegions.map(r => regionNames[r] || r).join('、');
    reason = `两处水印(${regionsDesc})`;
  } else if (regionCount === 1) {
    // 1个区域有水印：低度可疑
    score = 5;
    const regionNames = {
      topLeft: '左上角',
      topRight: '右上角',
      leftMiddle: '左中',
      rightMiddle: '右中',
      bottomLeft: '左下角',
      bottomRight: '右下角',
      centerBottom: '底部中间'
    };
    const regionDesc = regionNames[watermarkRegions[0]] || watermarkRegions[0];
    reason = `边缘水印(${regionDesc})`;
  }

  // 根据置信度调整分数
  if (confidence > 0.8) {
    score = Math.min(15, score + 3); // 高置信度，额外加分
  } else if (confidence < 0.5) {
    score = Math.max(0, score - 2); // 低置信度，减分
  }

  return { score, reason };
}

/**
 * 5. 元数据一致性评分 (0-10分)
 */
function evaluateConsistency(width, height, megapixels, exif, sizeBytes) {
  let score = 0;
  const factors = [];

  // 尺寸与EXIF声称的机型不一致
  if (exif && exif.model && exif.make) {
    const expectedResolution = getExpectedResolution(exif.make, exif.model);
    if (expectedResolution) {
      const actualMP = megapixels || ((width * height) / 1_000_000);
      const expectedMP = expectedResolution.megapixels;

      if (Math.abs(actualMP - expectedMP) > expectedMP * 0.5) {
        score += 10;
        factors.push(`分辨率与${exif.model}不符(实际${actualMP.toFixed(1)}MP vs 预期${expectedMP}MP)`);
      }
    }
  }

  return { score, factors };
}

/**
 * 获取设备预期分辨率（简化数据库）
 */
function getExpectedResolution(make, model) {
  const deviceDatabase = {
    'Apple': {
      'iPhone 14 Pro': { megapixels: 48 },
      'iPhone 13 Pro': { megapixels: 12 },
      'iPhone 13': { megapixels: 12 },
      'iPhone 12': { megapixels: 12 },
      'iPhone 11': { megapixels: 12 },
      'iPhone X': { megapixels: 12 },
      'iPhone 8': { megapixels: 12 },
    },
    'Samsung': {
      'Galaxy S23': { megapixels: 50 },
      'Galaxy S22': { megapixels: 50 },
      'Galaxy S21': { megapixels: 12 },
    },
    'Xiaomi': {
      'Mi 12': { megapixels: 50 },
      'Mi 11': { megapixels: 108 },
    }
  };

  return deviceDatabase[make]?.[model];
}

// ====== 导出（在Worker中可用） ======
if (typeof self !== 'undefined') {
  self.calculateImageSuspicionScore = calculateImageSuspicionScore;
  self.getSuspicionLevel = getSuspicionLevel;
}
