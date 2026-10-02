// ============================================================
// 轻记 · 错误信息提取
//
// catch (e) 的 e 是 unknown，各页面 toast 提示统一走这里，
// 消灭散落各处的 (e as Error).message / (err as { errMsg }).errMsg 断言。
//
// 提取顺序：Error.message → errMsg（uni 回调 fail 的错误对象）→ fallback。
// 提取结果为空串（或非字符串）时回退到 fallback。
// ============================================================

/** 从未知类型的抛出值里提取一条可展示给用户的错误信息 */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'string') return e || fallback;
  if (e && typeof e === 'object') {
    // uni.* 的 fail 回调错误形如 { errMsg: 'xxx:fail ...' }
    const { errMsg } = e as { errMsg?: unknown };
    if (typeof errMsg === 'string' && errMsg) return errMsg;
    // 普通对象可能挂在 message 上（未继承 Error 的旧式抛值）
    const { message } = e as { message?: unknown };
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
