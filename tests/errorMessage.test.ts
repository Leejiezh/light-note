import { describe, it, expect } from 'vitest';
import { errorMessage } from '../src/utils/errorMessage';

describe('errorMessage', () => {
  it('Error 对象：取 message', () => {
    expect(errorMessage(new Error('笔记不存在'), '加载失败')).toBe('笔记不存在');
  });

  it('Error 对象：message 为空串时用 fallback', () => {
    expect(errorMessage(new Error(''), '加载失败')).toBe('加载失败');
  });

  it('带 errMsg 的普通对象：取 errMsg（uni 回调 fail 形态）', () => {
    expect(errorMessage({ errMsg: 'chooseMedia:fail cancel' }, '没能取到图片')).toBe(
      'chooseMedia:fail cancel'
    );
  });

  it('带 message 的普通对象：取 message', () => {
    expect(errorMessage({ message: '服务器开小差了' }, '加载失败')).toBe('服务器开小差了');
  });

  it('errMsg 优先于 message（Error 之外的对象）', () => {
    expect(errorMessage({ errMsg: 'a:fail', message: 'b' }, 'f')).toBe('a:fail');
  });

  it('字符串直接返回，空串用 fallback', () => {
    expect(errorMessage('直接抛的字符串', 'f')).toBe('直接抛的字符串');
    expect(errorMessage('', 'f')).toBe('f');
  });

  it('null / undefined / 数字：用 fallback', () => {
    expect(errorMessage(null, 'f')).toBe('f');
    expect(errorMessage(undefined, 'f')).toBe('f');
    expect(errorMessage(42, 'f')).toBe('f');
  });

  it('errMsg 为空串或非字符串：不取，用 fallback', () => {
    expect(errorMessage({ errMsg: '' }, 'f')).toBe('f');
    expect(errorMessage({ errMsg: 123 }, 'f')).toBe('f');
  });

  it('普通对象（无 errMsg / message）：用 fallback', () => {
    expect(errorMessage({ foo: 'bar' }, 'f')).toBe('f');
  });
});
