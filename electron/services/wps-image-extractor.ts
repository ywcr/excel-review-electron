import * as yauzl from 'yauzl';
import * as fs from 'fs';

/**
 * WPS 图片提取器 (支持超大文件流式处理)
 * 使用 yauzl 流式读取 ZIP，无需将整个文件加载到内存
 */
export class WpsImageExtractor {
  /**
   * 从 Excel 文件中提取 WPS 格式的图片
   * @param filePath Excel 文件路径
   * @param targetSheet 目标工作表名称（可选）
   * @returns 图片数据数组
   */
  async extractImages(
    filePath: string,
    targetSheet?: string
  ): Promise<
    Array<{
      id: string;
      buffer: Buffer;
      position: string;
      row: number;
      column: string;
      type: string;
    }>
  > {
    const images: Array<{
      id: string;
      buffer: Buffer;
      position: string;
      row: number;
      column: string;
      type: string;
    }> = [];

    try {
      // 获取文件大小用于日志
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      console.log(`📷 [WPS提取] 使用 yauzl 流式读取文件 (${fileSizeMB.toFixed(2)} MB)...`);

      // 第一步：读取必要的 XML 配置文件
      const xmlFiles = await this.readXmlFiles(filePath);
      
      if (!xmlFiles.cellimagesXml) {
        console.log("📷 [WPS提取] 未找到 cellimages.xml，非 WPS 格式");
        return images;
      }

      if (!xmlFiles.cellimagesRels) {
        console.log("📷 [WPS提取] 未找到 cellimages.xml.rels");
        return images;
      }

      // 构建关系映射 rId -> 图片文件名
      const embedRelMap = this.parseRelationships(xmlFiles.cellimagesRels);
      console.log(`📷 [WPS提取] 找到 ${embedRelMap.size} 个图片关系`);

      // 解析 cellimages.xml 获取图片信息
      const cellImageInfos = this.parseCellImages(xmlFiles.cellimagesXml);
      console.log(`📷 [WPS提取] 找到 ${cellImageInfos.length} 个图片定义，正在处理...`);

      // 确定需要读取哪些图片文件
      const requiredMediaFiles = new Set<string>();
      for (const info of cellImageInfos) {
        const mediaFile = embedRelMap.get(info.embedId);
        if (mediaFile) {
          requiredMediaFiles.add(`xl/media/${mediaFile}`);
        }
      }

      // 第二步：读取需要的图片文件
      console.log(`📷 [WPS提取] 需要读取 ${requiredMediaFiles.size} 个图片文件...`);
      const mediaBuffers = await this.readMediaFiles(filePath, requiredMediaFiles);
      console.log(`📷 [WPS提取] 成功读取 ${mediaBuffers.size} 个图片文件`);

      // 获取目标工作表的 DISPIMG 位置
      const worksheetPositions = await this.getPositionsFromWorksheets(
        xmlFiles.worksheets,
        targetSheet
      );

      // 第三步：组装图片数据
      for (const info of cellImageInfos) {
        const mediaFile = embedRelMap.get(info.embedId);
        if (!mediaFile) continue;

        const mediaPath = `xl/media/${mediaFile}`;
        const imageBuffer = mediaBuffers.get(mediaPath);
        if (!imageBuffer) continue;

        // 获取该图片的所有引用位置
        const positions = worksheetPositions.get(info.dispimgId) || [];

        // 如果没有找到位置但指定了工作表，跳过
        if (positions.length === 0 && targetSheet) {
          continue;
        }

        // 如果没有找到位置，使用估算位置
        if (positions.length === 0) {
          positions.push({
            position: `?${images.length + 1}`,
            row: images.length + 1,
            column: "?",
            type: "图片",
          });
        }

        // 为每个引用位置创建一个图片条目
        for (const position of positions) {
          images.push({
            id: `${info.dispimgId}_${position.position}`,
            buffer: imageBuffer,
            position: position.position,
            row: position.row,
            column: position.column,
            type: position.type,
          });
        }

        // 如果同一图片有多个引用位置，记录日志
        if (positions.length > 1) {
          console.log(
            `📷 [WPS提取] 图片 ${info.dispimgId} 被引用 ${
              positions.length
            } 次: ${positions.map((p) => p.position).join(", ")}`
          );
        }
      }

      console.log(`📷 [WPS提取] 成功提取 ${images.length} 张图片`);
      return images;
    } catch (error) {
      console.error("📷 [WPS提取] 提取失败:", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return images;
    }
  }

  /**
   * 使用 yauzl 流式读取 ZIP 中的 XML 配置文件
   */
  private async readXmlFiles(filePath: string): Promise<{
    cellimagesXml: string | null;
    cellimagesRels: string | null;
    workbookXml: string | null;
    workbookRels: string | null;
    worksheets: Map<string, string>;
  }> {
    const result: {
      cellimagesXml: string | null;
      cellimagesRels: string | null;
      workbookXml: string | null;
      workbookRels: string | null;
      worksheets: Map<string, string>;
    } = {
      cellimagesXml: null,
      cellimagesRels: null,
      workbookXml: null,
      workbookRels: null,
      worksheets: new Map(),
    };

    const targetFiles = new Set([
      'xl/cellimages.xml',
      'xl/_rels/cellimages.xml.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
    ]);

    return new Promise((resolve, reject) => {
      yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }
        if (!zipfile) {
          reject(new Error('Failed to open ZIP file'));
          return;
        }

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;
          
          // 检查是否是我们需要的文件
          const isTargetFile = targetFiles.has(fileName) || 
            fileName.startsWith('xl/worksheets/') && fileName.endsWith('.xml');

          if (isTargetFile && !entry.fileName.endsWith('/')) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err || !readStream) {
                zipfile.readEntry();
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on('data', (chunk) => chunks.push(chunk));
              readStream.on('end', () => {
                const content = Buffer.concat(chunks).toString('utf-8');
                
                if (fileName === 'xl/cellimages.xml') {
                  result.cellimagesXml = content;
                } else if (fileName === 'xl/_rels/cellimages.xml.rels') {
                  result.cellimagesRels = content;
                } else if (fileName === 'xl/workbook.xml') {
                  result.workbookXml = content;
                } else if (fileName === 'xl/_rels/workbook.xml.rels') {
                  result.workbookRels = content;
                } else if (fileName.startsWith('xl/worksheets/')) {
                  result.worksheets.set(fileName, content);
                }

                zipfile.readEntry();
              });
              readStream.on('error', () => zipfile.readEntry());
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          resolve(result);
        });

        zipfile.on('error', (err) => {
          reject(err);
        });
      });
    });
  }

  /**
   * 使用 yauzl 流式读取指定的图片文件
   */
  private async readMediaFiles(
    filePath: string,
    requiredFiles: Set<string>
  ): Promise<Map<string, Buffer>> {
    const mediaBuffers = new Map<string, Buffer>();

    if (requiredFiles.size === 0) {
      return mediaBuffers;
    }

    return new Promise((resolve, reject) => {
      yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }
        if (!zipfile) {
          reject(new Error('Failed to open ZIP file'));
          return;
        }

        let processed = 0;
        const total = requiredFiles.size;

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;

          if (requiredFiles.has(fileName)) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err || !readStream) {
                processed++;
                zipfile.readEntry();
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on('data', (chunk) => chunks.push(chunk));
              readStream.on('end', () => {
                mediaBuffers.set(fileName, Buffer.concat(chunks));
                processed++;
                
                // 进度日志
                if (processed % 50 === 0 || processed === total) {
                  console.log(`📷 [WPS提取] 读取图片进度: ${processed}/${total}`);
                }

                zipfile.readEntry();
              });
              readStream.on('error', () => {
                processed++;
                zipfile.readEntry();
              });
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          resolve(mediaBuffers);
        });

        zipfile.on('error', (err) => {
          reject(err);
        });
      });
    });
  }

  /**
   * 从工作表 XML 中提取 DISPIMG 位置映射
   */
  private async getPositionsFromWorksheets(
    worksheets: Map<string, string>,
    targetSheet?: string
  ): Promise<Map<string, Array<{ position: string; row: number; column: string; type: string }>>> {
    const positionsMap = new Map<string, Array<{ position: string; row: number; column: string; type: string }>>();

    for (const [fileName, xml] of worksheets) {
      // 如果指定了目标工作表，可以在这里过滤
      // 目前先处理所有工作表

      // 查找包含 DISPIMG 公式的单元格
      const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
      let match;

      while ((match = cellRegex.exec(xml)) !== null) {
        const cellRef = match[1];
        const cellContent = match[2];

        // 查找 DISPIMG 公式
        const formulaMatch = cellContent.match(/<f[^>]*>(.*?DISPIMG.*?)<\/f>/);
        if (formulaMatch) {
          const formula = formulaMatch[1];

          // 提取 DISPIMG 中的图片 ID
          let idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
          if (!idMatch) {
            idMatch = formula.match(/DISPIMG\("([^"]*?)",/);
          }

          if (idMatch) {
            const dispimgId = idMatch[1];
            
            // 解析单元格引用
            const cellMatch = cellRef.match(/^([A-Z]+)(\d+)$/);
            if (cellMatch) {
              const column = cellMatch[1];
              const row = parseInt(cellMatch[2]);

              if (!positionsMap.has(dispimgId)) {
                positionsMap.set(dispimgId, []);
              }

              positionsMap.get(dispimgId)!.push({
                position: cellRef,
                row,
                column,
                type: column === "M" ? "门头" : column === "N" ? "内部" : "图片",
              });
            }
          }
        }
      }
    }

    return positionsMap;
  }

  /**
   * 解析关系文件
   */
  private parseRelationships(xml: string): Map<string, string> {
    const map = new Map<string, string>();
    const regex = /<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      const id = match[1];
      const target = match[2];
      // target 格式: "media/image1.jpeg"
      const basename = target.replace(/^.*\//, "");
      map.set(id, basename);
    }

    return map;
  }

  /**
   * 解析 cellimages.xml
   */
  private parseCellImages(
    xml: string
  ): Array<{ dispimgId: string; embedId: string }> {
    const results: Array<{ dispimgId: string; embedId: string }> = [];

    // 匹配 cellImage 元素
    const cellImageRegex =
      /<(?:etc:)?cellImage[^>]*name="([^"]*)"[^>]*>[\s\S]*?<a:blip[^>]*r:embed="([^"]*)"/g;
    let match;

    while ((match = cellImageRegex.exec(xml)) !== null) {
      results.push({
        dispimgId: match[1],
        embedId: match[2],
      });
    }

    // 备用匹配方式
    if (results.length === 0) {
      const altRegex =
        /<(?:etc:)?cellImage[^>]*>[\s\S]*?<a:blip[^>]*r:embed="([^"]*)"[\s\S]*?<\/(?:etc:)?cellImage>/g;
      const nameRegex = /name="([^"]*)"/;

      let cellMatch;
      while ((cellMatch = altRegex.exec(xml)) !== null) {
        const embedId = cellMatch[1];
        const nameMatch = cellMatch[0].match(nameRegex);
        const dispimgId = nameMatch ? nameMatch[1] : `image_${results.length}`;
        results.push({ dispimgId, embedId });
      }
    }

    return results;
  }
}
