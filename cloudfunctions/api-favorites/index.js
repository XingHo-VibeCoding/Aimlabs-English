/**
 * /api/favorites —— 收藏接口（CloudBase HTTP 函数版，Day 17 读 + Day 18 写；Day 19 重构拆出数据层）
 *
 * 收藏的对象是「场景物体」：favorites.object_id -> scene_objects.id
 * （Day 17 拍板：收藏摆好的具体物体，不是素材种类）
 *
 * 两个方法：
 *   GET  /api/favorites  —— 读收藏列表，把「收藏 → 物体 → 素材」外键链一起取回
 *   POST /api/favorites  —— 新增一条收藏（Day 18），接收 { object_id }
 *
 * Day 18 防重复提交：数据库 favorites.object_id 加了唯一约束，
 *   同一个物体收藏两次会触发唯一冲突（错误码 23505），
 *   这里捕获后返回「已收藏」提示 —— 靠数据库兜底，并发也不会漏。
 *
 * Day 19 重构：连数据库的代码（连接地址、API Key、queryFavorites /
 *   insertFavorite 两个查询函数）已全部移走，收进同目录的 db.js。
 *   本文件现在只干接口层的活：收请求 → 校验 → 调 db.xxx → 回 JSON。
 */
const http = require('http');
const db = require('./db');

// 嵌套展开：收藏自身字段 + 关联的 scene_objects + 物体用的 assets
// 语法是 PostgREST 的 select 写法：外键表名(字段...)，可以一层套一层
const EMBED_SELECT =
  'id,object_id,created_at,' +
  'scene_objects(id,asset_id,pos_x,pos_y,pos_z,rotation,scale,' +
  'assets(id,name_en,category))';

/** 读请求体（把网络过来的字节攒成字符串，再安全解析成对象） */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // 防御：请求体超大直接掐断，不让人塞一坨东西进来
      if (raw.length > 1e6) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 浏览器跨域预检（OPTIONS）：直接放行，让 POST 能带 JSON body 发过来
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  // ============ 分支 1：GET —— 读收藏列表（Day 17 已有） ============
  if (req.method === 'GET') {
    try {
      let result = await db.queryFavorites(EMBED_SELECT);

      // 降级：网关不支持嵌套展开时，退回只查本表
      if (!result.ok) {
        console.error('embed query failed, fallback to plain select:', JSON.stringify(result.body));
        result = await db.queryFavorites('*');
      }

      if (!result.ok) {
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
    return;
  }

  // ============ 分支 2：POST —— 新增收藏（Day 18 新增） ============
  if (req.method === 'POST') {
    try {
      const raw = await readBody(req);
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch (e) {
        // 请求体不是合法 JSON
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'INVALID_JSON', message: '请求体不是合法的 JSON' },
          })
        );
        return;
      }

      const objectId = payload.object_id;

      // 校验 1：缺必填字段 —— 提示必须是中文（完成标准要求）
      if (objectId === undefined || objectId === null || String(objectId).trim() === '') {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'MISSING_FIELD', message: '缺少必填字段 object_id' },
          })
        );
        return;
      }

      // 校验 2：类型必须是字符串（防数组/对象这类错误输入）
      if (typeof objectId !== 'string') {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'INVALID_FIELD', message: 'object_id 必须是字符串' },
          })
        );
        return;
      }

      // 余力加练：记一条服务端日志，方便以后排查「谁在什么时候收藏了什么」
      console.log(`[POST /api/favorites] object_id=${objectId} at ${new Date().toISOString()}`);

      const result = await db.insertFavorite(objectId);

      // 重复提交：唯一约束冲突（PostgREST 错误码 23505，HTTP 409）
      // 同一个物体再收藏一次 → 明确拒绝，库里不会多一行
      if (!result.ok && result.status === 409) {
        res.statusCode = 409;
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'DUPLICATE_FAVORITE', message: '这个物体你已经收藏过了' },
          })
        );
        return;
      }

      // 其他数据库错误（比如 object_id 指向不存在的物体 → 外键 23503）
      if (!result.ok) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            ok: false,
            error: {
              code: 'DB_INSERT_FAILED',
              message: String((result.body && result.body.message) || `gateway HTTP ${result.status}`),
            },
          })
        );
        return;
      }

      // 成功：返回 ok:true 和新增的那行（形状与 api-contract.md 一致）
      const created = Array.isArray(result.body) ? result.body[0] : result.body;
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          data: created,
        })
      );
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          ok: false,
          error: { code: 'DB_INSERT_FAILED', message: String((err && err.message) || err) },
        })
      );
    }
    return;
  }

  // ============ 其他方法：拒绝 ============
  res.statusCode = 405;
  res.end(
    JSON.stringify({
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET 和 POST' },
    })
  );
});

// 端口必须是 9000：云函数容器的 scf_bootstrap 约定监听这个端口（和 api-health 相同）
server.listen(9000, () => {
  console.log('api-favorites is listening on port 9000');
});
