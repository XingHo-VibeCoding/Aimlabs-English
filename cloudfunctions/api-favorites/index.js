/**
 * /api/favorites —— 收藏接口（CloudBase HTTP 函数版，Day 17 读 + Day 18 写；Day 19 重构拆出数据层）
 *
 * 收藏的对象是「场景物体」：favorites.object_id -> scene_objects.id
 * （Day 17 拍板：收藏摆好的具体物体，不是素材种类）
 *
 * 四个方法：
 *   GET    /api/favorites     —— 读收藏列表，把「收藏 → 物体 → 素材」外键链一起取回（跳过已软删除）
 *   POST   /api/favorites     —— 新增一条收藏（Day 18），接收 { object_id }
 *   PATCH  /api/favorites/:id —— 修改一条收藏指向的物体（Day 22），只开放 object_id
 *   DELETE /api/favorites/:id —— 软删除一条收藏（Day 22），置 is_deleted=true 而非真删
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

/**
 * 从 db.js 返回的 result 里提取数据库 SQLSTATE 错误码（如 23505 / 23503）。
 * PostgREST 把「唯一冲突」和「外键冲突」都映射成 HTTP 409，光看 status 分不清，
 * 必须看错误体里的 code（PostgreSQL 的 5 位错误码）。
 *
 * 双保险（Day 24 定位）：优先读 body.code；万一网关把 code 包在不同字段，
 * 再用 body.message 里的关键词兜底识别，保证两种冲突不会混。
 *
 * @param {{ok:boolean,status:number,body:any}} result
 * @returns {string|null} 形如 '23505' 的错误码；识别不出返回 null
 */
