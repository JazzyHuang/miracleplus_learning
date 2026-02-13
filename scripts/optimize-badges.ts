/**
 * 徽章 SVG → PNG 优化脚本
 *
 * 将大尺寸 SVG 徽章（内嵌 base64 位图）转为优化后的多尺寸 PNG。
 *
 * 用法: npx tsx scripts/optimize-badges.ts
 */

import sharp from 'sharp';
import { readdir, readFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';

const ROOT = process.cwd();
const OUTPUT_DIR = join(ROOT, 'public/badges');

const SIZES = [64, 128, 256] as const;

interface BadgeSource {
  /** 源 SVG 目录 */
  srcDir: string;
  /** 输出子目录 */
  outSubDir: string;
  /** 文件名映射: SVG 文件名(不含扩展名) → 输出文件名前缀 */
  nameMap: Record<string, string>;
}

const SOURCES: BadgeSource[] = [
  {
    srcDir: join(ROOT, '勋章等级(1)'),
    outSubDir: 'levels',
    nameMap: {
      'AI观察员': 'ai-observer',
      'AI实践家': 'ai-practitioner',
      'AI领航员': 'ai-navigator',
    },
  },
  {
    srcDir: join(ROOT, '成就徽章系统'),
    outSubDir: 'achievements',
    nameMap: {
      '全勤王': 'perfect-attendance',
      '热心助人': 'helpful',
      '社交达人': 'social-star',
      '提问达人': 'question-master',
      '工具达人': 'tool-master',
      '笔记达人': 'note-master',
    },
  },
];

async function optimizeBadges() {
  for (const source of SOURCES) {
    const outDir = join(OUTPUT_DIR, source.outSubDir);
    await mkdir(outDir, { recursive: true });

    const files = await readdir(source.srcDir);
    const svgFiles = files.filter(f => f.endsWith('.svg'));

    for (const file of svgFiles) {
      const nameWithoutExt = basename(file, '.svg');
      const outputPrefix = source.nameMap[nameWithoutExt];

      if (!outputPrefix) {
        console.warn(`⚠️  跳过未映射的文件: ${file}`);
        continue;
      }

      const svgPath = join(source.srcDir, file);
      const svgBuffer = await readFile(svgPath);

      console.log(`📦 处理: ${file} (${(svgBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

      for (const size of SIZES) {
        const outputPath = join(outDir, `${outputPrefix}-${size}.png`);

        await sharp(svgBuffer, { density: 300 })
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ quality: 90, compressionLevel: 9 })
          .toFile(outputPath);

        const { size: fileSize } = await sharp(outputPath).metadata().then(() =>
          import('fs/promises').then(fs => fs.stat(outputPath))
        );

        console.log(`  ✅ ${outputPrefix}-${size}.png (${(fileSize / 1024).toFixed(1)}KB)`);
      }
    }
  }

  console.log('\n🎉 所有徽章优化完成!');
}

optimizeBadges().catch(err => {
  console.error('❌ 优化失败:', err);
  process.exit(1);
});
