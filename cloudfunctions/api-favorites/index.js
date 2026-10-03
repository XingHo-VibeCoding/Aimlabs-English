/**
 * /api/favorites —— 收藏列表读接口（CloudBase HTTP 函数版，Day 17）
 *
 * 收藏的对象是「场景物体」：favorites.object_id -> scene_objects.id
 * （Day 17 拍板：收藏摆好的具体物体，不是素材种类）
 *
 * 和 /api/assets 的区别：这里不只读一张表，而是把「收藏 → 物体 → 素材」
 * 一条外键链一起取回来（PostgREST 的嵌套展开写法）。
 * 返回的每条收藏都自带物体位置和素材名字，前端拿来就能显示。
 */
const http = require('http');

// 数据库 REST 网关地址 + API Key（同 api-assets，Key 只从环境变量读）
const DB_BASE = 'https://fallsnow-d4gwz9mht57ea9014.api.tcloudbasegateway.com/v1/rdb/rest';
// 兼容三个常见变量名：手动配的 CLOUDBASE_API_KEY（推荐），
// 以及控制台「API Key 设置」开关可能注入的 CLOUDBASE_APIKEY / TCB_API_KEY
const API_KEY =
  process.env.CLOUDBASE_API_KEY ||
  process.env.CLOUDBASE_APIKEY ||
  process.env.TCB_API_KEY;

// 嵌套展开：收藏自身字段 + 关联的 scene_objects + 物体用的 assets
// 语法是 PostgREST 的 select 写法：外键表名(字段...)，可以一层套一层
const EMBED_SELECT =
  'id,object_id,created_at,' +
  'scene_objects(id,asset_id,pos_x,pos_y,pos_z,rotation,scale,' +
  'assets(id,name_en,category))';

/** 查一次数据库：select 传什么就查什么，统一在这里加员工卡 */
async function queryFavorites(select) {
  const r = await fetch(
    `${DB_BASE}/favorites?select=${encodeURIComponent(select)}`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  const text = await r.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch (e) {
    /* 忽略非 JSON，交给调用方判断 */
  }
  return { ok: r.ok, status: r.status, body };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported' },
    }));
    return;
  }

  try {
    // 第一次尝试：带嵌套展开（收藏 + 物体 + 素材一次拿全）
    let result = await queryFavorites(EMBED_SELECT);

    // 降级：如果网关不支持嵌套展开（或外键没被识别），
    // 退回只查 favorites 本表，保证接口至少能返回收藏列表本身
    if (!result.ok) {
      console.error('embed query failed, fallback to plain select:', JSON.stringify(result.body));
      result = await queryFavorites('*');
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
});

// 端口必须是 9000：云函数容器的 scf_bootstrap 约定监听这个端口（和 api-health 相同）
server.listen(9000, () => {
  console.log('api-favorites is listening on port 9000');
});