function dbErrCode(result) {
  const body = result && result.body;
  if (!body) return null;

  // 路径 1：body.code 是 PostgreSQL 的 5 位 SQLSTATE（如 23505/23503）才采用。
  // 注意不能「有 code 就用」：万一网关返回自己的错误代号（非数字），
  // 会遮住下面的 message 兜底，导致两种冲突都掉进 500（Day 24 实测教训）。
  const c = body.code;
  if (c !== undefined && c !== null && /^\d{5}$/.test(String(c))) {
    return String(c);
  }

  // 路径 2：body.message 里含数据库英文报错，用关键词兜底
  const msg = String(body.message || body.msg || '');
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) return '23505';
  if (msg.includes('foreign key') || msg.includes('violates foreign')) return '23503';

  return null;
}

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
  // 跨域说明（Day 20 修正）：不再手写 Access-Control-Allow-Origin，交给网关自动回。
  // 手写会和网关拼成多值无效头（如 "origin,*"），反被浏览器拦截。
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 浏览器跨域预检（OPTIONS）：直接放行，让 PATCH/DELETE 能带 JSON body 发过来
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
      console.error('[api-favorites] GET failed:', err && err.message);
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          ok: false,
          error: { code: 'DB_QUERY_FAILED', message: '读取收藏失败，请稍后重试' },
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

      // 出错时按「数据库 SQLSTATE 错误码」精确区分，而不是只看 HTTP 状态码。
      // 因为 PostgREST 把「唯一冲突 23505」和「外键冲突 23503」都映射成 HTTP 409，
      // 只看 status 会分不清（Day 24 修复：改成不存在的物体会被误报成「已收藏」）。
      const sqlstate = dbErrCode(result);

      // 唯一约束冲突 23505：同一个物体再收藏一次 → 明确拒绝
      if (sqlstate === '23505') {
        res.statusCode = 409;
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'DUPLICATE_FAVORITE', message: '这个物体你已经收藏过了' },
          })
        );
        return;
      }

      // 外键约束冲突 23503：object_id 指向的物体不存在 → 单独提示，别和「已收藏」混为一谈
      if (sqlstate === '23503') {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'OBJECT_NOT_FOUND', message: '这个物体不存在，无法收藏' },
          })
        );
        return;
      }

      // 其他数据库错误
      if (!result.ok) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'DB_INSERT_FAILED', message: '收藏失败，请稍后重试' },
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
      console.error('[api-favorites] POST failed:', err && err.message);
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          ok: false,
          error: { code: 'DB_INSERT_FAILED', message: '收藏失败，请稍后重试' },
        })
      );
    }
    return;
  }

  // ============ 分支 3：PATCH —— 修改收藏指向的物体（Day 22 新增） ============
  if (req.method === 'PATCH') {
    try {
      // 从路径里抠出 id：/api/favorites/fav-0001 -> fav-0001
      // 说明：网关转发时可能已剥掉 /api/favorites 前缀，req.url 只剩 /fav-0001，
      //   所以不校验倒数第二段，直接取路径最后一段当 id（网关已保证路由正确）。
      const url = new URL(req.url, 'http://localhost');
      const seg = url.pathname.split('/').filter(Boolean);
      const id = seg[seg.length - 1];

      if (!id) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: { code: 'MISSING_ID', message: '缺少收藏记录 ID' } }));
        return;
      }

      // 读 body，解析要改的字段
      const raw = await readBody(req);
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: { code: 'INVALID_JSON', message: '请求体不是合法的 JSON' } }));
        return;
      }

      const objectId = payload.object_id;

      // 校验：object_id 必填且为字符串（只开放这一个字段，其余一律忽略）
      if (objectId === undefined || objectId === null || String(objectId).trim() === '') {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: { code: 'MISSING_FIELD', message: '缺少必填字段 object_id' } }));
        return;
      }
      if (typeof objectId !== 'string') {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: { code: 'INVALID_FIELD', message: 'object_id 必须是字符串' } }));
        return;
      }

      console.log(`[PATCH /api/favorites] id=${id} object_id=${objectId} at ${new Date().toISOString()}`);

      const result = await db.updateFavorite(id, objectId);

      // 同 POST：按 SQLSTATE 错误码精确区分，不看笼统的 status===409。
      // 唯一冲突 23505（改成已收藏物体）和外键冲突 23503（改成不存在的物体）
      // 在 PostgREST 里都是 HTTP 409，只有 body.code 能区分（Day 24 修复）。
      const sqlstate = dbErrCode(result);

      // 唯一约束冲突 23505：改成「已被别的收藏指向的物体」
      if (sqlstate === '23505') {
        res.statusCode = 409;
        res.end(JSON.stringify({
          ok: false,
          error: { code: 'DUPLICATE_FAVORITE', message: '这个物体已经被收藏过了' },
        }));
        return;
      }

      // 外键约束冲突 23503：改成「不存在的物体」
      if (sqlstate === '23503') {
        res.statusCode = 400;
        res.end(JSON.stringify({
          ok: false,
          error: { code: 'OBJECT_NOT_FOUND', message: '这个物体不存在，无法修改' },
        }));
        return;
      }

      // 目标行不存在：PostgREST 会返回 200 但空数组（更新 0 行）
      const updated = Array.isArray(result.body) ? result.body[0] : null;
      if (result.ok && !updated) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: '没有这条收藏记录' } }));
        return;
      }

      if (!result.ok) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          ok: false,
          error: { code: 'DB_UPDATE_FAILED', message: '修改收藏失败，请稍后重试' },
        }));
        return;
      }

      // 成功：返回改之后的那一行
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, data: updated }));
    } catch (err) {
      console.error('[api-favorites] PATCH failed:', err && err.message);
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: { code: 'DB_UPDATE_FAILED', message: '修改收藏失败，请稍后重试' } }));
    }
    return;
  }

  // ============ 分支 4：DELETE —— 软删除收藏（Day 22 新增） ============
  if (req.method === 'DELETE') {
    try {
      // 同 PATCH：网关可能已剥掉前缀，直接取路径最后一段当 id
      const url = new URL(req.url, 'http://localhost');
      const seg = url.pathname.split('/').filter(Boolean);
      const id = seg[seg.length - 1];

      if (!id) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: { code: 'MISSING_ID', message: '缺少收藏记录 ID' } }));
        return;
      }

      console.log(`[DELETE /api/favorites] id=${id} at ${new Date().toISOString()}`);

      // 软删除：不是真删行，而是把 is_deleted 置 true（删错可找回）
      const result = await db.softDeleteFavorite(id);

      const updated = Array.isArray(result.body) ? result.body[0] : null;
      if (result.ok && !updated) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: '没有这条收藏记录' } }));
        return;
      }

      if (!result.ok) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          ok: false,
          error: { code: 'DB_DELETE_FAILED', message: '删除收藏失败，请稍后重试' },
        }));
        return;
      }

      // 成功：返回被软删除的那一行（is_deleted 已是 true）
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, data: updated }));
    } catch (err) {
      console.error('[api-favorites] DELETE failed:', err && err.message);
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: { code: 'DB_DELETE_FAILED', message: '删除收藏失败，请稍后重试' } }));
    }
    return;
  }

  // ============ 其他方法：拒绝 ============
  res.statusCode = 405;
  res.end(
    JSON.stringify({
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET、POST、PATCH 和 DELETE' },
    })
  );
});

// 端口必须是 9000：云函数容器的 scf_bootstrap 约定监听这个端口（和 api-health 相同）
server.listen(9000, () => {
  console.log('api-favorites is listening on port 9000');
});
