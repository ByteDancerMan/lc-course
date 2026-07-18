import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const rootEnvPath = path.resolve(projectRoot, '..', '.env')

dotenv.config({ path: rootEnvPath })

export const config = {
  port: Number(process.env.PORT ?? 3001),
  projectRoot,
  uploadDir: path.join(projectRoot, 'storage', 'uploads'),
  dbPath: path.join(projectRoot, 'storage', 'recipe-assistant.db'),
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY ?? '',
  dashscopeBaseUrl:
    process.env.DASHSCOPE_BASE_URL ??
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  visionModel: process.env.DASHSCOPE_VISION_MODEL ?? 'qwen-vl-max-latest',
  recipeModel: process.env.DASHSCOPE_RECIPE_MODEL ?? 'qwen-plus',
  tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
  ossRegion: process.env.OSS_REGION ?? '',
  ossAccessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
  ossAccessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
  ossBucket: process.env.OSS_BUCKET ?? '',
  ossEndpoint: process.env.OSS_ENDPOINT ?? '',
}

export const isOssEnabled =
  Boolean(config.ossRegion) &&
  Boolean(config.ossAccessKeyId) &&
  Boolean(config.ossAccessKeySecret) &&
  Boolean(config.ossBucket) &&
  Boolean(config.ossEndpoint)
