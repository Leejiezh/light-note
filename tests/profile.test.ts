// 个人资料存储层单元测试（vitest 运行，不依赖 uni-app 环境）
// profile.ts 引用了 uni.getStorageSync —— 先装内存版 shim 再用（profile 只在函数调用时才用到 uni，静态 import 也安全）
import { it, expect } from 'vitest';

const storage = new Map<string, unknown>();
(globalThis as Record<string, unknown>).uni = {
  getStorageSync: (k: string) => (storage.has(k) ? storage.get(k) : ''),
  setStorageSync: (k: string, v: unknown) => { storage.set(k, v); }
};

import {
  readProfile, writeProfile, validateProfile, normalizeProfile,
  sanitizeLine, initialOf, charCount, isValidEmail,
  getAvatar, AVATAR_PRESETS,
  NICKNAME_MAX, SIGNATURE_MAX
} from '../src/utils/store/profile';

it('个人资料存储（42 个断言）', () => {
  let pass = 0, fail = 0;
  const fails: string[] = [];

  function eq(actual: unknown, expected: unknown, name: string) {
    if (actual === expected) { pass++; }
    else { fail++; fails.push(`${name}\n   期望: ${JSON.stringify(expected)}\n   实际: ${JSON.stringify(actual)}`); }
  }
  function ok(cond: unknown, name: string) { eq(!!cond, true, name); }
  function deepEq(actual: unknown, expected: unknown, name: string) {
    eq(JSON.stringify(actual), JSON.stringify(expected), name);
  }

  // ---------- sanitizeLine：单行清洗 ----------
  eq(sanitizeLine('a\nb'), 'a b', '换行压成空格');
  eq(sanitizeLine('a\r\n\tb'), 'a b', '回车+制表压成空格');
  eq(sanitizeLine('a  b'), 'a b', '连续空格压一个');
  eq(sanitizeLine('  你好  '), '你好', '首尾空白');
  eq(sanitizeLine(null), '', 'null 安全');
  eq(sanitizeLine(123), '123', '数字转字符串');

  // ---------- initialOf：首字符（按码点） ----------
  eq(initialOf('小明'), '小', '中文首字');
  eq(initialOf('🌈晴天'), '🌈', 'emoji 是多码元字符，不能切一半');
  eq(initialOf('  Anna '), 'A', '先去空白再取');
  eq(initialOf(''), '记', '空回落默认');
  eq(initialOf(null), '记', 'null 回落默认');

  // ---------- charCount：码点计数 ----------
  eq(charCount('abc'), 3, '英文');
  eq(charCount('🌈🌈'), 2, 'emoji 按码点算 1 个');
  eq(charCount(''), 0, '空串');

  // ---------- isValidEmail：宽松校验 ----------
  ok(isValidEmail('a@b.cn'), '常规邮箱');
  ok(isValidEmail('user+tag@sub.domain.co'), '加号与子域名');
  ok(isValidEmail(''), '留空允许（未填写）');
  ok(!isValidEmail('abc'), '无 @');
  ok(!isValidEmail('a@b'), '域名无点');
  ok(!isValidEmail('a b@x.cn'), '含空格');
  ok(!isValidEmail('a@b.c n'), '域名内空格');

  // ---------- normalizeProfile：归一化兜底 ----------
  deepEq(
    normalizeProfile({ nickname: '  阿明 \n', signature: ' hi ', avatar: 'mint', email: ' A@B.CN ', location: '上海' }),
    { nickname: '阿明', signature: 'hi', avatar: 'mint', email: 'A@B.CN', location: '上海' },
    '清洗各字段'
  );
  eq(normalizeProfile({ nickname: '' }).nickname, '轻记用户', '空昵称回落默认');
  eq(normalizeProfile({ avatar: 'hack' }).avatar, 'violet', '未知底色回落默认');
  eq(normalizeProfile(null).nickname, '轻记用户', 'null 输入安全');
  ok(normalizeProfile({ nickname: 'x'.repeat(99) }).nickname.length === NICKNAME_MAX, '昵称超长截断');
  ok(normalizeProfile({ signature: 'y'.repeat(99) }).signature.length === SIGNATURE_MAX, '签名超长截断');

  // ---------- validateProfile ----------
  eq(validateProfile({ nickname: '', signature: '', email: '', location: '', avatar: 'violet' }).field, 'nickname', '空昵称报错');
  ok(validateProfile({ nickname: '阿明', signature: '', email: '', location: '', avatar: 'violet' }).ok, '合法资料通过');
  eq(validateProfile({ nickname: '阿明', signature: '', email: 'bad', location: '', avatar: 'violet' }).field, 'email', '坏邮箱报错');
  eq(
    validateProfile({ nickname: 'x'.repeat(NICKNAME_MAX + 1), signature: '', email: '', location: '', avatar: 'violet' }).field,
    'nickname',
    '超长昵称报错'
  );
  eq(
    validateProfile({ nickname: '阿明', signature: 'z'.repeat(SIGNATURE_MAX + 1), email: '', location: '', avatar: 'violet' }).field,
    'signature',
    '超长签名报错'
  );
  // 传「临界长度」应通过
  ok(
    validateProfile({ nickname: 'x'.repeat(NICKNAME_MAX), signature: 'y'.repeat(SIGNATURE_MAX), email: 'a@b.cn', location: '', avatar: 'violet' }).ok,
    '临界长度通过'
  );

  // ---------- 读写闭环 ----------
  storage.clear();
  const saved = writeProfile({ nickname: '阿明', signature: '爱写笔记', avatar: 'sunset', email: 'a@b.cn', location: '杭州' });
  deepEq(saved, { nickname: '阿明', signature: '爱写笔记', avatar: 'sunset', email: 'a@b.cn', location: '杭州' }, '写入返回归一化结果');
  deepEq(readProfile(), saved, '读回一致');

  // 存储脏数据也能读出干净值
  storage.set('profile', { nickname: '   ', avatar: 'nope', email: 'x y@z' });
  const dirty = readProfile();
  eq(dirty.nickname, '轻记用户', '脏昵称兜底');
  eq(dirty.avatar, 'violet', '脏底色兜底');
  eq(dirty.email, '', '非法邮箱清空');

  // ---------- 头像预设 ----------
  eq(AVATAR_PRESETS.length, 6, '预设数量');
  ok(AVATAR_PRESETS.every((p) => p.key && p.from && p.to), '预设字段完整');
  eq(getAvatar('ocean').label, '深海蓝', '按 key 取预设');
  eq(getAvatar('missing').key, 'violet', '未知 key 回落第一个');

  // ---------- 汇总 ----------
  console.log(`\nprofile 测试：${pass} 通过，${fail} 失败`);
  if (fail) {
    console.error('\n失败详情：');
    fails.forEach((f) => console.error(' ✗ ' + f));
  }
  expect(fail, fails.join('\n')).toBe(0);
});
