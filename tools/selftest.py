"""答案二次核对 + Chrome 无头 375×812 / 1280×800 全流程走查。用法: python3 tools/selftest.py"""
from fractions import Fraction as F
import math, os, shutil
def area(*p): return abs(sum(p[i][0]*p[(i+1)%3][1]-p[(i+1)%3][0]*p[i][1] for i in range(3)))/F(2)
# 坐标系三角形面积
assert area((-2,0),(4,0),(1,5))==15 and F(6*5,2)==15 and area((-1,0),(3,0),(2,3))==6
assert area((1,1),(6,3),(3,7))==13 and 5*6-(F(10,2)+F(12,2)+F(12,2))==13
assert area((0,0),(4,1),(1,3))==F(11,2) and 12-(F(4,2)+F(6,2)+F(3,2))==F(11,2)
assert all(area((0,0),(4,0),(0,m))==6 for m in(3,-3)) and all(area((0,0),(6,0),(0,m))==12 for m in(4,-4))
for x in [F(1),F(4),F(7,2)]:
    assert area((0,0),(6,0),(x,-F(3,4)*x+6))==-F(9,4)*x+18 and area((0,0),(2,0),(x/2,-x/2+4))==-x/2+4
assert -F(3,4)*4+6==3 and -F(9,4)*4+18==9 and area((0,0),(2,0),(3,1))==1
# 勾股：折断/梯子/设未知数
assert 3+math.hypot(3,4)==8 and 6+math.hypot(6,8)==16 and 5+math.hypot(5,12)==18 and 9+math.hypot(9,12)==24
assert math.sqrt(10**2-6**2)==8 and math.sqrt(13**2-5**2)==12
for H,d,x in [(9,3,4),(8,4,3)]: assert x*x+d*d==(H-x)**2 and F(H*H-d*d,2*H)==x
# 实数：整数/小数部分
isq=math.isqrt
assert isq(10)==3 and isq(30)==5 and isq(13)==3 and isq(8)==2 and isq(5)==2 and isq(11)**2==9 and isq(6)==2
assert math.floor(2+math.sqrt(6))==4 and abs((2+math.sqrt(6)-4)-(math.sqrt(6)-2))<1e-12
assert math.floor(1+math.sqrt(3))==2 and abs((1+math.sqrt(3)-2)-(math.sqrt(3)-1))<1e-12
assert abs((math.sqrt(5)-2)+2-math.sqrt(5))<1e-12
# 一次函数：由表格求关系式
def fits(f,xs,ys): return all(f(x)==y for x,y in zip(xs,ys))
assert fits(lambda x:2*x+1,[0,1,2],[1,3,5]) and fits(lambda x:2*x-3,[0,1,2],[-3,-1,1])
assert fits(lambda x:-2*x+2,[-1,0,1],[4,2,0]) and fits(lambda x:-F(1,2)*x+5,[0,2,4],[5,4,3])
assert fits(lambda x:-4*x,[1,2,3],[-4,-8,-12]) and fits(lambda x:F(1,2)*x,[2,4,6],[1,2,3])
assert fits(lambda x:x-3,[-7,-2,3,8],[-10,-5,0,5]) and not fits(lambda x:x+5,[-7],[-10]) and fits(lambda x:2*x-3,[-1,1,3],[-5,-1,3])
print("answers verified (two methods each)")

