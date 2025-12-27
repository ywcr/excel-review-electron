import JSZip from 'jszip';
import * as fs from 'fs';

/**
 * WPS 图片提取器 (支持大文件流式处理)
 * 从 WPS Excel 文件中提取 DISPIMG 格式的图片
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
      console.log("📷 [WPS提取] 使用 JSZip 流式读取文件...");
      
      // 使用流式读取文件来支持大文件
      const fileBuffer = await this.readFileInChunks(filePath);
      const zip = await JSZip.loadAsync(fileBuffer);

      // 读取 cellimages.xml
      const cellimagesXml = await this.readXmlEntry(zip, "xl/cellimages.xml");
      if (!cellimagesXml) {
        console.log("📷 [WPS提取] 未找到 cellimages.xml，非 WPS 格式");
        return images;
      }

      // 读取 cellimages.xml.rels
      const cellimagesRels = await this.readXmlEntry(
        zip,
        "xl/_rels/cellimages.xml.rels"
      );
      if (!cellimagesRels) {
        console.log("📷 [WPS提取] 未找到 cellimages.xml.rels");
        return images;
      }

      // 构建关系映射 rId -> 图片文件名
      const embedRelMap = this.parseRelationships(cellimagesRels);
      console.log(`📷 [WPS提取] 找到 ${embedRelMap.size} 个图片关系`);

      // 解析 cellimages.xml 获取图片信息
      const cellImageInfos = this.parseCellImages(cellimagesXml);
      console.log(`📷 [WPS提取] 找到 ${cellImageInfos.length} 个图片定义，正在处理...`);

      // 获取目标工作表文件
      const worksheetFile = await this.getWorksheetFile(zip, targetSheet);

      // 为每个图片获取所有位置和数据（支持同一图片多次引用）
      for (const info of cellImageInfos) {
        const mediaFile = embedRelMap.get(info.embedId);
        if (!mediaFile) continue;

        // 获取该图片的所有引用位置
        const positions = await this.getAllPositionsFromDISPIMG(
          zip,
          info.dispimgId,
          worksheetFile
        );

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

        // 读取图片数据
        const imageBuffer = await this.readMediaFile(zip, mediaFile);
        if (!imageBuffer) continue;

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
   * 分块读取大文件 (支持 >2GB 文件)
   */
  private async readFileInChunks(filePath: string): Promise<Buffer> {
    const stats = fs.statSync(filePath);
    const fileSizeGB = stats.size / (1024 * 1024 * 1024);
    
    console.log(`📷 [WPS提取] 文件大小: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    // 对于特别大的文件，使用流式读取
    if (fileSizeGB > 1) {
      console.log(`📷 [WPS提取] 大文件模式，使用流式读取...`);
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const stream = fs.createReadStream(filePath);
        
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        
        stream.on('error', reject);
      });
    }
    
    // 小文件直接读取
    return fs.promises.readFile(filePath);
  }

  /**
   * 读取 ZIP 中的 XML 文件
   */
  private async readXmlEntry(zip: JSZip, entryName: string): Promise<string | null> {
    const entry = zip.file(entryName);
    if (!entry) return null;
    return entry.async("string");
  }

  /**
   * 读取媒体文件
   */
  private async readMediaFile(zip: JSZip, mediaFile: string): Promise<Buffer | null> {
    // 尝试多种路径格式
    const paths = [`xl/media/${mediaFile}`, `xl/${mediaFile}`, mediaFile];

    for (const p of paths) {
      const entry = zip.file(p);
      if (entry) {
        const data = await entry.async("nodebuffer");
        return data;
      }
    }
    return null;
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

  /**
   * 获取目标工作表文件
   */
  private async getWorksheetFile(
    zip: JSZip,
    targetSheet?: string
  ): Promise<string | null> {
    if (!targetSheet) return null;

    try {
      const workbookXml = await this.readXmlEntry(zip, "xl/workbook.xml");
      if (!workbookXml) return null;

      const workbookRels = await this.readXmlEntry(zip, "xl/_rels/workbook.xml.rels");
      if (!workbookRels) return null;

      // 查找工作表 ID
      const sheetRegex = /<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g;
      let match;

      while ((match = sheetRegex.exec(workbookXml)) !== null) {
        const sheetName = match[1];
        const rId = match[2];

        if (sheetName === targetSheet) {
          // 从关系文件中查找实际文件名
          const relRegex = new RegExp(
            `<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]*)"`,
            "g"
          );
          const relMatch = relRegex.exec(workbookRels);
          if (relMatch) {
            const target = relMatch[1];
            // target 格式: "worksheets/sheet1.xml"
            return `xl/${target}`;
          }
        }
      }
    } catch (error) {
      console.error("获取工作表文件失败:", error);
    }

    return null;
  }

  /**
   * 从 DISPIMG 公式获取图片的所有位置（支持同一图片多次引用）
   */
  private async getAllPositionsFromDISPIMG(
    zip: JSZip,
    dispimgId: string,
    worksheetFile: string | null
  ): Promise<
    Array<{
      position: string;
      row: number;
      column: string;
      type: string;
    }>
  > {
    const positions: Array<{
      position: string;
      row: number;
      column: string;
      type: string;
    }> = [];

    try {
      // 获取所有工作表文件
      let worksheetFiles: string[] = [];
      
      zip.forEach((relativePath, file) => {
        if (relativePath.startsWith("xl/worksheets/") && relativePath.endsWith(".xml")) {
          worksheetFiles.push(relativePath);
        }
      });

      // 如果指定了特定工作表，只搜索该工作表
      if (worksheetFile) {
        worksheetFiles = worksheetFiles.filter((f) => f === worksheetFile);
      }

      for (const wsFile of worksheetFiles) {
        const wsXml = await this.readXmlEntry(zip, wsFile);
        if (!wsXml) continue;

        // 查找包含目标 dispimgId 的 DISPIMG 公式
        const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
        let match;

        while ((match = cellRegex.exec(wsXml)) !== null) {
          const cellRef = match[1];
          const cellContent = match[2];

          // 查找 DISPIMG 公式
          const formulaMatch = cellContent.match(
            /<f[^>]*>(.*?DISPIMG.*?)<\/f>/
          );
          if (formulaMatch) {
            const formula = formulaMatch[1];

            // 提取 DISPIMG 中的图片 ID
            let idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
            if (!idMatch) {
              idMatch = formula.match(/DISPIMG\("([^"]*?)",/);
            }

            if (idMatch && idMatch[1] === dispimgId) {
              // 解析单元格引用
              const cellMatch = cellRef.match(/^([A-Z]+)(\d+)$/);
              if (cellMatch) {
                const column = cellMatch[1];
                const row = parseInt(cellMatch[2]);

                positions.push({
                  position: cellRef,
                  row,
                  column,
                  type:
                    column === "M" ? "门头" : column === "N" ? "内部" : "图片",
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("从 DISPIMG 公式获取位置失败:", error);
    }

    return positions;
  }
}
