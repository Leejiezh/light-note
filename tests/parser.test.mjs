// 解析器单元测试（node 直接跑，不依赖 uni-app 环境）
import {
  parseInline, renderMd, parseToSegments, collectChecks,
  countTodos, normalizeChecks, resetChecks, extractExcerpt, isSafeUrl,
  wrapRange, INLINE_FORMATS, imageMarkdown, insertImageBlock
} from '../src/utils/markdown/index.js';

let pass = 0, fail = 0;
const fails = [];

function eq(actual, expected, name) {
  if (actual === expected) { pass++; }
  else { fail++; fails.push(`${name}\n   期望: ${JSON.stringify(expected)}\n   实际: ${JSON.stringify(actual)}`); }
}
function ok(cond, name) { eq(!!cond, true, name); }

// ---------- 行内解析 ----------
eq(parseInline('**粗**'), '<strong>粗</strong>', '加粗');
eq(parseInline('*斜*'), '<em>斜</em>', '斜体');
eq(parseInline('~~删~~'), '<del>删</del>', '删除线');
eq(parseInline('`code`'), '<code>code</code>', '行内代码');
eq(parseInline('**粗**和*斜*'), '<strong>粗</strong>和<em>斜</em>', '加粗+斜体混合');
eq(parseInline('<script>'), '&lt;script&gt;', 'XSS 转义');
eq(parseInline('[文字](https://a.com)'), '<a href="https://a.com">文字</a>', '链接');
eq(parseInline('[x](javascript:alert(1))'), 'x', 'javascript 协议拦截');
eq(parseInline('![图](https://a.com/i.png)'), '<img src="https://a.com/i.png" alt="图">', '图片');
eq(parseInline('[文档](https://a.com/x(y))'), '<a href="https://a.com/x(y)">文档</a>', 'URL 含成对括号');

// ---------- URL 安全 ----------
ok(isSafeUrl('https://a.com'), 'https 允许');
ok(isSafeUrl('/local/x.png'), '相对路径允许');
ok(!isSafeUrl('javascript:alert(1)'), 'javascript 拦截');
ok(!isSafeUrl('data:text/html,<script>'), 'data:text 拦截');

// ★ 媒体白名单：只给图片开，且只开「指向本机文件」的协议
ok(!isSafeUrl('wxfile://usr/a.jpg'), '链接不放行 wxfile:（链接仍是严格白名单）');
ok(isSafeUrl('wxfile://usr/a.jpg', { media: true }), '图片放行 wxfile:（相册选出的本机文件）');
ok(isSafeUrl('blob:http://localhost/a.jpg', { media: true }), '图片放行 blob:（H5 选图地址）');
ok(!isSafeUrl('data:image/png;base64,AAAA', { media: true }), 'data: 即使是图片也不放行（所以不用 base64 存图）');

