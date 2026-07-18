import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import type {
  ChatMessage,
  IngredientItem,
  RecipeCandidate,
  RecipeDetail,
  RecipeGenerationResponse,
  RecognitionResponse,
  ReferenceLink,
  SessionDetail,
} from '../../shared/types.js'
import { config } from '../config.js'

// #region debug-point B:agent-reporter
const reportDebug = (
  location: string,
  msg: string,
  data: Record<string, unknown> = {},
) => {
  void fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'upload-image-500',
      runId: 'post-fix',
      hypothesisId: 'B',
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion

const client = config.dashscopeApiKey
  ? new OpenAI({
      apiKey: config.dashscopeApiKey,
      baseURL: config.dashscopeBaseUrl,
    })
  : null

function parseJsonBlock<T>(content: string, fallback: T): T {
  const match =
    content.match(/```json\s*([\s\S]*?)```/) ||
    content.match(/```([\s\S]*?)```/) ||
    [undefined, content]

  try {
    return JSON.parse(match[1]?.trim() ?? content) as T
  } catch {
    return fallback
  }
}

function ingredientId(name: string) {
  return `ingredient-${name.toLowerCase().replace(/\s+/g, '-')}`
}

function buildFallbackIngredients(imageUrl: string): RecognitionResponse {
  const lowerName = imageUrl.toLowerCase()
  const hints = [
    lowerName.includes('tomato')
      ? {
          id: ingredientId('西红柿'),
          name: '西红柿',
          confidence: 0.89,
          estimatedAmount: '2 个',
          category: '蔬菜' as const,
        }
      : null,
    lowerName.includes('egg')
      ? {
          id: ingredientId('鸡蛋'),
          name: '鸡蛋',
          confidence: 0.9,
          estimatedAmount: '3 个',
          category: '其他' as const,
        }
      : null,
    lowerName.includes('potato')
      ? {
          id: ingredientId('土豆'),
          name: '土豆',
          confidence: 0.86,
          estimatedAmount: '2 个',
          category: '蔬菜' as const,
        }
      : null,
  ].filter(Boolean) as IngredientItem[]

  const ingredients =
    hints.length > 0
      ? hints
      : ([
          {
            id: ingredientId('西红柿'),
            name: '西红柿',
            confidence: 0.82,
            estimatedAmount: '2 个',
            category: '蔬菜',
          },
          {
            id: ingredientId('鸡蛋'),
            name: '鸡蛋',
            confidence: 0.8,
            estimatedAmount: '2 个',
            category: '其他',
          },
          {
            id: ingredientId('青椒'),
            name: '青椒',
            confidence: 0.76,
            estimatedAmount: '1 个',
            category: '蔬菜',
          },
        ] satisfies IngredientItem[])

  return {
    ingredients,
    visualSummary: '检测到常见家常食材，适合生成快手家常菜方案。',
  }
}

async function imageContentFromUrl(imageUrl: string) {
  if (imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(config.projectRoot, 'storage', imageUrl.replace('/uploads/', 'uploads/'))
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).replace('.', '') || 'jpeg'
    return `data:image/${ext};base64,${buffer.toString('base64')}`
  }

  return imageUrl
}

async function searchRecipeReferences(ingredients: IngredientItem[]): Promise<ReferenceLink[]> {
  if (!config.tavilyApiKey) {
    return []
  }

  const query = `${ingredients.map((item) => item.name).join('、')} 可以做什么家常菜 菜谱`
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query,
      max_results: 4,
      topic: 'general',
    }),
  })

  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as {
    results?: { title?: string; url?: string }[]
  }

  return (data.results ?? [])
    .filter((item) => item.title && item.url)
    .map((item) => ({
      title: item.title as string,
      url: item.url as string,
    }))
}

