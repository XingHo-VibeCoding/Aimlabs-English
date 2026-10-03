-- =====================================================================
-- WordWorld 收藏表（favorites.sql）
-- 数据库：CloudBase SQL 型数据库（PostgreSQL）
-- 用途：Week 3 · Day 17 新建收藏表 + 种子数据
--   收藏的对象是「场景物体」：favorites.object_id -> scene_objects.id
--   （Day 17 拍板：收藏摆好的具体物体，不是素材种类）
-- 可重复执行：先建表（IF NOT EXISTS）→ 清空 → 插入，跑多少次结果一致
-- ⚠ 顺序提醒：favorites 引用了 scene_objects。以后若重跑 Day 16 的
--   db/seed.sql（它会 DELETE scene_objects），必须先执行本文件的
--   DELETE FROM favorites，否则会触发外键约束 23503。
-- 对应接口：GET /api/favorites（Day 17 读）；写入留到 Day 18
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. 建表（IF NOT EXISTS：已存在就跳过，保证脚本可重复执行）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    id         TEXT PRIMARY KEY,                             -- 收藏记录 ID，如 fav-0001
    object_id  TEXT NOT NULL REFERENCES scene_objects(id),   -- ★ 关联字段：收藏的是哪个场景物体
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()            -- 收藏时间（不传就自动填当前时刻）
);

-- ---------------------------------------------------------------
-- 2. 授权：让后端 API Key（service_role 角色）能读这些表
--    favorites 是今天新建的；assets / scene_objects 是 Day 16
--    建的，当时没授权，这里一并补上（读接口只需要 SELECT）
-- ---------------------------------------------------------------
GRANT SELECT ON public.favorites     TO service_role;
GRANT SELECT ON public.assets        TO service_role;
GRANT SELECT ON public.scene_objects TO service_role;

-- ---------------------------------------------------------------
-- 3. 清空旧种子（可重复执行的关键；favorites 没有被别人引用，可放心删）
-- ---------------------------------------------------------------
DELETE FROM favorites;

-- ---------------------------------------------------------------
-- 4. 种子数据：3 条收藏，指向 Day 16 已入库的物体
--    fav-0001 收藏了橡树（3 棵树里的第 1 棵）
--    fav-0002 收藏了城堡
--    fav-0003 收藏了木屋
-- ---------------------------------------------------------------
INSERT INTO favorites (id, object_id) VALUES
    ('fav-0001', 'obj-0001'),
    ('fav-0002', 'obj-0004'),
    ('fav-0003', 'obj-0003');