from playwright.sync_api import sync_playwright
D="/workspace/xuanxuan-game-shots/"; shutil.rmtree(D,ignore_errors=True); os.makedirs(D)
ROOT="file:///workspace/xuanxuan-game/"
def run(p,W,H,tag,mobile):
    errs=[]; b=p.chromium.launch(executable_path="/usr/bin/google-chrome",headless=True,
        args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required"])
    ctx=b.new_context(viewport={"width":W,"height":H},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=True)
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:m.type=="error" and errs.append(m.text))
    n=[0]
    def shot(name,full=True):
        n[0]+=1; pg.screenshot(path=D+f"{tag}_{n[0]:02d}_{name}.png",full_page=full)
    def wait(ms): pg.wait_for_timeout(ms)
    def item(): return pg.evaluate("(()=>{var i=XXGame._quiz.item();return {type:i.type,ans:i.ans,test:i.test||null,idx:XXGame._quiz.index()}})()")
    def answer(it,right=True):
        if it["type"]=="mc":
            j=it["ans"] if right else (it["ans"]+1)%4; pg.click(f"#box .opt[data-j='{j}']")
        else:
            for k,v in it["test"].items():
                el=pg.locator(f"#box [data-f='{k}']")
                if el.evaluate("e=>e.tagName")=="SELECT": el.select_option(v)
                else: el.fill(v)
        pg.click("#submit")
    def solve(hook=None):
        while not pg.locator("#result").count():
            it=item()
            if hook: hook(it)
            answer(it); wait(1150)
    def rewards(names):
        # 依次处理弹层：盲盒 → 小船 → 宝箱
        pg.wait_for_selector(".xx-ov",timeout=6000)
        while True:
            if pg.locator("#bb0").count():
                shot(names+"_blindbox",False); pg.click("#bb1"); wait(1900); shot(names+"_blindbox_smashed",False); pg.click("#bbok"); wait(400)
            elif pg.locator("#tochest").count():
                wait(2900); shot(names+"_boat_sailed",False); pg.click("#tochest"); wait(300)
            elif pg.locator("#chest").count():
                shot(names+"_chest",False); pg.click("#chest"); wait(1000); shot(names+"_chest_opened",False); pg.click("#chok"); wait(400)
            else:
                wait(800)
                if not pg.locator(".xx-ov").count(): break
    def open_level(ch,lv):
        pg.goto(ROOT+"math/index.html"); pg.click(f"#isl-{ch}"); wait(300); pg.click(f"#lv-{lv}"); wait(500)
    pg.goto(ROOT+"index.html"); shot("home")
    pg.click("#go-math"); wait(400); shot("math_map")
    pg.click("#isl-ch1"); wait(400); shot("island_ch1_panel")
    pg.click("#lv-gougu_break"); wait(500); shot("level_gougu")
    answer(item(),True); wait(200); shot("answer_correct"); wait(1000)
    answer(item(),False); wait(300); shot("answer_wrong_hint_whycard")
    pg.click("#box .read-btn"); pg.wait_for_function("document.querySelector('.read-msg').textContent.includes('录音中')",timeout=8000); shot("read_fallback_recording")
    wait(1500); pg.click("#box .read-btn"); pg.wait_for_function("document.querySelector('.read-msg').textContent.includes('家长审核')",timeout=8000); shot("read_sent_to_parent")
    it=item(); pg.click(f"#box .opt[data-j='{pg.evaluate('XXGame._quiz.item().v.ans')}']"); pg.click("#submit"); wait(400); shot("revived")
    solve(); shot("gougu_result"); rewards("ch1")
    pg.click("#tomap"); wait(600); shot("map_after_ch1")
    open_level("ch2","real_part"); solve(); rewards("ch2")
    def drag(it):
        if it["idx"]==3 and not getattr(drag,"done",False):
            drag.done=True; pg.evaluate("window.scrollTo(0,0)"); wait(200); bx=pg.locator("#cv").bounding_box()
            sx=lambda x: bx["x"]+(x+1)/10.5*bx["width"]; sy=lambda y: bx["y"]+bx["height"]-(y+1)/8.4*bx["height"]
            cdp=ctx.new_cdp_session(pg); t=lambda ty,x,y: cdp.send("Input.dispatchTouchEvent",{"type":ty,"touchPoints":[] if ty=="touchEnd" else [{"x":x,"y":y}]})
            t("touchStart",sx(3),sy(3.75))
            for k in range(1,11): t("touchMove",sx(3+k*0.1),sy(3.75-k*0.075))
            t("touchEnd",0,0); print(tag,"drag:",pg.inner_text("#info").replace("\n"," ")); shot("area_drag_P")
    open_level("ch3","level1_area"); solve(drag); rewards("ch3")
    open_level("ch4","linear_table"); solve(); shot("linear_result"); rewards("ch4")
    pg.goto(ROOT+"math/index.html"); wait(500); shot("math_map_all_cleared")
    pg.goto(ROOT+"physics/index.html"); wait(500); shot("physics_map"); pg.click("#isl-p3"); wait(300); pg.click("#lv-melt_lab"); wait(800); shot("physics_melt_lab")
    pg.goto(ROOT+"index.html"); wait(500); shot("home_after"); print(tag,"home bar:",pg.inner_text("#bar").replace("\n"," "))
    pg.click("#go-parent"); wait(300); shot("parent_set_pin"); pg.fill("#p1","1234"); pg.fill("#p2","1234"); pg.click("#pset"); wait(300); shot("parent_report")
    pg.click("#tab-redeem"); wait(300); shot("parent_redeem"); pg.locator(".rd").first.click(); wait(300); shot("parent_redeem_marked")
    print(tag,"redeem:",pg.inner_text("#pane").replace("\n"," ")[:300])
    pg.click("#tab-pool"); wait(300); pg.locator("#pt-box tr:nth-child(5) .pa").fill("30"); pg.click("#psave"); wait(200); print(tag,"pool save:",pg.inner_text("#pmsg")); shot("parent_pool_cash_limit")
    pg.click("#tab-th"); wait(300); shot("parent_thresholds")
    pg.click("#tab-read"); wait(800); shot("parent_read_review"); c0=pg.evaluate("XXGame.totals().coins"); pg.locator(".pass").first.click(); wait(800)
    print(tag,"read approve coins:",c0,"->",pg.evaluate("XXGame.totals().coins")); shot("parent_read_approved")
    print(tag,"voice:",pg.evaluate("JSON.stringify(XXGame.voiceInfo||null)"),"canRecognize:",pg.evaluate("XXGame.canRecognize()"))
    print(tag,"storage keys:",pg.evaluate("Object.keys(XXGame.load())"))
    b.close(); return errs
with sync_playwright() as p:
    for W,H,tag,mob in [(375,812,"m375",True),(1280,800,"w1280",False)]:
        e=run(p,W,H,tag,mob); print(tag,"JS errors:",e or "none")