function buildFallbackRecipe(ingredients: IngredientItem[], userPrompt?: string) {
  const names = ingredients.map((item) => item.name)
  const hasTomato = names.includes('西红柿')
  const hasEgg = names.includes('鸡蛋')
  const hasPotato = names.includes('土豆')
  const leadDish = hasTomato && hasEgg ? '西红柿炒蛋' : hasPotato ? '土豆小炒' : `${names[0] ?? '家常'}拼盘`
  const candidates: RecipeCandidate[] = [
    {
      id: crypto.randomUUID(),
      title: leadDish,
      summary: '适合现有食材组合，调味简单，上手快。',
      difficulty: '简单',
      timeCost: '15 分钟',
      extraIngredients: ['盐', '食用油', '生抽'],
    },
    {
      id: crypto.randomUUID(),
      title: `${names[0] ?? '家常'}烩菜`,
      summary: '更适合一锅式烹饪，汤汁丰富，容错率高。',
      difficulty: '中等',
      timeCost: '25 分钟',
      extraIngredients: ['蒜末', '葱花', '蚝油'],
    },
    {
      id: crypto.randomUUID(),
      title: `${names.slice(0, 2).join('')}煎炒组合`,
      summary: '适合想做快手饭时使用，也便于根据口味继续追问调整。',
      difficulty: '简单',
      timeCost: '18 分钟',
      extraIngredients: ['黑胡椒', '少量淀粉'],
    },
  ]

  const recommended: RecipeDetail = {
    title: leadDish,
    summary: `结合现有食材与${userPrompt ? `你的偏好“${userPrompt}”` : '常见家常做法'}，这是最稳妥的一道选择。`,
    tips: ['先准备所有食材再开火', '少量多次调味', '需要更清淡时可减少生抽和盐'],
    steps: [
      `将${names.join('、')}清洗并切成便于烹饪的形状，提前备好盐、油和基础调料。`,
      '热锅冷油，先下耐炒食材翻炒至断生，再放入易熟食材。',
      '加入少量生抽和盐调味，保持中火快速翻炒，避免出水过多。',
      '若想要更下饭，可沿锅边淋入少量清水收汁 30 秒。',
      '出锅前试味，根据需要补一点葱花或黑胡椒。 ',
    ],
    references: [],
  }

  return {
    candidates,
    recommended,
    assistantMessage: `我根据识别到的食材推荐你先试试“${leadDish}”。如果你告诉我想吃辣一点、清淡一点，或者想改成空气炸锅做法，我可以继续调整。`,
  }
}

