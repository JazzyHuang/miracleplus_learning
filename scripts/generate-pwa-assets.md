# PWA 资源生成指南

## 概述

本项目使用 SVG 图标作为主要图标格式，这样可以在所有分辨率下保持清晰。
如果需要生成 PNG 格式的图标（用于兼容旧设备），请按照以下步骤操作。

## 已有资源

- `/public/icon.svg` - 主应用图标（512x512）
- `/public/favicon.svg` - 网站图标（32x32）
- `/public/og-default.svg` - 社交分享图（1200x630）

## 生成 PNG 图标（可选）

如果需要生成 PNG 格式图标，可以使用以下方法：

### 方法 1：使用 sharp（推荐）

```bash
# 安装 sharp
npm install sharp --save-dev

# 创建生成脚本
node scripts/generate-icons.js
```

`scripts/generate-icons.js` 示例：

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 72, 96, 120, 128, 144, 152, 180, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// 创建输出目录
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  for (const size of sizes) {
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
  
  // 生成 favicon.ico
  await sharp(inputSvg)
    .resize(32, 32)
    .toFile(path.join(__dirname, '../public/favicon.ico'));
  console.log('Generated favicon.ico');
}

generateIcons().catch(console.error);
```

### 方法 2：使用在线工具

1. 访问 https://realfavicongenerator.net/
2. 上传 `/public/icon.svg`
3. 下载生成的图标包
4. 将图标放入 `/public/icons/` 目录

### 方法 3：使用 Figma/Sketch

1. 导入 SVG 文件
2. 导出为各种尺寸的 PNG
3. 放入 `/public/icons/` 目录

## 生成启动画面（iOS）

iOS 启动画面需要特定尺寸，可以使用以下工具：

1. https://progressier.com/pwa-icons-and-ios-splash-screen-generator
2. https://www.pwabuilder.com/imageGenerator

## 更新配置

生成 PNG 图标后，更新 `app/manifest.ts` 和 `app/layout.tsx` 使用 PNG 格式：

```typescript
// app/manifest.ts
icons: [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
],
```

## 验证

使用 Lighthouse 验证 PWA 配置：

```bash
npm run build
npm run start
# 然后在 Chrome DevTools 中运行 Lighthouse PWA 检查
```
