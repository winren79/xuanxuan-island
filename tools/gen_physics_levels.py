#!/usr/bin/env python3
"""物理岛关卡生成器：读 physics/variants.js（错题变式），生成 physics/level_*.html（XXGame.quiz），
并重写 physics/levels.js、physics/chapters.js（保留 melt_lab）。用法: python3 tools/gen_physics_levels.py"""
import json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent; P = ROOT / "physics"
VAR = json.loads(re.search(r"=\s*(\{.*\})\s*;?\s*$", (P / "variants.js").read_text(encoding="utf-8"), re.S).group(1))
HEAD = '''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>{title}</title><link rel="stylesheet" href="../common.css">
<style>.hud{{display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:bold;padding-right:52px}}
.msg{{min-height:28px;margin:8px 0;font-size:18px}}.hint{{background:#FFF0D6;border-left:6px solid var(--orange);padding:10px;border-radius:10px;margin:8px 0}}
.tag{{display:inline-block;color:#fff;border-radius:10px;padding:2px 10px;font-size:16px}}.big{{font-size:64px;text-align:center;margin:6px 0}}</style></head><body><div class="wrap">
<a class="back" href="index.html">← 返回地图</a>
<div class="hud"><span id="hearts"></span><span id="stage"></span><span id="coins"></span></div>
<div class="grid"><div class="col1"><div class="card scene"><h2>{icon} {title}</h2><div class="big">{scene}</div><p>{intro}</p></div></div>
<div class="card" id="box"></div></div></div>
<script src="../common.js"></script><script src="data.js"></script><script src="levels.js"></script><script src="chapters.js"></script>
<script>
XXGame.quiz({{subject:"physics", levelId:"{id}", items:{items}}});
</script></body></html>
'''
NUM = "①②③④⑤⑥⑦⑧"
def V(q, opts, ans): return dict(q=q, opts=opts, ans=ans)
def it(src, k=0, rev=None, main=None, why=None):
    """src=错题本 id；主题=变式 k（或 main 覆盖）；复活=另一道变式（或 rev 覆盖）。"""
    vs = VAR[src]; m = main or vs[k]
    r = rev or vs[1 - k]
    d = dict(type="mc", q=m["q"], opts=m["opts"], ans=m["ans"], hint=m.get("explain", m.get("hint", "")),
             v=dict(q=r["q"], opts=r["opts"], ans=r["ans"]), src=src)
    if why: d["why"] = dict(zip(["错因", "概念", "公式"], why))
    else: d["whySrc"] = src
    return d
