# Debug Session: upload-image-500
- **Status**: [OPEN]
- **Issue**: 前端上传图片后出现 500，链路可能在 upload-image、recognize 或 recipes/generate 任一阶段失败
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-upload-image-500.ndjson

## Reproduction Steps
1. 启动 `webapp`
2. 在前端页面上传测试图片
3. 观察 `/api/upload-image`、`/api/recognize`、`/api/recipes/generate` 请求与页面错误提示

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | OSS 上传阶段抛错导致 `/api/upload-image` 返回 500 | High | Low | Rejected |
| B | 上传成功，但 `recognize` 或 `recipes/generate` 抛错，前端统一显示失败 | High | Low | Confirmed |
| C | Express 异步路由未捕获异常，Promise reject 导致 500/服务异常 | High | Low | Confirmed |
| D | 上传文件内容或 MIME 触发边界条件，文本/图片行为不同 | Medium | Low | Rejected |
| E | 请求命中旧进程或端口冲突实例，表现为间歇性 500 | Medium | Medium | Rejected |

## Log Evidence
- 行 4-6 / 18-20 / 27-28：OSS `put` 成功，`/api/upload-image` 正常返回 OSS URL，排除假设 A
- 行 9 / 23 / 31：`recognizeIngredients` 对 `qwen3.7-max` 返回 `Unexpected item type in content.`，但被 catch 后降级为 fallback 识别结果
- 行 11 / 25 / 33：`/api/recipes/generate` 已进入，说明上传与识别都已完成
- 行 12 / 26 / 34：出现 `unhandled rejection: UNIQUE constraint failed: turn_ingredients.id`
- `database.ts` 中 `turn_ingredients.id` 是主键，`saveTurnIngredients()` 直接写入 `item.id`，相同食材在不同轮次/会话复用相同 id，会触发主键冲突
- post-fix 行 35-40：连续出现 `generateRecipePlan succeeded` 与 `generate route completed`，且未再出现 `UNIQUE constraint failed: turn_ingredients.id`

## Verification Conclusion
- 根因一：识别阶段的模型调用参数与当前 `qwen3.7-max` 不兼容，导致识别接口降级到 fallback，但这不是 500 的直接来源
- 根因二：真正触发 500 的是 `recipes/generate` 内写入 `turn_ingredients` 时复用了食材 id，触发 SQLite 主键冲突
- 修复方向：保留埋点，最小修改 `saveTurnIngredients()` 的行级主键生成方式，避免跨 turn/session 冲突
- 最小修复已实施：把 `turn_ingredients.id` 从 `item.id` 改为 `${turnId}:${item.id}`，保持数据内容不变，只修复主键唯一性
- post-fix 浏览器验证结果：上传测试图后未出现 `请求失败`，页面已出现候选菜与主推荐
