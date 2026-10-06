// 首页筛选小桥单测（vitest，纯 TS 无依赖）
import { it, expect, beforeEach } from 'vitest';
import { requestFilter, consumePendingFilter } from '../src/utils/store/listFilter';

beforeEach(() => {
  // 每个用例前清掉残留，避免用例间相互污染（consume 本身就是「读一次即清」）
  consumePendingFilter();
});

it('request 后 consume 能读到一次', () => {
  requestFilter('work');
  expect(consumePendingFilter()).toBe('work');
});

it('consume 是一次性的：第二次读不到', () => {
  requestFilter('life');
  consumePendingFilter();
  expect(consumePendingFilter()).toBeUndefined();
});

it('没有登记时返回 undefined', () => {
  expect(consumePendingFilter()).toBeUndefined();
});

it('登记 all（不过滤）也按原样传递，由首页决定语义', () => {
  requestFilter('all');
  expect(consumePendingFilter()).toBe('all');
});
