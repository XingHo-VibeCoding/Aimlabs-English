/**
 * /api/assets —— 素材库读接口（CloudBase HTTP 函数版，Day 17；Day 19 重构拆出数据层）
 *
 * 它在作品里的位置：前端「我的世界」/素材画廊将来要从这里拿真数据，
 * 取代 src/data/mockWorldItems.js 里的本地假数据。
 *
 * Day 19 重构：原来「连数据库」的代码（连接地址、API Key、fetch 取餐）
 * 已经从本文件移走，收进同目录的 db.js（数据访问层）。
 * 本文件现在只干接口层的活：收请求 → 调 db.queryAssets → 回 JSON。
 */
const http = require('http');
const db = require('./db');

const server = http.createServer(async (req, res) => {
  // 跨域说明（Day 20 修正）：这里不再手写 Access-Control-Allow-Origin。
  // 腾讯 HTTP 网关会自动回一条合法的放行头；自己再写一个会和网关拼成
  // "http://localhost:5174,*" 这种多值无效头，反被浏览器拦截。交给网关即可。
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

    // 取餐：调数据访问层拿素材（连接地址 / 员工卡都在 db.js 里，这里不管）
    const result = await db.queryAssets(limit);

    if (!result.ok) {
      // PostgREST 出错时返回 {code, message, ...}，把 message 带回去好排障
      throw new Error((result.body && result.body.message) || `gateway HTTP ${result.status}`);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: result.body }));
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
