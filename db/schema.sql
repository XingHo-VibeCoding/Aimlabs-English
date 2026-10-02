-- =====================================================================
-- WordWorld 数据库建表脚本（schema.sql）
-- 数据库：CloudBase SQL 型数据库（PostgreSQL）
-- 用途：Week 3 · Day 16 建两张核心表
--   表 1：assets          —— 素材表（库里有哪几种东西）
--   表 2：scene_objects   —— 场景物体表（场景里摆出的每个物体）
-- 关联：scene_objects.asset_id -> assets.id
-- 对应 PRD：§7.1（场景物体）、§7.2（素材）
-- =====================================================================

-- ---------------------------------------------------------------
-- 表 1：assets（素材表）
-- 一条记录 = 素材库里的「一种东西」（树、房子、城堡……各一条）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id             TEXT PRIMARY KEY,           -- 素材唯一 ID，如 tree-01（PRD §7.2 示例）
    name_en        TEXT NOT NULL,              -- 英文名，界面显示 + 英文输入的参照词
    category       TEXT NOT NULL,              -- 类别：nature / building / animal / prop
    source         TEXT NOT NULL,              -- 来源：preset（预制）/ ai_generated（AI 生成）
    variant_params JSONB                       -- 变体参数（仅 AI 生成来源有）：颜色、尺寸等，结构不固定
);

-- ---------------------------------------------------------------
-- 表 2：scene_objects（场景物体表）
-- 一条记录 = 场景里实际摆出的「一个物体」（摆 3 棵树 = 3 条记录）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scene_objects (
    id             TEXT PRIMARY KEY,           -- 物体唯一 ID，如 obj-0001（PRD §7.1 示例）
    asset_id       TEXT NOT NULL REFERENCES assets(id),  -- ★ 关联字段：这个物体用的是哪个素材
    pos_x          REAL NOT NULL,              -- 位置：左右坐标
    pos_y          REAL NOT NULL,              -- 位置：高度坐标
    pos_z          REAL NOT NULL,              -- 位置：前后坐标
    rotation       REAL NOT NULL,              -- 绕垂直轴旋转角度（度）
    scale          REAL NOT NULL               -- 缩放倍数（相对素材原始大小）
);
