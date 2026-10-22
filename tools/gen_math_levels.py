import json, pathlib
HEAD='''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>{title}</title><link rel="stylesheet" href="../common.css">
<style>.hud{{display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:bold;padding-right:52px}}
.msg{{min-height:28px;margin:8px 0;font-size:18px}}.hint{{background:#FFF0D6;border-left:6px solid var(--orange);padding:10px;border-radius:10px;margin:8px 0}}
.tag{{display:inline-block;color:#fff;border-radius:10px;padding:2px 10px;font-size:16px}}.scene svg{{width:100%;height:auto;display:block}}
select.sel{{font-size:20px;padding:8px;border:3px solid var(--orange);border-radius:12px;font-family:inherit}}</style></head><body><div class="wrap">
<a class="back" href="index.html">← 返回地图</a>
<div class="hud"><span id="hearts"></span><span id="stage"></span><span id="coins"></span></div>
<div class="grid"><div class="col1"><div class="card scene"><h2>{icon} {title}</h2>{scene}<p>{intro}</p></div></div>
<div class="card" id="box"></div></div></div>
<script src="../common.js"></script><script src="data.js"></script><script src="levels.js"></script><script src="chapters.js"></script>
<script>
XXGame.quiz({{subject:"math", levelId:"{id}", items:{items}}});
</script></body></html>
'''
def mc(kind,q,opts,ans,hint,v,why=None,whySrc=None,**kw):
    d=dict(kind=kind,type="mc",q=q,opts=opts,ans=ans,hint=hint,v=dict(q=v[0],opts=v[1],ans=v[2]));
    if why: d["why"]=dict(zip(["错因","概念","公式"],why))
    if whySrc: d["whySrc"]=whySrc
    d.update(kw); return d
def js(items, checks):
    s=json.dumps(items,ensure_ascii=False,indent=1)
    for k,v in checks.items(): s=s.replace('"__CHECK_%s__"'%k, v)
    return s
