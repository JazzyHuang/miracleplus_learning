-- 修复 001_initial_schema.sql 中 users 表的语法错误
-- 原始文件第8行有 `name TEXT,s` 应为 `name TEXT,`
-- 此迁移确保 name 列正确存在

-- 如果表存在但 name 列不存在（因为语法错误导致创建失败），添加该列
DO $$
BEGIN
  -- 检查 users 表是否存在
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- 检查 name 列是否存在
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name') THEN
      ALTER TABLE public.users ADD COLUMN name TEXT;
      RAISE NOTICE 'Added name column to users table';
    ELSE
      RAISE NOTICE 'name column already exists in users table';
    END IF;
  ELSE
    RAISE NOTICE 'users table does not exist - will be created by initial migration';
  END IF;
END $$;