export async function recognizeIngredients(imageUrl: string): Promise<RecognitionResponse> {
  // #region debug-point B:recognize-service-entry
  reportDebug('api/services/agent-service.ts:recognizeIngredients:entry', 'recognizeIngredients entered', {
    imageUrl,
    hasClient: Boolean(client),
    model: config.visionModel,
  })
  // #endregion
  if (!client) {
    return buildFallbackIngredients(imageUrl)
  }

  try {
    const resolvedImage = await imageContentFromUrl(imageUrl)
    const completion = await client.chat.completions.create({
      model: config.visionModel,
      messages: [
        {
          role: 'system',
          content:
            '你是食材识别助手。请识别图片中的主要食材，并且只返回 JSON。JSON 格式为 {"ingredients":[{"id":"...","name":"...","confidence":0.91,"estimatedAmount":"2 个","category":"蔬菜"}],"visualSummary":"..."}。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别图片里的食材，优先输出适合做家常菜的关键原材料，不要输出餐具背景。',
            },
            {
              type: 'image_url',
              image_url: {
                url: resolvedImage,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const parsed = parseJsonBlock<RecognitionResponse>(content, buildFallbackIngredients(imageUrl))
    // #region debug-point B:recognize-service-success
    reportDebug('api/services/agent-service.ts:recognizeIngredients:success', 'recognizeIngredients succeeded', {
      ingredientCount: parsed.ingredients?.length ?? 0,
      contentLength: content.length,
    })
    // #endregion

    return {
      ingredients: (parsed.ingredients ?? []).map((item, index) => ({
        ...item,
        id: item.id || `ingredient-${index + 1}`,
      })),
      visualSummary:
        parsed.visualSummary ?? '识别完成，已提取主要原材料并准备生成候选菜谱。',
    }
  } catch (error) {
    // #region debug-point B:recognize-service-fallback
    reportDebug('api/services/agent-service.ts:recognizeIngredients:catch', 'recognizeIngredients fell back', {
      error: error instanceof Error ? error.message : String(error),
      imageUrl,
    })
    // #endregion
    return buildFallbackIngredients(imageUrl)
  }
}

export async function generateRecipePlan(params: {
  imageUrl: string
  ingredients: IngredientItem[]
  userPrompt?: string
  history?: ChatMessage[]
}): Promise<RecipeGenerationResponse> {
  const references = await searchRecipeReferences(params.ingredients)
  const fallback = buildFallbackRecipe(params.ingredients, params.userPrompt)
  // #region debug-point B:generate-service-entry
  reportDebug('api/services/agent-service.ts:generateRecipePlan:entry', 'generateRecipePlan entered', {
    imageUrl: params.imageUrl,
    ingredientCount: params.ingredients.length,
    hasPrompt: Boolean(params.userPrompt?.trim()),
    historyCount: params.history?.length ?? 0,
    model: config.recipeModel,
    referenceCount: references.length,
  })
  // #endregion

  if (!client) {
    return {
      sessionId: '',
      turnId: '',
      ...fallback,
    }
  }

  try {
    const completion = await client.chat.completions.create({
      model: config.recipeModel,
      messages: [
        {
          role: 'system',
          content:
            '你是一个会做菜的智能厨房助手。请基于识别出来的食材和外部参考，输出严格 JSON。格式为 {"candidates":[{"id":"...","title":"...","summary":"...","difficulty":"简单","timeCost":"15 分钟","extraIngredients":["盐"]}],"recommended":{"title":"...","summary":"...","tips":["..."],"steps":["..."],"references":[{"title":"...","url":"..."}]},"assistantMessage":"..."}。回答必须适合中文用户。steps 至少 4 步。',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              ingredients: params.ingredients,
              userPrompt: params.userPrompt ?? '',
              history: params.history ?? [],
              references,
            },
            null,
            2,
          ),
        },
      ],
      temperature: 0.4,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const parsed = parseJsonBlock<{
      candidates: RecipeCandidate[]
      recommended: RecipeDetail
      assistantMessage: string
    }>(content, fallback)
    // #region debug-point B:generate-service-success
    reportDebug('api/services/agent-service.ts:generateRecipePlan:success', 'generateRecipePlan succeeded', {
      candidateCount: parsed.candidates?.length ?? 0,
      recommendedTitle: parsed.recommended?.title,
      contentLength: content.length,
    })
    // #endregion

    return {
      sessionId: '',
      turnId: '',
      candidates: parsed.candidates?.length ? parsed.candidates : fallback.candidates,
      recommended: {
        ...fallback.recommended,
        ...parsed.recommended,
        references:
          parsed.recommended?.references?.length
            ? parsed.recommended.references
            : references,
      },
      assistantMessage: parsed.assistantMessage || fallback.assistantMessage,
    }
  } catch (error) {
    // #region debug-point B:generate-service-fallback
    reportDebug('api/services/agent-service.ts:generateRecipePlan:catch', 'generateRecipePlan fell back', {
      error: error instanceof Error ? error.message : String(error),
      imageUrl: params.imageUrl,
    })
    // #endregion
    return {
      sessionId: '',
      turnId: '',
      ...fallback,
    }
  }
}

export async function continueRecipeConversation(params: {
  message: string
  session: SessionDetail
  history: ChatMessage[]
}): Promise<{
  assistantMessage: string
  recommended?: RecipeDetail
}> {
  const latestRecipe =
    params.session.turns
      .slice()
      .reverse()
      .find((turn) => turn.recommended)?.recommended ?? null

  const ingredientContext =
    params.session.turns
      .flatMap((turn) => turn.ingredients ?? [])
      .reduce<IngredientItem[]>((accumulator, current) => {
        if (!accumulator.find((item) => item.name === current.name)) {
          accumulator.push(current)
        }
        return accumulator
      }, []) ?? []

  if (!client) {
    return {
      assistantMessage:
        '我已经记住当前会话了。你可以继续告诉我想换成清淡口味、加辣、减脂，或者指定空气炸锅/电饭煲做法，我会基于现有食材继续优化。',
      recommended: latestRecipe ?? undefined,
    }
  }

  try {
    const completion = await client.chat.completions.create({
      model: config.recipeModel,
      messages: [
        {
          role: 'system',
          content:
            '你是一个支持多轮追问的厨房助手。基于会话历史、现有食材和已有菜谱，输出 JSON：{"assistantMessage":"...","recommended":{"title":"...","summary":"...","tips":["..."],"steps":["..."],"references":[{"title":"...","url":"..."}]}}。如果无需替换菜谱，也要返回 recommended。',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              message: params.message,
              history: params.history,
              ingredients: ingredientContext,
              latestRecipe,
            },
            null,
            2,
          ),
        },
      ],
      temperature: 0.5,
    })

    const parsed = parseJsonBlock<{
      assistantMessage: string
      recommended?: RecipeDetail
    }>(completion.choices[0]?.message?.content ?? '', {
      assistantMessage:
        '我已经根据你刚才的要求调整建议，可以继续告诉我想换成别的烹饪方式或口味。',
      recommended: latestRecipe ?? undefined,
    })

    return {
      assistantMessage: parsed.assistantMessage,
      recommended: parsed.recommended ?? latestRecipe ?? undefined,
    }
  } catch {
    return {
      assistantMessage:
        '我保留了你当前会话的上下文，但这次没有成功刷新菜谱结果。你可以换一种说法继续追问。',
      recommended: latestRecipe ?? undefined,
    }
  }
}

export function suggestSessionTitle(ingredients: IngredientItem[]) {
  if (ingredients.length === 0) {
    return '新的做菜会话'
  }

  return `${ingredients.slice(0, 2).map((item) => item.name).join(' + ')}做什么`
}
