#!/usr/bin/env python3
"""只读 轩轩错题本.md，生成 math/data.js（window.MATH_DATA）。
用法: python3 tools/sync_math.py --new YH-25-02,YH-25-04,YH-25-08b [--src 路径] [--out 路径]
"""
import argparse, json, re, datetime, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
STATUS = {"待练": "未练", "已出同类练": "已练", "已练": "已练", "已过关": "已过关", "已掌握": "已过关"}

def plain(s):
    """公式转可读纯文本：去掉 Markdown/LaTeX 痕迹，全角逗号保留。"""
    s = re.sub(r"\$+", "", s)
    s = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1)/(\2)", s)
    s = re.sub(r"\\sqrt\{([^{}]*)\}", r"√(\1)", s)
    s = s.replace("\\times", "×").replace("\\div", "÷").replace("\\pi", "π").replace("\\", "")
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"^> ?", "", s, flags=re.M)
    return re.sub(r"\n{3,}", "\n\n", s).strip()

def parse(text):
    items = []
    for blk in re.split(r"^### ", text, flags=re.M)[1:]:
        m = re.search(r"<!-- meta: (\{.*?\}) -->", blk)
        if not m:
            continue
        meta = json.loads(m.group(1))
        head = blk.splitlines()[0]
        raw_status = head.split("｜")[-1].strip()
        sec = dict(re.findall(r"^#### (\S+)\n(.*?)(?=^#### |^---|\Z)", blk, flags=re.M | re.S))
        kp = plain(sec.get("薄弱知识点", "")) or meta.get("tag", "")
        items.append({"id": meta["id"], "知识点": kp, "状态": "未练",
                      "原状态": raw_status, "new": False,
                      "原题": plain(sec.get("原题", "")), "正确答案": plain(sec.get("正确答案", "")),
                      "为什么错": plain(sec.get("为什么错", "")), "概念": plain(sec.get("概念", "")),
                      "公式": plain(sec.get("公式", "")), "章节": meta.get("chapter", "")})
    return items

def answerable(id_, q, a, e):
    """把 variants_db 的 (题, 答案, 解析) 转成可自动判分的统一格式；缺答案规格返回 None。"""
    from variants_ans import A
    sp = A.get(id_)
    if sp is None and re.fullmatch(r"[A-D]", a.strip()) and re.search(r"A[.．]", q):
        parts = re.split(r"\s*(?=[A-D][.．]\s*)", q)
        stem, opts = parts[0].strip(), [x.strip() for x in parts[1:]]
        if len(opts) >= 2 and a.strip() in "ABCD"[:len(opts)]:
            return {"type": "choice", "stem": stem, "options": opts, "answer": a.strip(), "explain": e, "key": a}
    if sp is None:
        return None
    v = {"type": sp["type"], "stem": sp.get("stem") or q, "explain": e, "key": a}
    if sp["type"] == "choice":
        v["options"], v["answer"] = sp["options"], sp["answer"]
        if not re.fullmatch(r"[A-D]", v["answer"]): return None
    else:
        v["answer"], v["labels"] = sp["answer"], sp["labels"]
        if len(v["labels"]) != len(v["answer"]) or not all(v["answer"]): return None
        if sp.get("anyOrder") or "anyOrderFrom" in sp:
            v["anyOrder"] = True; v["anyOrderFrom"] = sp.get("anyOrderFrom", 0)
    return v

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--new", default="", help="逗号分隔的本次 NEW 编号")
    ap.add_argument("--src", default="/workspace/xuanxuan-reports/轩轩错题本.md")
    ap.add_argument("--out", default=str(ROOT / "math" / "data.js"))
    ap.add_argument("--strict", action="store_true", help="有错题缺变式时失败")
    a = ap.parse_args()
    text = pathlib.Path(a.src).read_text(encoding="utf-8")   # 只读
    items = parse(text)
    new = [x.strip() for x in a.new.split(",") if x.strip()]
    ids = {it["id"] for it in items}
    miss = [n for n in new if n not in ids]
    if miss:
        sys.exit(f"错题本中找不到编号: {miss}")
    sys.path.insert(0, str(ROOT / "tools"))
    from variants_db import V
    lack = []
    for it in items:
        it["new"] = it["id"] in new
        it["变式"] = [answerable(it["id"], q, a, e) for q, a, e in V.get(it["id"], [])]
        if not it["变式"] or any(v is None for v in it["变式"]):
            lack.append(it["id"])
            it["变式"] = [v for v in it["变式"] if v]
    if lack:
        print(f"⚠️ 缺变式或缺可判分答案（请在 tools/variants_db.py 补变式、tools/variants_ans.py 补答案规格）: {lack}")
        sys.exit(1)  # 变式必须可自动判分：缺答案规格一律失败（--strict 保留兼容）
    items.sort(key=lambda it: (not it["new"],))  # NEW 排最前，其余保持原顺序
    data = {"subject": "math", "updated": datetime.date.today().isoformat(), "items": items}
    js = ("// 由 tools/sync_math.py 自动生成，请勿手改；源：" + a.src + "\n"
          "window.MATH_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    pathlib.Path(a.out).write_text(js, encoding="utf-8")
    from collections import Counter
    c = Counter(it["状态"] for it in items)
    print(f"写入 {a.out}: {len(items)} 条, {dict(c)}, NEW={new}")
    import subprocess  # 每次同步后重建章节错题小关
    subprocess.run([sys.executable, str(ROOT / "tools" / "gen_auto_levels.py")], check=True)

if __name__ == "__main__":
    main()
