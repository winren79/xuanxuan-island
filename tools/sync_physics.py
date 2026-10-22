#!/usr/bin/env python3
"""只读 轩轩物理错题本.md，生成 physics/data.js（window.PHYSICS_DATA）。
id 规则：P+月日+-题号，如 P1018-5。用法: python3 tools/sync_physics.py --new P1021-3,P1021-4"""
import argparse, json, re, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
STATUS = {"待练": "未练", "已练": "已练", "已过关": "已过关", "已掌握": "已过关"}
def sec(blk, name):
    m = re.search(r"^### " + name + r"\s*\n(.*?)(?=^### |\Z)", blk, re.M | re.S)
    return re.sub(r"\n{3,}", "\n\n", m.group(1)).strip() if m else ""
def plain(t):
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t); t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\*\*|__|`|^#+\s*", "", t, flags=re.M); return re.sub(r"[ \t]+\n", "\n", t).strip()
def load_variants(path):
    if not path.exists(): return {}
    txt = path.read_text(encoding="utf-8"); m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.S)
    return json.loads(m.group(1)) if m else {}
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--new", default="")
    ap.add_argument("--src", default="/workspace/xuanxuan-physics/轩轩物理错题本.md")
    ap.add_argument("--out", default=str(ROOT / "physics" / "data.js")); a = ap.parse_args()
    variants = load_variants(ROOT / "physics" / "variants.js")
    new = {x.strip() for x in a.new.split(",") if x.strip()}; items = []
    for blk in re.split(r"^## ", open(a.src, encoding="utf-8").read(), flags=re.M)[1:]:
        m = re.match(r"【(.+?)】(\d{4})-(\d\d)-(\d\d) · 第(\d+)题 · 状态：(\S+)", blk)
        if not m: continue
        pid = f"P{m[3]}{m[4]}-{m[5]}"
        if any(i["id"] == pid for i in items):  # 同日不同卷题号重复时加序号区分
            k = 2
            while any(i["id"] == f"{pid}-{k}" for i in items): k += 1
            pid = f"{pid}-{k}"
        items.append({"id": pid, "来源": f"{m[1]} 第{m[5]}题", "日期": f"{m[2]}-{m[3]}-{m[4]}",
                      "知识点": sec(blk, "薄弱知识点").split("（")[0], "状态": STATUS.get(m[6], "未练"),
                      "new": pid in new, "原题": sec(blk, "原题"), "正确答案": sec(blk, "正确答案"),
                      "为什么错": plain(sec(blk, "为什么错")), "概念": plain(sec(blk, "相关概念")),
                      "变式": variants.get(pid, [])})
    data = {"subject": "physics", "updated": datetime.date.today().isoformat(), "items": items}
    pathlib.Path(a.out).write_text("// 由 tools/sync_physics.py 从《轩轩物理错题本》生成，勿手改\nwindow.PHYSICS_DATA = "
                                   + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    c = {}; [c.__setitem__(i["状态"], c.get(i["状态"], 0) + 1) for i in items]
    print(len(items), c, "NEW:", sorted(new & {i["id"] for i in items}))
main()