# ---- 自写补充题（复活题/补充小怪），答案见 explain/hint ----
R = {
 "13a": V("司机以 20 m/s 匀速行驶，反应过程中汽车匀速前进了 12 m，反应时间是（　）", ["0.6 s", "1.67 s", "240 s", "0.5 s"], 0),
 "13b": dict(q="司机以 25 m/s 匀速行驶，平时反应时间 0.6 s，制动后还要滑行 35 m 才停下，前方 60 m 处有障碍物。若酒驾使反应时间变为原来的 2 倍（车速不变），则（　）",
             opts=VAR["P0927-13"][1]["opts"], ans=VAR["P0927-13"][1]["ans"], explain=VAR["P0927-13"][1]["explain"]),
 "13b_rev": V("司机以 20 m/s 匀速行驶，平时反应时间 0.6 s，制动后滑行 42 m 停下，前方 60 m 处有障碍物。酒驾时反应时间变为 2 倍，则（　）",
              ["停车距离 54 m，不会撞上", "停车距离 66 m，会撞上", "停车距离 78 m，会撞上", "停车距离 60 m，刚好停住"], 1),
 "1004-6": V("用大小不同的力拨动同一根橡皮筋，比较声音的大小，是在探究（　）", ["响度与振幅的关系", "音调与频率的关系", "音色与材料的关系", "声速与介质的关系"], 0),
 "1004-9": V("下列 v-t 图像中，表示物体做匀速直线运动的是（　）", ["平行于 t 轴的水平直线", "过原点的倾斜直线", "平行于 v 轴的竖直线", "向下倾斜的直线"], 0),
 "1008-9": V("烧瓶连着水平细管、管中有一段液柱的气体温度计，利用的原理和降温时液柱的移动方向是（　）",
             ["气体热胀冷缩；液柱移向烧瓶", "气体热胀冷缩；液柱远离烧瓶", "液体热胀冷缩；液柱移向烧瓶", "气体热胀冷缩；液柱不动"], 0),
 "1008-5b": V("读温度计示数时，下列做法正确的是（　）", ["视线与液柱上表面相平", "从上往下斜着看", "把温度计从液体中取出来读", "先甩一甩再读"], 0),
 "x1": dict(q="衣柜里的樟脑丸放久了会变小甚至消失，发生的物态变化是（　）", opts=["升华", "熔化", "汽化", "凝华"], ans=0,
            explain="樟脑丸由固态直接变成气态，是升华，升华吸热。"),
 "x1_rev": V("冬天室外结冰的湿衣服也能慢慢变干，是因为冰发生了（　）", ["升华", "熔化", "液化", "凝华"], 0),
 "1019-9b_rev": V("冬天从寒冷的室外走进温暖的屋子，眼镜片上起了一层雾，原因是（　）",
                  ["室内水蒸气遇到冷镜片液化", "室外水蒸气液化", "镜片上的水汽化", "室内水蒸气遇到冷镜片凝华成霜"], 0),
}
WX1 = ("把“固态直接变气态”认成熔化或汽化。", "升华：物质从固态直接变成气态，吸热（樟脑丸变小、冰冻衣服变干、干冰变小）。凝华：气态直接变固态，放热（霜、冰花、雾凇）。", "")
LEVELS = [
 ("p1", dict(id="motion_measure", title="测量与速度赛道", icon="🚗", scene="📏⏱️🚗",
   intro="机械运动易错点：读数要带单位、停表分针过半读后半圈；s-t 图越陡越快；v-t 图匀速是水平线；回声、停车距离要分段画图。",
   items=[it("P0927-10"), it("P1018-11"), it("P1004-9", rev=R["1004-9"]), it("P0927-11"), it("P0927-12"),
          it("P0927-13", rev=R["13a"]), it("P0927-13", main=R["13b"], rev=R["13b_rev"])])),
 ("p2", dict(id="sound_traits", title="声音特性音乐会", icon="🎵", scene="🥁🎻🎶",
   intro="声现象易错点：用力大小→响度；长短粗细松紧→音调；认出是谁→音色。吹的是空气柱，敲的是瓶和水。",
   items=[it("P0927-4"), it("P1004-6", rev=R["1004-6"]), it("P0927-14"), it("P1004-10"), it("P1004-17")])),
 ("p2", dict(id="sound_echo", title="回声与噪声探险", icon="📡", scene="📡🌊🔇",
   intro="声的传播易错点：真空不能传声；声速与响度无关；回声测距要除以 2；减弱噪声分声源处、传播中、人耳处。",
   items=[it("P0927-5"), it("P1004-11"), it("P1004-7"), it("P0927-16"), it("P1004-15")])),
 ("p3", dict(id="temp_detective", title="温度计小侦探", icon="🌡️", scene="🌡️🔍",
   intro="温度易错点：液体温度计升温液柱升；气体温度计升温液柱被推离烧瓶；不准的温度计先找 0 ℃、100 ℃ 对应的示数再换算。",
   items=[it("P1008-2"), it("P1008-9", rev=R["1008-9"]), it("P1008-5", k=1, rev=R["1008-5b"]), it("P1008-5"), it("P1019-2")])),
 ("p3", dict(id="melt_freeze", title="熔化凝固冰火关", icon="🔥", scene="🧊🔥",
   intro="熔化凝固易错点：晶体熔化/凝固时温度不变；熔化要达到熔点并继续吸热；熔化吸热、凝固放热。",
   items=[it("P1018-4"), it("P1018-6", k=1, rev=VAR["P1018-6"][0]), it("P1018-12"), it("P1021-10"), it("P1018-14")])),
 ("p3", dict(id="vapor_liquid", title="汽化液化工坊", icon="💨", scene="♨️💧",
   intro="汽化液化易错点：写“汽化”不写“气化”；蒸发是汽化的一种；沸腾要达到沸点并继续吸热；冰箱里汽化吸热、冷凝器里液化放热。",
   items=[it("P1012-1"), it("P1012-2"), it("P1012-4"), it("P1021-4"), it("P1019-5")])),
 ("p3", dict(id="sublimation", title="升华凝华冰雪关", icon="❄️", scene="❄️🌫️",
   intro="升华凝华易错点：写“凝华”不写“凝化”；霜是水蒸气凝华，不是空气；看得见的“白气”是小水滴。",
   items=[it("P1021-3"), None,  # 占位：下方替换为自写升华题
          it("P1021-9"), it("P1019-9", k=0, rev=R["1019-9b_rev"]), it("P1019-9", k=1, rev=VAR["P1019-9"][0])])),
]
# 升华关第二题为自写题（无错题本来源）
x1 = dict(type="mc", q=R["x1"]["q"], opts=R["x1"]["opts"], ans=0, hint=R["x1"]["explain"],
          v=dict(R["x1_rev"]), why=dict(zip(["错因", "概念", "公式"], WX1)), src=None)
