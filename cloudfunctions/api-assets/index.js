/**
 * /api/assets —— 素材库读接口（CloudBase HTTP 函数版，Day 17）
 *
 * 它在作品里的位置：前端「我的世界」/素材画廊将来要从这里拿真数据，
 * 取代 src/data/mockWorldItems.js 里的本地假数据。
 *
 * 怎么连数据库：这个环境的新版 PostgreSQL 不用「host + 密码直连」，
 * 而是访问官方 REST 网关（类比：数据库开了个食堂取餐窗口）：
 *   https://<环境ID>.api.tcloudbasegateway.com/v1/rdb/rest/<表名>
 * 请求头带 API Key（类比员工卡，对应 service_role 管理员角色）。
 * Key 存在云函数「环境变量」CLOUDBASE_API_KEY 里（控制台函数配置处粘贴），
 * 不写进代码、不进 git —— AGENTS.md 第 5.3 条。
 */
const http = require('http');

// 数据库 REST 网关地址（环境 ID 不是机密，公网域名本来就含它）
const DB_BASE = 'https://fallsnow-d4gwz9mht57ea9014.api.tcloudbasegateway.com/v1/rdb/rest';
// API Key：只从环境变量读，绝不硬编码。
// 兼容三个常见变量名：手动配的 CLOUDBASE_API_KEY（推荐），
// 以及控制台「API Key 设置」开关可能注入的 CLOUDBASE_APIKEY / TCB_API_KEY
const API_KEY =
  process.env.CLOUDBASE_API_KEY ||
  process.env.CLOUDBASE_APIKEY ||
  process.env.TCB_API_KEY;

const server = http.createServer(async (req, res) => {
  // 允许跨域：前端静态托管的域名和接口域名不同，浏览器默认会拦，加这个头才放行
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 读接口只认 GET，其他方法一律拒绝
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported' },
    }));
    return;
  }

  try {
    // 余力加练：支持 ?limit=5 限制返回条数（PostgREST 原生认 limit 参数，直接转发）
    // 上限锁 100，防止一次把整库拖走
    const url = new URL(req.url, 'http://localhost');
    const limitRaw = parseInt(url.searchParams.get('limit'), 10);
    const limit =
      Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : null;

    const query = limit ? `?select=*&limit=${limit}` : '?select=*';

    // 取餐：GET /v1/rdb/rest/assets?select=*，Authorization 头出示员工卡
    const r = await fetch(`${DB_BASE}/assets${query}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const text = await r.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch (e) {
      /* 网关偶发返回非 JSON，落到底部错误分支统一处理 */
    }

    if (!r.ok) {
      // PostgREST 出错时返回 {code, message, ...}，把 message 带回去好排障
      throw new Error((body && body.message) || `gateway HTTP ${r.status}`);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: body }));
  } catch (err) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        ok: false,
        error: { code: 'DB_QUERY_FAILED', message: String((err && err.message) || err) },
      })
    );
  }
});

// 端口必须是 9000：云函数容器的 scf_bootstrap 约定监听这个端口（和 api-health 相同）
server.listen(9000, () => {
  console.log('api-assets is listening on port 9000');
});