TREE='''<svg viewBox="0 0 300 170"><rect width="300" height="170" rx="14" fill="#E9F7FF"/><rect y="140" width="300" height="30" fill="#9CD67A"/>
<line x1="70" y1="140" x2="70" y2="80" stroke="#8B5A2B" stroke-width="10"/><line x1="70" y1="80" x2="230" y2="140" stroke="#8B5A2B" stroke-width="7"/>
<circle cx="236" cy="132" r="16" fill="#3E9B4F"/><text x="34" y="115" font-size="15">残干</text><text x="140" y="100" font-size="15">折断段(斜边)</text><text x="120" y="160" font-size="15">地面距离</text></svg>'''
NUMLINE='''<svg viewBox="0 0 300 120"><rect width="300" height="120" rx="14" fill="#FFF9EF"/><line x1="20" y1="70" x2="280" y2="70" stroke="#3a2a1a" stroke-width="3"/>
<g font-size="16" text-anchor="middle">''' + "".join(f'<line x1="{30+60*i}" y1="62" x2="{30+60*i}" y2="78" stroke="#3a2a1a" stroke-width="3"/><text x="{30+60*i}" y="98">{i+1}</text>' for i in range(5)) + '''</g>
<circle cx="117" cy="70" r="8" fill="#C01F1F"/><text x="117" y="45" font-size="18" text-anchor="middle" fill="#C01F1F">√6≈2.45</text><text x="150" y="20" font-size="14" text-anchor="middle">2&lt;√6&lt;3 → 整数部分 2</text></svg>'''
TABLE='''<table style="font-size:18px;background:#fff"><tr><th>x</th><td>0</td><td>1</td><td>2</td><td>3</td></tr><tr><th>y</th><td>b</td><td>b+k</td><td>b+2k</td><td>b+3k</td></tr></table>'''
levels=[]
# ---------------- 勾股定理 ----------------
g=[mc("小怪①·折竹","一根竹竿在离地 3 米处折断，顶端落在离竹竿底端 4 米处。竹竿折断前高多少米？",["7","8","5","12"],1,
      "残干 3、地面 4 是直角边，折断段是斜边：√(3²+4²)=5；原高=3+5。",("一棵树在离地 6 米处折断，顶端落在离树底 8 米处，原高多少米？",["14","10","16","48"],2),whySrc="W6-18b"),
   mc("小怪②·梯子","一架 10 米长的梯子斜靠在墙上，梯子底端离墙 6 米，梯子顶端离地多高？",["8 米","4 米","16 米","√136 米"],0,
      "梯子是斜边：√(10²−6²)=√64=8。",("13 米长的梯子，底端离墙 5 米，顶端离地多高？",["12 米","8 米","18 米","√194 米"],0),
      why=("把梯子长当成直角边，用了平方和而不是平方差。","梯子、墙、地面构成直角三角形，梯子是斜边。","直角边=√(斜边²−另一直角边²)")),
   mc("小怪③·吹折旗杆","一根 9 米高的旗杆被风吹折，顶端落在离旗杆底部 3 米处。折断处离地多高？",["3 米","4 米","5 米","6 米"],1,
      "设折断处离地 x 米，折下部分 (9−x) 米：x²+3²=(9−x)²，解得 x=4。",("8 米高的旗杆被吹折，顶端落在离底部 4 米处，折断处离地多高？",["3 米","4 米","5 米","2 米"],0),
      why=("只知道总长，不会设未知数；折下部分要用“总长−x”表示。","残干 x、地面距离、折下部分(总长−x)构成直角三角形，折下部分是斜边。","x²+d²=(H−x)²")),
   dict(kind="BOSS",boss=True,type="input",srcQ="GG-11",form='<p>这棵水杉折断之前的高度为 <input class="num" data-f="h" inputmode="decimal" placeholder="?"> 米</p>',
        check="__CHECK_g__",hint="残干 BC=5，地面 AB=12，折断段 AC 是斜边：AC=√(5²+12²)=13；原高=残干+折断段。",whySrc="GG-11",
        v=dict(q="一棵树在离地 9 米处折断，顶端落在离树底 12 米处，折断前高多少米？",opts=["15 米","21 米","24 米","108 米"],ans=2),test={"h":"18"})]
levels.append(dict(id="gougu_break",title="折断的大树",icon="🌲",file="level_gougu_break.html",scene=TREE,
  intro="勾股定理高频错点：折断/梯子等实际应用。口诀：断的是斜边·竖的是残干·地的是距离。",items=js(g,{"g":'function(v){return XXGame.eq(XXGame.num(v.h),18)}'})))
# ---------------- 实数 ----------------
r=[mc("小怪①·整数部分","√10 的整数部分是？",["3","4","10","5"],0,"9<10<16，所以 3<√10<4，整数部分是 3。",("√30 的整数部分是？",["5","6","4","15"],0),whySrc="GK-16b"),
   mc("小怪②·小数部分","√13 的小数部分是？",["√13−3","3−√13","√13−4","0.6"],0,"3<√13<4，小数部分=原数−整数部分=√13−3。",("√8 的小数部分是？",["√8−3","2−√8","√8−2","0.8"],2),whySrc="FX2-19"),
   mc("小怪③·整体代入","已知 √5 的小数部分为 a，则 a+2 = ？",["√5","√5+2","4","√5−4"],0,"2<√5<3，a=√5−2，a+2=(√5−2)+2=√5。",("已知 √11 的整数部分为 b，则 b² = ？",["9","11","16","3"],0),
      why=("求出小数部分后不会整体代入，或把小数部分写反成 2−√5。","小数部分 a=√5−2，代入时整体加括号：a+2=(√5−2)+2。","a=√T−n；代入后合并")),
   dict(kind="BOSS",boss=True,type="input",srcQ="LX-18c",q="请回答第(3)问：",form='<p>m 的整数部分是 <input class="num" data-f="i" inputmode="numeric" placeholder="?"></p><p>m 的小数部分是 <select class="sel" data-f="d"><option value="">请选择</option><option>2+√6</option><option>√6−2</option><option>√6−4</option><option>4−√6</option></select></p>',
        check="__CHECK_r__",hint="2<√6<3，所以 4<2+√6<5；整数部分是 4（不要写成 m=4），小数部分=m−4，化到最简。",whySrc="LX-18c",
        v=dict(q="若 m=1+√3，则 m 的整数部分和小数部分分别是？",opts=["2；√3−1","1；√3","2；√3+1","3；√3−2"],ans=0),test={"i":"4","d":"√6−2"})]
