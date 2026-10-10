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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),           -- 收藏时间（不传就自动填当前时刻）
    is_deleted BOOLEAN NOT NULL DEFAULT false                -- ★ 软删除标记（Day 22）：true=已删，查询时跳过；删错可改回 false 找回
);

-- ---------------------------------------------------------------
-- 1b. 防重复收藏（Day 18 新增）：
--   给 object_id 加唯一约束 —— 同一个场景物体只能被收藏一次。
--   靠数据库兜底拦截重复提交，比「代码里先查后插」更稳（并发也不会漏）。
--   重复插入会触发唯一冲突，错误码 23505，代码据此返回「已收藏」。
--   注意：IF NOT EXISTS 不会补加约束，若表已在旧结构建过，
--   需单独执行一句 ALTER TABLE（见文件末尾的 Day 18 迁移块）。
-- ---------------------------------------------------------------
ALTER TABLE favorites ADD CONSTRAINT favorites_object_id_key UNIQUE (object_id);

-- ---------------------------------------------------------------
-- 2. 授权：让后端 API Key（service_role 角色）能读写这些表
--    Day 17 只给了 SELECT（读接口够用）；Day 18 开始写库，
--    给 favorites 补 INSERT（POST 收藏要插入新行）。
--    assets / scene_objects 仍是只读，Day 18 不需要写它们。
-- ---------------------------------------------------------------
GRANT SELECT ON public.favorites     TO service_role;
GRANT SELECT ON public.assets        TO service_role;
GRANT SELECT ON public.scene_objects TO service_role;
GRANT INSERT ON public.favorites     TO service_role;   -- Day 18：允许写入收藏
GRANT UPDATE ON public.favorites     TO service_role;   -- Day 22：允许改收藏（PATCH object_id / 软删除标记）
GRANT DELETE ON public.favorites     TO service_role;   -- Day 22：预留硬删除能力（本期软删除用 UPDATE，此项为完整性）

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

-- =====================================================================
-- Day 18 迁移块（表在 Day 17 已建成、不想清空重跑时的补丁）
-- =====================================================================
-- 若 favorites 表在跑过 Day 17 版本后已经存在，上面的
--   CREATE TABLE IF NOT EXISTS 会跳过建表，但唯一约束和 INSERT 授权
--   也不会自动补上。这时单独执行下面两句即可（幂等：重复跑会报
--   “已存在”，忽略即可；约束/授权存在与否可用 \d 与 \du 查）。
--   推荐直接整文件重跑（前面有 DELETE FROM favorites），更省心。

-- ALTER TABLE favorites ADD CONSTRAINT favorites_object_id_key UNIQUE (object_id);
-- GRANT INSERT ON public.favorites TO service_role;

-- =====================================================================
-- Day 22 迁移块（表已存在、不想清空重跑时的补丁）
-- =====================================================================
-- 给 favorites 加软删除字段 is_deleted，并补 UPDATE / DELETE 授权。
-- 若表已建成（没有 is_deleted 列），单独执行下面三句即可：
--   1) 加列（默认 false，历史数据视为「未删除」）
--   2) 补 UPDATE 授权（PATCH 改 object_id 与软删除都要用）
--   3) 补 DELETE 授权（预留硬删除能力）

-- ALTER TABLE favorites ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
-- GRANT UPDATE ON public.favorites TO service_role;
-- GRANT DELETE ON public.favorites TO service_role;
