#!/bin/bash
# 开发服务器启动脚本
# 用途: 启动 Next.js 开发服务器

set -e

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 日志配置
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/dev-$(date +%Y%m%d_%H%M%S).log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')]-[启动]-[开发服务器]-[开始]"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')]-[安装]-[依赖]-[执行中]"
    pnpm install
    echo "[$(date '+%Y-%m-%d %H:%M:%S')]-[安装]-[依赖]-[完成]"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')]-[启动]-[Next.js 开发服务器]-[执行中]"
echo "日志输出到: $LOG_FILE"

# 启动开发服务器并输出到日志
pnpm dev 2>&1 | tee "$LOG_FILE"
