"""变式答案第二遍独立核验（数值重算，与 variants_ans.py 中的标准答案对照）。用法: python3 tools/check_variants.py"""
from math import sqrt as r, hypot, pi, isclose, floor
import sys; sys.path.insert(0, __file__.rsplit('/',1)[0]); from variants_ans import A
def v(s):
    import re
    s=re.sub(r'√(\d+(?:\.\d+)?)',r'r(\1)',s).replace('√','r').replace('π','pi').replace('^','**')
    s=re.sub(r'(\d)(r|pi|\()',r'\1*\2',s); return eval(s)
calc={"GG-08":(8+15-17)/2,"GG-11":7+hypot(7,24),"GG-15":hypot(9,12)+hypot(20,21),"GG-16b":hypot(8,6),"GG-18":135,
"GG-19":next(x+2 for x in range(1,99) if x*x+64==(x+2)**2),"GG-20":15*20/25,"ZM-07":169-144,"ZM-08":36/hypot(6,8),
"ZM-15":next(x/300 for x in range(1,3600) if isclose((x/300)**2+64,(12-x/300)**2)),"XS-08":4,"XS-20b":pi/8*100,"XS-20c":2000/100,
"LX-11":60/13,"LX-12":r(20),"LX-20b":7600/160,"FX1-06":13,"FX1-08":49-25,"FX3-18":48+120,"FX2-12":min(hypot(8,4),hypot(9,3),hypot(7,5)),
"FX2-17":10,"FX2-20":6-1-1-1.5,"FX3-20":25+24,"PF-13-2":-r(7),"PF-16":(4+3)**2,"EC-01":r(16),"EC-06":(r(2)+r(18))*r(2),
"EC-14":(2+r(3))*(2-r(3))*4,"XS-05":round(8**(1/3)),"XS-19a":1/(3-r(5)),"XS-19b":sum(1/(r(k)+r(k+1)) for k in range(1,100)),
"XS-19c":(1/(r(2)-1)-1)**2,"GK-16b":(r(11)-3)+5-r(11),"GK-19b":(lambda a:2*a*a-12*a+5)(1/(3+2*r(2))),"LX-14b":(r(3)+1)**2-(r(3)-1)**2,
"LX-17b":9,"W6-07":r(3),"W6-11":(3-2)*(r(2)+r(8)),"W6-19c":r(5+2*r(6)),"FX1-14":(r(12)+r(1/3))*r(3),"FX2-14":-3-abs(1-r(3))+(-3)*1,
"FX3-19":sum(1/(r(k)+r(k+1)) for k in range(1,49)),"W6-16c":abs(-2*(-1+2)-5*(-2-3)-1*(3+1))/2,"FX1-11":-7+4,"FX2-10":-2-3,
"YH-21-01":2,"YH-21-10b":20+(1600-1000)/20,"LX-19c":hypot(8,6),"LX-20c":hypot(6,8),"FX2-13":4*r(5)/2,"FX3-13":2*r(14)/2,"FX1-07":25/3,"FX3-07":25/6}
bad=0
for k,x in calc.items():
    a=A[k]["answer"][0][0]
    if not isclose(v(a),x,rel_tol=1e-9): bad+=1; print("MISMATCH",k,a,x)
# 多空
chk={"GG-17b":[2,8/3],"ZM-16":[120/2,2*r(100**2-60**2)/5],"EC-15":[2*3*r(2)/r(6),2*3*r(2)/r(18)],"W6-18b":[4.5,r(81-9)],
"GK-18":[8+4*r(5),6+2*r(5)],"LX-18c":[floor(3+r(5)),3+r(5)-5],"YH-25-04":[-0.5,2,-3,20],"XS-16":[5,18,floor(r(10))],"GK-20b":[8,2]}
for k,xs in chk.items():
    for a,x in zip(A[k]["answer"],xs):
        if not isclose(v(a[0]),x,rel_tol=1e-9): bad+=1; print("MISMATCH",k,a,x)
print("checked",len(calc)+len(chk),"bad",bad); sys.exit(bad>0)
