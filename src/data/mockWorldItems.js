// 本地假数据（mock）—— 第 3 周换成真实 API 前的占位
// 每条 = 用户输入的一句英文 + 它生成的物体信息
// 字段：id / phrase(用户输入的英文) / type(物体类型) / color(颜色) / scale(大小) / createdAt(创建时间)

export const MOCK_WORLD_ITEMS = [
  {
    id: 'item-001',
    phrase: 'a red tree',
    type: 'tree',
    color: 0xff4d4d,
    scale: 1.0,
    createdAt: '2026-09-22 14:30',
  },
  {
    id: 'item-002',
    phrase: 'a big house',
    type: 'house',
    color: 0xffffff,
    scale: 1.8,
    createdAt: '2026-09-22 15:05',
  },
  {
    id: 'item-003',
    phrase: 'a tiny cat',
    type: 'cat',
    color: 0xf48fb1,
    scale: 0.5,
    createdAt: '2026-09-23 09:12',
  },
  {
    id: 'item-004',
    phrase: 'a blue rock',
    type: 'rock',
    color: 0x42a5f5,
    scale: 0.9,
    createdAt: '2026-09-23 10:40',
  },
  {
    id: 'item-005',
    phrase: 'a green mountain',
    type: 'mountain',
    color: 0x4caf50,
    scale: 2.5,
    createdAt: '2026-09-23 11:20',
  },
  {
    id: 'item-006',
    phrase: 'a yellow ball',
    type: 'ball',
    color: 0xffd54f,
    scale: 0.7,
    createdAt: '2026-09-23 11:45',
  },
]
