/* 物理岛章节 —— 示例文件（由开发方提供，物理老师可直接修改/覆盖本文件）
   格式：window.PHYSICS_CHAPTERS = [{ id, title, icon, levels:[PHYSICS_LEVELS 里的关卡 id], locked }]
   - 按数组顺序在地图上从下往上排列，小船沿航线前进；
   - locked:true 显示🔒（还没学到）；levels 为空显示“建设中”；
   - 没写进任何章节的关卡会自动放到最后一个“更多关卡”岛。 */
window.PHYSICS_CHAPTERS = [
  { id: "p1", title: "机械运动",   icon: "🚗", levels: [] },
  { id: "p2", title: "声现象",     icon: "🔔", levels: [] },
  { id: "p3", title: "物态变化",   icon: "🧊", levels: ["melt_lab"] },
  { id: "p4", title: "光现象",     icon: "🌈", levels: [], locked: true },
  { id: "p5", title: "透镜及其应用", icon: "🔍", levels: [], locked: true },
  { id: "p6", title: "质量与密度", icon: "⚖️", levels: [], locked: true }
];