// ---------- 块级解析 ----------
eq(renderMd('## 标题'), '<h2>标题</h2>', 'H2');
eq(renderMd('- a\n- b'), '<ul><li>a</li><li>b</li></ul>', '无序列表');
eq(renderMd('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>', '有序列表');
eq(renderMd('> 引用'), '<blockquote>引用</blockquote>', '引用');
eq(renderMd('普通文字'), '<p>普通文字</p>', '段落');
ok(renderMd('```js\nvar a=1;\n```').includes('<pre><code'), '代码块');
eq(renderMd('---'), '<hr class="md-hr">', '分割线（小程序端需 class 选择器）');
eq(renderMd('- [ ] 待办'), '<p class="md-todo">☐ 待办</p>', '待办（非分段模式）');
eq(renderMd('- [ ] 待办', { skipTodo: true }), '', '待办（skipTodo 模式）');

// ---------- 待办计数 ----------
eq(countTodos('- [ ] a\n- [x] b\n普通'), 2, 'countTodos');
eq(countTodos('- [ ] a\n- [ ] b\n- [X] c'), 3, 'countTodos 大写 X');

// ---------- checks 不变式 ----------
eq(JSON.stringify(normalizeChecks('- [ ] a\n- [ ] b', [true])), '[true,false]', 'normalizeChecks 补全');
eq(JSON.stringify(normalizeChecks('- [ ] a', [true, false, true])), '[true]', 'normalizeChecks 截断');
eq(JSON.stringify(resetChecks('- [ ] a\n- [ ] b\n- [ ] c')), '[false,false,false]', 'resetChecks');

// ---------- 分段解析 ★ 核心 ----------
// 场景：两段待办，中间隔着正文
const twoSegBody = [
  '## 本周待办',
  '- [ ] 第一项',
  '- [x] 第二项',
  '',
  '## 下周预告',
  '- [ ] 第三项',
  '- [ ] 第四项'
].join('\n');

const segs = parseToSegments(twoSegBody, [false, true, false, true]);
eq(segs.length, 4, '分段数量=4');
eq(segs[0].type, 'richtext', '第1段是 richtext');
eq(segs[1].type, 'todo', '第2段是 todo');
eq(segs[2].type, 'richtext', '第3段是 richtext');
eq(segs[3].type, 'todo', '第4段是 todo');

// ★ 关键验证：第二段待办必须取到 checks[2]、checks[3]，而不是 checks[0]、checks[1]
eq(segs[1].items[0].checked, false, '第一段第1项 = checks[0] = false');
eq(segs[1].items[1].checked, true,  '第一段第2项 = checks[1] = true');
eq(segs[3].items[0].checked, false, '★第二段第1项 = checks[2] = false（跨段累加）');
eq(segs[3].items[1].checked, true,  '★第二段第2项 = checks[3] = true（跨段累加）');

// 拍平回 checks
eq(JSON.stringify(collectChecks(segs)), '[false,true,false,true]', 'collectChecks 拍平');

// ---------- 摘要 ----------
eq(extractExcerpt('## 一、令牌分层\n\n色彩令牌必须区分两层。'), '一、令牌分层 色彩令牌必须区分两层。', '摘要基本');
eq(extractExcerpt('**加粗**文字'), '加粗文字', '摘要去标记');
eq(extractExcerpt('![图](url)'), '图', '摘要图片保留描述');
eq(extractExcerpt('[文字](https://a.com/x)'), '文字', '摘要链接只留文字');
eq(extractExcerpt('- [ ] 待办项'), '待办项', '摘要待办去标记');
eq(extractExcerpt('a'.repeat(100), 10), 'aaaaaaaaaa…', '摘要截断');

// ---------- 摘要与渲染一致性（关键）----------
const sharedSrc = '## 标题\n**粗**和`代码`';
const ex = extractExcerpt(sharedSrc);
ok(!ex.includes('**'), '摘要不含 ** 星号');
ok(!ex.includes('`'), '摘要不含反引号');
ok(!ex.includes('#'), '摘要不含 # 标题符');

// ---------- 行内格式包裹（编辑器工具栏的「挂起格式」）----------
eq(wrapRange('abc', 0, 3, '**').text, '**abc**', '包裹全选');
eq(wrapRange('abc', 0, 3, '**').caret, 7, '包裹后光标落在右标记之后');
eq(wrapRange('abcd', 1, 3, '**').text, 'a**bc**d', '包裹中间片段，不碰区间外文字');
eq(wrapRange('abcd', 1, 3, '**').caret, 7, '中间片段的光标落点（右标记之后、d 之前）');
eq(wrapRange('abc', 0, 3, '`').text, '`abc`', '单字符标记（行内代码）');
eq(wrapRange('abc', 0, 3, '`').caret, 5, '单字符标记的光标落点');
eq(wrapRange('abc', 0, 9, '**').text, '**abc**', '终点越界 → 夹到末尾');
eq(wrapRange('abc', -5, 2, '**').text, '**ab**c', '起点为负 → 夹到开头');

// ★ 边界：空区间 / 反向区间都要「什么都不做」，
//   否则「开了格式但一个字没输入」会往正文里塞一对空标记 ****
eq(wrapRange('abc', 1, 1, '**'), null, '空区间 → null');
eq(wrapRange('abc', 2, 1, '**'), null, '起点在终点之后 → null');
eq(wrapRange('', 0, 0, '**'), null, '空正文 → null');

// ★ 关键不变式：工具栏写入的标记，解析器必须认得
//   （否则工具栏和渲染会漂移 —— 正文里出现渲染不掉的裸标记）
eq(parseInline(wrapRange('abc', 0, 3, INLINE_FORMATS.b).text), '<strong>abc</strong>', 'INLINE_FORMATS.b 与解析器一致');
eq(parseInline(wrapRange('abc', 0, 3, INLINE_FORMATS.i).text), '<em>abc</em>', 'INLINE_FORMATS.i 与解析器一致');
eq(parseInline(wrapRange('abc', 0, 3, INLINE_FORMATS.del).text), '<del>abc</del>', 'INLINE_FORMATS.del 与解析器一致');
eq(parseInline(wrapRange('abc', 0, 3, INLINE_FORMATS.code).text), '<code>abc</code>', 'INLINE_FORMATS.code 与解析器一致');

// ---------- 图片：相册选图 → 插入 → 渲染 ----------
eq(imageMarkdown('wxfile://usr/a.jpg'), '![图片](wxfile://usr/a.jpg)', '生成图片标记（默认描述）');
eq(imageMarkdown('https://a.com/i.png', '封面'), '![封面](https://a.com/i.png)', '生成图片标记（自定义描述）');
eq(imageMarkdown('   '), null, '空地址 → null（不往正文里塞空图片）');
eq(imageMarkdown(null), null, 'null 地址 → null');
eq(imageMarkdown('u', 'a[b]c'), '![abc](u)', '★ 描述里的方括号必须剔除，否则 ![]() 结构会被破坏');

// 独占一行：让详情页能把它切给原生 <image> 渲染
eq(insertImageBlock('abc', 3, 'u').text, 'abc\n![图片](u)\n', '★ 行尾插入 → 前后各补换行');
eq(insertImageBlock('abc', 3, 'u').caret, 13, '光标落在整块之后');
eq(insertImageBlock('abc\ndef', 4, 'u').text, 'abc\n![图片](u)\ndef', '★ 已在行首插入 → 不重复补换行');
eq(insertImageBlock('abc', 0, 'u').text, '![图片](u)\nabc', '行首插入 → 只在后面补换行');
eq(insertImageBlock('', 0, 'u').text, '![图片](u)\n', '空正文 → 不留前导空行');
eq(insertImageBlock('abc', 0, ''), null, '空地址 → null');

// ★ 不变式：工具栏插进去的图片标记，解析器必须认得（否则正文里出现图片源码）
const imgMd = imageMarkdown('wxfile://usr/x.jpg', '照片');
eq(parseInline(imgMd), '<img src="wxfile://usr/x.jpg" alt="照片">', '★ 相册图片路径能被解析成 <img>');
eq(parseInline('![a](javascript:alert(1))'), 'a', '图片的 javascript: 协议仍然拦截');

// 分段：独占一行的图片切成 image 段（详情页交给原生 <image>）
const imgSegs = parseToSegments(['# 标题', '![照片](wxfile://usr/a.jpg)', '- [ ] 待办'].join('\n'), [true]);
eq(imgSegs.map((s) => s.type).join(','), 'richtext,image,todo', '★ 图片单独成段');
eq(imgSegs[1].src, 'wxfile://usr/a.jpg', 'image 段带地址');
eq(imgSegs[1].alt, '照片', 'image 段带描述');
eq(imgSegs[2].items[0].checked, true, '图片段不影响后面的待办取 checks[0]');

// ★ 图片夹在两段待办之间：checks 索引不能错位（图片段不占 checks 下标）
const mixSegs = parseToSegments(['- [ ] a', '![x](wxfile://usr/1.jpg)', '- [x] b'].join('\n'), [false, true]);
eq(mixSegs.map((s) => s.type).join(','), 'todo,image,todo', '待办 / 图片 / 待办');
eq(mixSegs[0].items[0].checked, false, '前一项 = checks[0]');
eq(mixSegs[2].items[0].checked, true, '★ 图片之后的待办 = checks[1]（跨段累加未被图片打乱）');

// 行内图片（与文字同行）不切段：原生 <image> 是块级组件，塞进行内会打散排版
const inlineImg = parseToSegments('文字 ![a](wxfile://usr/1.jpg) 尾巴', []);
eq(inlineImg.length, 1, '行内图片不单独成段');
eq(inlineImg[0].type, 'richtext', '行内图片留在富文本段');

// 地址不安全时不切图片段 → 退回富文本的「只留描述」处理
eq(parseToSegments('![a](javascript:alert(1))', [])[0].type, 'richtext', '危险协议的图片不当图片渲染');

// ---------- 输出 ----------
console.log(`\n通过 ${pass} / ${pass + fail}`);
if (fail) {
  console.log('\n失败用例：');
  fails.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
} else {
  console.log('全部通过 ✓');
}
