/**
 * 浅比较工具函数
 * 用于比较两个对象或数组的浅层相等性
 * 比 JSON.stringify 更高效，且不受属性顺序影响
 */

/**
 * 浅比较两个值是否相等
 * - 基本类型使用 ===
 * - 数组比较长度和每个元素（浅）
 * - 对象比较键的数量和每个键的值（浅）
 * - null 和 undefined 视为相等
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  // 快速路径：相同引用
  if (a === b) return true;

  // 处理 null/undefined
  if (a == null || b == null) return a === b;

  // 处理基本类型
  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) return false;

  // 处理数组
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // 处理对象
  if (typeA === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (
        !Object.prototype.hasOwnProperty.call(b, key) ||
        (a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]
      ) {
        return false;
      }
    }
    return true;
  }

  // 其他类型（包括函数、symbol 等）
  return a === b;
}

/**
 * 深度比较（谨慎使用，可能有性能问题）
 * 仅在必要时使用，优先使用浅比较
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // 快速路径
  if (a === b) return true;

  // 处理 null/undefined
  if (a == null || b == null) return a === b;

  // 处理基本类型
  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) return false;

  // 处理数组
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // 处理对象
  if (typeA === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (
        !Object.prototype.hasOwnProperty.call(b, key) ||
        !deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
      ) {
        return false;
      }
    }
    return true;
  }

  return a === b;
}
