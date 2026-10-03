# WordWorld 接口契约（API Contract）

> 本文档是 WordWorld 所有后端接口的「说明书」与统一格式模板。
> 每新增一个接口，都按下面的格式补一节；字段名、返回结构一旦定下就不随便改，前端照着对接。

---

## 0. 通用约定

| 项 | 约定 |
|---|---|
| 接口风格 | HTTP + JSON（REST 风格） |
| 返回格式 | 一律 `application/json; charset=utf-8` |
| 状态码 | `200` 成功；错误时返回对应 `4xx/5xx`，响应体带 `code` 与 `message` |
| 时间字段 | 统一 ISO 8601 UTC，例如 `2026-10-01T16:04:29.204Z` |
| 鉴权 | 当前 `/api/health` 为公开接口（无需登录）。后续业务接口如需鉴权，会在对应接口单独标注 |

### 环境信息（Day 15 定）

| 项 | 值 |
|---|---|
| 环境 ID | `fallsnow-d4gwz9mht57ea9014` |
| 后端网关域名 | `https://fallsnow-d4gwz9mht57ea9014-1499380185.ap-shanghai.app.tcloudbase.com` |
| 前端静态托管域名 | `https://fallsnow-d4gwz9mht57ea9014-1499380185.tcloudbaseapp.com` |
| 平台 | 腾讯云 CloudBase（免费体验版，到期 2027-04-01） |

---

## 1. 健康检查 `/api/health`

- **用途**：探活。确认后端服务在公网上正常运行。
- **方法**：`GET`
- **路径**：`/api/health`
- **鉴权**：无（公开访问）
- **请求参数**：无

**完整地址示例**

```
https://fallsnow-d4gwz9mht57ea9014-1499380185.ap-shanghai.app.tcloudbase.com/api/health
```

**响应示例（200）**

```json
{
  "status": "ok",
  "service": "wordworld",
  "time": "2026-10-01T16:04:29.204Z"
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | string | 固定 `"ok"`，表示服务健康 |
| `service` | string | 服务名，固定 `"wordworld"` |
| `time` | string | 服务器当前时间（UTC），每次请求都会变化 |

**错误响应示例（未来约定，当前不触发）**

```json
{
  "code": "ERROR_CODE",
  "message": "错误说明"
}
```

---

## 2. 素材库列表 `/api/assets`（Day 17 新增）

- **用途**：读取素材库全部素材（世界里能造的东西「种类」，一条 = assets 表一行）
- **方法**：`GET`
- **路径**：`/api/assets`
- **鉴权**：公网可访问（HTTP 网关路由）；云函数通过环境变量 `CLOUDBASE_API_KEY` 连数据库，密钥不进代码、不进仓库
- **请求参数**（可选）

| 参数 | 类型 | 说明 |
|---|---|---|
| `limit` | number | 返回条数上限，1–100，不传返回全部 |

**完整地址示例**

```
https://fallsnow-d4gwz9mht57ea9014-1499380185.ap-shanghai.app.tcloudbase.com/api/assets
https://fallsnow-d4gwz9mht57ea9014-1499380185.ap-shanghai.app.tcloudbase.com/api/assets?limit=5
```

**响应示例（200）**

```json
{
  "ok": true,
  "data": [
    {
      "id": "tree-01",
      "name_en": "Oak Tree",
      "category": "nature",
      "source": "preset",
      "variant_params": null
    }
  ]
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|---|---|---|
| `ok` | boolean | 请求是否成功 |
| `data` | array | 素材列表 |
| `data[].id` | string | 素材 ID，如 `tree-01` |
| `data[].name_en` | string | 素材英文名 |
| `data[].category` | string | 类别：nature / building / animal / prop |
| `data[].source` | string | 来源：preset（预制）/ ai_generated |
| `data[].variant_params` | object/null | AI 生成素材的变体参数，预制素材为 null |

**错误响应（500）**

```json
{ "ok": false, "error": { "code": "DB_QUERY_FAILED", "message": "..." } }
```

---

## 3. 收藏列表 `/api/favorites`（Day 17 新增）

- **用途**：读取收藏的场景物体。收藏对象 = 摆好的具体物体（外键 `object_id → scene_objects.id`），Day 17 拍板
- **方法**：`GET`
- **路径**：`/api/favorites`
- **鉴权**：同 `/api/assets`
- **请求参数**：无

**完整地址示例**

```
https://fallsnow-d4gwz9mht57ea9014-1499380185.ap-shanghai.app.tcloudbase.com/api/favorites
```

**响应示例（200）**——主查询按「收藏 → 物体 → 素材」外键链嵌套展开：

```json
{
  "ok": true,
  "data": [
    {
      "id": "fav-0001",
      "object_id": "obj-0001",
      "created_at": "2026-10-03T15:00:00.000+00:00",
      "scene_objects": {
        "id": "obj-0001",
        "asset_id": "tree-01",
        "pos_x": 3, "pos_y": 0, "pos_z": -2,
        "rotation": 0, "scale": 1,
        "assets": { "id": "tree-01", "name_en": "Oak Tree", "category": "nature" }
      }
    }
  ]
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|---|---|---|
| `data[].id` | string | 收藏记录 ID，如 `fav-0001` |
| `data[].object_id` | string | 收藏的场景物体 ID（外键） |
| `data[].created_at` | string | 收藏时间（ISO 8601） |
| `data[].scene_objects` | object | 关联展开的物体详情（位置/旋转/缩放） |
| `data[].scene_objects.assets` | object | 该物体所用素材（ID/英文名/类别） |

> 降级约定：若网关暂不支持嵌套展开，接口自动退回只返回 favorites 本表字段（无 `scene_objects` 键），收藏列表功能不受影响。

---

## 4. 后续接口占位（Day 18–20 补充）

| 接口 | 用途 | 计划 |
|---|---|---|
| `POST /api/favorites` | 收藏写入（前端点收藏 → 入库） | Day 18 |
| （待定） | 跨域细化 / 用户态鉴权 | Day 18–20 |
