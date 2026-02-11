# 数据库备份策略

## 概述

本文档描述了 Miracle Learning 平台的数据库备份策略。我们使用 Supabase 托管的 PostgreSQL 数据库，备份策略主要依赖 Supabase 的内置备份功能，同时提供额外的备份验证和恢复测试流程。

## Supabase 内置备份

### 自动备份

Supabase Pro 计划提供以下自动备份功能：

- **物理备份 (WAL 归档)**: 每 5 分钟一次
- **逻辑备份 (pg_dump)**: 每天一次
- **时间点恢复 (PITR)**: 可恢复到过去 30 天内的任何时间点

### 备份保留

- **WAL 归档**: 保留 30 天
- **逻辑备份**: 保留 7 天
- **快照备份**: 保留 7 天

### 访问备份

1. 登录 Supabase Dashboard
2. 选择项目 → Database → Backups
3. 查看所有可用备份

## 数据导出（额外备份）

### 手动导出

通过 Supabase Dashboard 或 CLI 导出数据：

```bash
# 使用 Supabase CLI 导出架构
supabase db dump -f backup_$(date +%Y%m%d).sql

# 导出特定表的数据
supabase db dump -f backup_$(date +%Y%m%d)_data.sql --data-only --table miracle_learning_20260209_users
```

### 关键表优先级

**关键数据**（必须备份）:
- `miracle_learning_20260209_users` - 用户资料
- `miracle_learning_20260209_user_point_balance` - 积分余额
- `miracle_learning_20260209_point_transactions` - 积分交易记录
- `miracle_learning_20260209_user_lesson_progress` - 学习进度
- `miracle_learning_20260209_certificates` - 证书记录
- `auth.users` - 认证用户（Supabase 内置）

**重要数据**（应该备份）:
- `miracle_learning_20260209_courses` - 课程
- `miracle_learning_20260209_chapters` - 章节
- `miracle_learning_20260209_lessons` - 课时
- `miracle_learning_20260209_questions` - 题目
- `miracle_learning_20260209_discussions` - 讨论
- `miracle_learning_20260209_comments` - 评论

**可重新生成数据**（低优先级）:
- `miracle_learning_20260209_rate_limit_entries` - 限流条目
- 日志类数据

## 备份验证

### 每周验证

1. **备份完整性检查**
   ```bash
   # 检查备份文件存在且不为空
   ls -lh backup_*.sql
   ```

2. **架构验证**
   ```bash
   # 验证备份包含所有预期的表
   grep "CREATE TABLE" backup_*.sql | grep miracle_learning_20260209
   ```

3. **行数验证**
   ```sql
   -- 在测试环境中恢复后运行
   SELECT
     'users' as table_name,
     COUNT(*) as row_count
   FROM miracle_learning_20260209_users
   UNION ALL
   SELECT
     'point_transactions' as table_name,
     COUNT(*) as row_count
   FROM miracle_learning_20260209_point_transactions;
   ```

### 每月恢复测试

每月进行一次完整的备份恢复测试：

1. 在测试环境创建新的 Supabase 项目
2. 从最新备份恢复
3. 运行关键功能测试：
   - 用户登录
   - 课程访问
   - 积分系统
   - 进度保存

## 紧急恢复流程

### 场景 1：表意外删除

```sql
-- 1. 确认表已删除
SELECT * FROM miracle_learning_20260209_users; -- 失败

-- 2. 从 Supabase Dashboard 选择备份时间点
-- Database → Backups → Point-in-Time Recovery

-- 3. 指定恢复时间（删除前）
-- 4. 执行恢复
```

### 场景 2：数据损坏

```sql
-- 1. 确认数据损坏
SELECT * FROM miracle_learning_20260209_user_point_balance WHERE tokens < 0;

-- 2. 导出到测试环境
-- 3. 从备份恢复到测试环境
-- 4. 验证数据完整性
-- 5. 将修复的数据导出并重新导入生产环境
```

### 场景 3：完全恢复

1. 在 Supabase Dashboard 创建新项目
2. 使用最新备份恢复
3. 更新环境变量 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 重新部署应用
5. 验证所有功能

## 备份脚本

创建自动备份脚本 `scripts/backup-test.sh`:

```bash
#!/bin/bash
# 每周备份验证脚本

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 导出数据库
supabase db dump -f $BACKUP_FILE

# 验证备份文件
if [ -s $BACKUP_FILE ]; then
    echo "Backup successful: $BACKUP_FILE"
    # 计算文件大小
    ls -lh $BACKUP_FILE
else
    echo "Backup failed!"
    exit 1
fi

# 保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup cleanup completed"
```

## 环境变量

```bash
# .env.local
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_ACCESS_TOKEN=your-access-token
```

## 联系信息

- Supabase 支持: https://supabase.com/support
- 灾难恢复紧急联系: [您的团队联系信息]
