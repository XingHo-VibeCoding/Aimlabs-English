/**
 * db.js —— WordWorld 数据访问层（Day 19 从 index.js 里拆出来）
 *
 * 它在作品里的位置：本函数里唯一「跟数据库打交道」的地方（采购员）。
 * index.js 要读写数据，都调这里导出的函数，不再自己写 fetch(...)。
 *
 * 为什么拆：Day 17/18 里，index.js 把「连接地址、API Key、查询逻辑」
 *   和「处理 HTTP 请求」混在一起。现在拆成两层：
 *     index.js = 接口层（收请求 / 校验 / 回 JSON）
 *     db.js    = 数据访问层（只跟数据库打交道）
 *   以后改库地址 / 加查询 / 换鉴权，只动本文件。
 *
 * 怎么连数据库：这个环境的新版 PostgreSQL 不用「host + 密码直连」，
 *   而是访问官方 REST 网关（类比：数据库开了个食堂取餐窗口）：
 *     https://<环境ID>.api.tcloudbasegateway.com/v1/rdb/rest/<表名>
 *   请求头带 API Key（类比员工卡，对应 service_role 管理员角色）。
 *   Key 存在云函数「环境变量」CLOUDBASE_API_KEY 里（控制台函数配置处粘贴），
 *   不写进代码、不进 git —— AGENTS.md 第 5.3 条。
 */

// 数据库 REST 网关地址（环境 ID 不是机密，公网域名本来就含它）
const DB_BASE = 'https://fallsnow-d4gwz9mht57ea9014.api.tcloudbasegateway.com/v1/rdb/rest';

// API Key：只从环境变量读，绝不硬编码。
// 兼容三个常见变量名：手动配的 CLOUDBASE_API_KEY（推荐），
// 以及控制台「API Key 设置」开关可能注入的 CLOUDBASE_APIKEY / TCB_API_KEY
const API_KEY =
  process.env.CLOUDBASE_API_KEY ||
  process.env.CLOUDBASE_APIKEY ||
  process.env.TCB_API_KEY;

/**
 * 底层的「取餐」动作：对网关发起一次请求，把结果规整成统一形状返回。
 * 返回 { ok, status, body }：
 *   ok     —— 网关是否返回成功（HTTP 2xx）
 *   status —— HTTP 状态码（调用方据它区分 409 唯一冲突等）
 *   body   —— 解析好的 JSON；网关偶发返回非 JSON 时为 null
 */
async function request(path, options = {}) {
  const r = await fetch(`${DB_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers || {}),
    },
    ...(options.method ? { method: options.method } : {}),
    ...(options.body ? { body: options.body } : {}),
  });
  const text = await r.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch (e) {
    /* 网关偶发返回非 JSON，body 保持 null，交给调用方判断 */
  }
  return { ok: r.ok, status: r.status, body };
}

/**
 * 查 assets 素材表（GET /api/assets 用）。
 * @param {number|null} limit 返回条数上限；null 表示不限（=全部）
 * @returns {Promise<{ok:boolean,status:number,body:any}>}
 */
function queryAssets(limit) {
  const query = limit ? `?select=*&limit=${limit}` : '?select=*';
  return request(`/assets${query}`);
}

/**
 * 读收藏列表（GET /api/favorites 用）。
 * 嵌套展开：收藏自身字段 + 关联的 scene_objects + 物体用的 assets，
 * 一条外键链一起取回（PostgREST 的 select 写法：外键表名(字段...)）。
 * @param {string} select select 语句（调用方传 EMBED_SELECT 或 '*'）
 */
function queryFavorites(select) {
  return request(`/favorites?select=${encodeURIComponent(select)}`);
}

/**
 * 新增一条收藏（POST /api/favorites 用）。
 * @param {string} objectId 要收藏的场景物体 ID（外键 → scene_objects.id）
 */
function insertFavorite(objectId) {
  return request('/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Prefer: 让网关把完整新行回显回来，前端好拿到 id / created_at
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ object_id: objectId }),
  });
}

// 导出给各云函数用（Node 的 CommonJS 写法）
module.exports = {
  queryAssets,
  queryFavorites,
  insertFavorite,
};