levels.append(dict(id="real_part",title="整数部分大侦探",icon="🔍",file="level_real_part.html",scene=NUMLINE,
  intro="实数高频错点：无理数的整数部分与小数部分。先夹逼：n²&lt;T&lt;(n+1)²，整数部分 n，小数部分 √T−n。",items=js(r,{"r":'function(v){return XXGame.eq(XXGame.num(v.i),4)&&v.d==="√6−2"}'})))
# ---------------- 一次函数 ----------------
l=[mc("小怪①·看增量","表格：x 依次为 0，1，2；y 依次为 1，3，5。y 与 x 的关系式是？",["y=2x+1","y=x+1","y=2x","y=3x"],0,"x 每增加 1，y 增加 2，k=2；x=0 时 y=1，b=1。",
      ("x 依次为 0，1，2；y 依次为 −3，−1，1，关系式是？",["y=2x−3","y=−3x+2","y=x−3","y=2x+3"],0),whySrc="YH-21-06"),
   mc("小怪②·k 的符号","表格：x 依次为 −1，0，1；y 依次为 4，2，0。关系式是？",["y=2x+2","y=−2x+2","y=−2x","y=x+2"],1,"x 每增加 1，y 减少 2，k=−2；x=0 时 y=2，b=2。代 x=−1 检验：−2×(−1)+2=4。",
      ("x 依次为 0，2，4；y 依次为 5，4，3，关系式是？",["y=−½x+5","y=−x+5","y=½x+5","y=−2x+5"],0),
      why=("只看到 y 在变，没注意是减少，k 的符号弄反；写完没代点检验。","y 随 x 增大而减小时 k<0；x=0 对应的 y 就是 b。","k=Δy÷Δx；b=x=0 时的 y")),
   mc("小怪③·正比例","表格：x 依次为 1，2，3；y 依次为 −4，−8，−12。关系式及函数类型是？",["y=4x（正比例函数）","y=−4x（正比例函数）","y=−x−3（一次函数）","y=−4x−8（一次函数）"],1,
      "x 每增加 1，y 减少 4，k=−4；b=y−kx=−4−(−4)×1=0，所以是正比例函数。",("x 依次为 2，4，6；y 依次为 1，2，3，关系式是？",["y=½x（正比例函数）","y=2x（正比例函数）","y=x−1（一次函数）","y=x+1（一次函数）"],0),
      why=("x 不从 0 开始就不会求 b；b=0 时没想到填“正比例”。","y=kx（k≠0）是正比例函数，也是特殊的一次函数；能填正比例就填正比例。","b=y−kx（代任一组数据）")),
   dict(kind="BOSS",boss=True,type="mc",srcQ="YH-25-02",q="请选出正确选项：",opts=["A","B","C","D"],ans=1,hint="代点检验：x=3 时 y=0，只有 B 满足；再用 (−7，−10) 验证：−7−3=−10。",whySrc="YH-25-02",
        v=dict(q="x 依次为 −1，1，3；y 依次为 −5，−1，3，关系式是？",opts=["y=2x−3","y=x−4","y=2x+3","y=−2x−3"],ans=0))]
levels.append(dict(id="linear_table",title="表格变函数",icon="📋",file="level_linear_table.html",scene=TABLE,
  intro="一次函数高频错点：由表格求关系式。看增量定 k，看 x=0 定 b，最后代两组数据检验！",items=js(l,{})))
for L in levels:
    pathlib.Path("math/"+L["file"]).write_text(HEAD.format(**L),encoding="utf-8")
print("ok")