LEVELS[-1][1]["items"][1] = x1
for ch, L in LEVELS:
    items = L["items"]
    for i, x in enumerate(items):
        last = i == len(items) - 1
        x["kind"] = "BOSS" if last else "小怪" + NUM[i]
        if last: x["boss"] = True
        assert len(x["opts"]) == 4 and len(set(x["opts"])) == 4 and 0 <= x["ans"] <= 3
        assert len(x["v"]["opts"]) == 4 and len(set(x["v"]["opts"])) == 4 and 0 <= x["v"]["ans"] <= 3
        assert x["q"] != x["v"]["q"]
    L["boss"] = items[-1]["src"]
    out = [{k: v for k, v in x.items() if k != "src"} for x in items]
    (P / f"level_{L['id']}.html").write_text(HEAD.format(**dict(L, items=json.dumps(out, ensure_ascii=False, indent=1))), encoding="utf-8")
used = {x["src"] for _, L in LEVELS for x in L["items"] if x["src"]}
lv = ['window.PHYSICS_LEVELS = window.PHYSICS_LEVELS || [];', '// 由 tools/gen_physics_levels.py 生成',
      'window.PHYSICS_LEVELS.push({ id: "melt_lab", title: "熔化凝固实验室", file: "melt_lab.html", icon: "🧊", boss: "P1018-5" });']
lv += ['window.PHYSICS_LEVELS.push(%s);' % json.dumps(dict(id=L["id"], title=L["title"], file=f"level_{L['id']}.html", icon=L["icon"], boss=L["boss"]), ensure_ascii=False) for _, L in LEVELS]
(P / "levels.js").write_text("\n".join(lv) + "\n", encoding="utf-8")
chl = lambda c: [L["id"] for cc, L in LEVELS if cc == c]
CH = [dict(id="p1", title="机械运动", icon="🚗", levels=chl("p1")), dict(id="p2", title="声现象", icon="🔔", levels=chl("p2")),
      dict(id="p3", title="物态变化", icon="🧊", levels=["melt_lab"] + chl("p3")),
      dict(id="p4", title="光现象", icon="🌈", levels=[], locked=True), dict(id="p5", title="透镜及其应用", icon="🔍", levels=[], locked=True),
      dict(id="p6", title="质量与密度", icon="⚖️", levels=[], locked=True)]
(P / "chapters.js").write_text("/* 物理岛章节（人教版八上），由 tools/gen_physics_levels.py 生成。格式见 接入规则.md v3-A */\nwindow.PHYSICS_CHAPTERS = "
                               + json.dumps(CH, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
missing = set(VAR) - used - {"P1018-5"}
print({L["id"]: len(L["items"]) for _, L in LEVELS}, "未用到的错题:", sorted(missing))
