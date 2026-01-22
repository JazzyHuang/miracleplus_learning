# Miracle Learning - 奇绩创坛学习平台

一个现代化的学习平台，为奇绩创坛创业者提供系统化的创业课程和 Workshop 活动管理。

## 功能特性

### 用户端
- **Workshop 活动**：参与线下活动，上传打卡照片
- **线上课程**：系统化学习创业知识
- **课程测试**：通过测试巩固学习成果（支持单选、多选、判断题）
- **学习进度**：追踪个人学习进度

### 管理端
- **课程管理**：创建和编辑课程、章节、课时内容
- **题目管理**：为每节课添加测试题目
- **活动管理**：创建和管理 Workshop 活动
- **数据统计**：查看平台整体数据

## 技术栈

- **框架**: Next.js 14 (App Router)
- **数据库/认证/存储**: Supabase
- **样式**: Tailwind CSS + shadcn/ui
- **动画**: Framer Motion
- **Markdown渲染**: react-markdown + rehype-highlight

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd miracle_learning
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 复制环境变量模板：
   ```bash
   cp env.example .env.local
   ```
3. 填入你的 Supabase 项目配置：
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. 初始化数据库

1. 在 Supabase SQL Editor 中运行 `supabase/migrations/001_initial_schema.sql`
2. (可选) 运行 `supabase/seed.sql` 添加示例数据

### 5. 配置存储桶

在 Supabase Dashboard 中：
1. 进入 Storage
2. 创建名为 `images` 的存储桶
3. 设置为 public

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
miracle_learning/
├── app/                    # Next.js App Router 页面
│   ├── (auth)/            # 认证页面（登录/注册）
│   ├── (dashboard)/       # 用户端页面
│   │   ├── workshop/      # Workshop 活动
│   │   └── courses/       # 线上课程
│   └── admin/             # 管理后台
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 组件
│   ├── sidebar/          # 侧边栏组件
│   ├── workshop/         # Workshop 相关组件
│   ├── course/           # 课程相关组件
│   └── quiz/             # 测试相关组件
├── lib/                   # 工具函数
│   └── supabase/         # Supabase 客户端配置
├── hooks/                 # 自定义 Hooks
├── types/                 # TypeScript 类型定义
└── supabase/             # 数据库相关
    ├── migrations/       # 数据库迁移文件
    └── seed.sql          # 种子数据
```

## 创建管理员账户

1. 使用邮箱注册普通账户
2. 在 Supabase 的 Table Editor 中找到 `users` 表
3. 将该用户的 `role` 字段从 `user` 改为 `admin`
4. 刷新页面，即可在侧边栏看到"管理后台"入口

## 开发说明

### 添加新的 UI 组件

```bash
npx shadcn@latest add <component-name>
```

### 数据库修改

1. 在 `supabase/migrations/` 创建新的迁移文件
2. 在 Supabase SQL Editor 中运行

## 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署完成

### 环境变量

确保在生产环境配置以下环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

MIT
