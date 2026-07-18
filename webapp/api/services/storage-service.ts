import fs from 'fs'
import path from 'path'
import OSS from 'ali-oss'
import { config, isOssEnabled } from '../config.js'

// #region debug-point A:storage-reporter
const reportDebug = (
  msg: string,
  data: Record<string, unknown> = {},
) => {
  void fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'upload-image-500',
      runId: 'post-fix',
      hypothesisId: 'A',
      location: 'api/services/storage-service.ts',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion

let ossClient: OSS | null = null

if (isOssEnabled) {
  ossClient = new OSS({
    region: config.ossRegion,
    accessKeyId: config.ossAccessKeyId,
    accessKeySecret: config.ossAccessKeySecret,
    bucket: config.ossBucket,
    endpoint: config.ossEndpoint,
  })
}

export function getStorageMode(): 'oss' | 'local' {
  return isOssEnabled ? 'oss' : 'local'
}

export async function storeImage(file: Express.Multer.File) {
  const imageId = crypto.randomUUID()
  const extension = path.extname(file.originalname) || '.jpg'
  const objectKey = `ingredients/${new Date().toISOString().slice(0, 10)}/${imageId}${extension}`
  // #region debug-point A:store-entry
  reportDebug('storeImage entered', {
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    objectKey,
    storageMode: getStorageMode(),
  })
  // #endregion

  if (ossClient) {
    // #region debug-point A:oss-put-start
    reportDebug('oss put starting', {
      objectKey,
      endpoint: config.ossEndpoint,
      bucket: config.ossBucket,
      region: config.ossRegion,
    })
    // #endregion
    const result = await ossClient.put(objectKey, file.buffer, {
      headers: {
        'Content-Type': file.mimetype,
      },
    })
    // #region debug-point A:oss-put-success
    reportDebug('oss put succeeded', {
      objectKey,
      url: result.url,
      name: result.name,
    })
    // #endregion

    return {
      imageId,
      objectKey,
      imageUrl: result.url,
      fileName: file.originalname,
      contentType: file.mimetype,
    }
  }

  fs.mkdirSync(config.uploadDir, { recursive: true })

  const filePath = path.join(config.uploadDir, `${imageId}${extension}`)
  fs.writeFileSync(filePath, file.buffer)
  // #region debug-point A:local-write-success
  reportDebug('local file write succeeded', {
    filePath,
    objectKey: path.basename(filePath),
  })
  // #endregion

  return {
    imageId,
    objectKey: path.basename(filePath),
    imageUrl: `/uploads/${path.basename(filePath)}`,
    fileName: file.originalname,
    contentType: file.mimetype,
  }
}
