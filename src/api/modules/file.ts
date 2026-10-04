// ============================================================
// 轻记 · 文件模块接口（对接后端 FileController）
//
// 图片上传是「两段式」：
//   1. POST /file/presign（走 request 层，带 Authorization）→ 拿 S3 POST 表单
//   2. uni.uploadFile 直传 MinIO 的 postUrl —— ★ 裸调用、绝不带 Authorization：
//      签名全在 formData 里，MinIO 不认 Bearer，带了反而可能被拒
//
// 直传不走 request.ts（它会拼 BASE_URL + Bearer），目标本来就是 MinIO。
// 上传成功后文件处于 TEMP 状态，24h 内被记录/资料引用才转正，
// 否则被后端清理任务回收 —— 所以「传了但没保存」不需要前端兜底删除。
// ============================================================

import { request } from '../request';
import type { PresignResp } from '../types';

/** 申请图片预签名表单（后端同时落一条 TEMP 元数据） */
export function presignImage(
  contentType: string,
  size: number,
  originalFilename?: string
): Promise<PresignResp> {
  return request<PresignResp>({
    url: '/file/presign',
    method: 'POST',
    data: { contentType, size, originalFilename }
  });
}

/**
 * 直传 MinIO：S3 POST 表单的文件字段名约定为 file。
 *
 * res.data 是字符串（成功空体 / 失败错误 XML），只按 2xx 判定成败，不解析 body。
 * formData 原样全量透传 —— key / Content-Type 是策略校验条件，缺一个都 403。
 */
export function uploadToMinio(presign: PresignResp, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: presign.postUrl,
      filePath,
      name: 'file',
      formData: presign.formData,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`图片上传失败(HTTP ${res.statusCode})`));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '图片上传失败'))
    });
  });
}

/** 换取文件访问 URL（私有桶，objectKey 不能直接当 <image> 的 src） */
export function getFileUrl(objectKey: string, download = false): Promise<string> {
  return request<string>({
    url: '/file/url',
    method: 'GET',
    data: { objectKey, download }
  });
}
