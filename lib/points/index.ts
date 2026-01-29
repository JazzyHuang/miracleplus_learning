/**
 * 积分系统模块导出
 * 
 * ## 架构说明
 * 
 * 所有导出均为客户端安全，可在任何环境使用。
 * 
 * ### 配置
 * - `POINT_RULES` - 积分规则配置
 * - `PointActionType` - 积分行为类型
 * 
 * ### 服务
 * - `PointsService`, `createPointsService` - 积分服务类
 * - `BadgesService`, `createBadgesService` - 勋章服务类
 * 
 * @example
 * import { createPointsService, POINT_RULES } from '@/lib/points';
 */

// ============================================================
// 客户端安全导出 - 可在任何环境使用
// ============================================================

export * from './config';
export * from './service';
export * from './badges';
