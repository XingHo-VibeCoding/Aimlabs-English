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

## 2. 后续接口占位（Day 16–20 补充）

> 以下接口尚未实现，仅登记规划，后续按第 0 节格式补全细节。

| 接口 | 用途 | 计划 |
|---|---|---|
| （待定） | 真实业务接口 | Day 16–20 |
| （待定） | 数据库建表 | Day 16–20 |
| （待定） | 跨域配置 | Day 16–20 |
