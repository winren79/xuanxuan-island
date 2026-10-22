#!/usr/bin/env python3
"""由 math/data.js 自动生成 math/auto_levels.js：每章错题按 ~5 题切成小关（原题+变式），顺序解锁。
sync_math.py 每次运行后自动调用；也可单独运行。"""
import json, pathlib, math
ROOT = pathlib.Path(__file__).resolve().parent.parent
PER = 5
CH = [("ch1", "勾股"), ("ch2", "实数"), ("ch3", "坐标"), ("ch4", "一次函数")]
# 「综合」类错题的章节归属（按主要考点）
OVERRIDE = {"LX-19c": "ch1", "LX-20c": "ch1", "FX2-13": "ch1", "FX3-13": "ch1", "FX1-19": "ch4"}
ICON = {"ch1": "📐", "ch2": "√", "ch3": "📍", "ch4": "📈"}
def chapter_of(it):
    if it["id"] in OVERRIDE: return OVERRIDE[it["id"]]
    for cid, kw in CH:
        if kw in it.get("章节", ""): return cid
    return "ch4" if "函数" in it.get("知识点", "") else "ch1"
def main():
    s = (ROOT / "math/data.js").read_text(encoding="utf-8")
    items = json.loads(s[s.index("{"):s.rstrip().rindex(";")])["items"]
    groups = {c: [] for c, _ in CH}
    for it in items: groups[chapter_of(it)].append(it["id"])
    for c in groups: groups[c].sort()   # 稳定顺序：按编号，新错题插入后已玩关卡变化最小
    levels, chap = [], {}
    for c, ids in groups.items():
        n = max(1, math.ceil(len(ids) / PER)) if ids else 0
        size = math.ceil(len(ids) / n) if n else 0
        chap[c] = []
        for k in range(n):
            part = ids[k*size:(k+1)*size]
            if not part: continue
            lid = f"auto_{c}_{k+1:02d}"
            levels.append(dict(id=lid, title=f"错题小关 {k+1}（{len(part)}题）", file=f"auto.html?lv={lid}",
                               icon=ICON[c], auto=True, seq=True, items=part))
            chap[c].append(lid)
    js = ("// 由 tools/gen_auto_levels.py 自动生成，请勿手改\n"
          "window.MATH_AUTO = " + json.dumps(dict(levels=levels, chapters=chap), ensure_ascii=False) + ";\n"
          "(function(){var A=window.MATH_AUTO;window.MATH_LEVELS=window.MATH_LEVELS||[];\n"
          " A.levels.forEach(function(l){window.MATH_LEVELS.push(l);});\n"
          " (window.MATH_CHAPTERS||[]).forEach(function(c){var a=A.chapters[c.id];if(a)c.levels=a.concat(c.levels.filter(function(x){return a.indexOf(x)<0;}));});})();\n")
    (ROOT / "math/auto_levels.js").write_text(js, encoding="utf-8")
    for c, _ in CH:
        print(f"{c}: {len(groups[c])} 题 → {len(chap[c])} 小关")
if __name__ == "__main__": main()
