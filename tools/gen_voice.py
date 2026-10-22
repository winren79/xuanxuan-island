import subprocess,json,os
V="zh-CN-XiaoyiNeural";D=os.path.join(os.path.dirname(__file__),"..","audio","voice")
L={"praise":["太棒了，轩轩！","答对啦，你真厉害！","思路清清楚楚，继续保持！","漂亮！又拿下一题！","轩轩真是数学小达人！","完全正确，给你点个赞！","厉害了，这题难不倒你！","好样的，离通关又近一步！","聪明！你的进步大家都看到了！"],
"encourage":["没关系，看看提示再来！","别灰心，错了才会进步！","慢慢来，你一定行！","再想一想，你离答案很近了！","加油轩轩，我们再试一次！","错一次不要紧，弄懂就是赚到！","深呼吸，读一读讲解卡！","相信自己，下一题一定对！","勇敢的人不怕犯错！"],
"box":["哇，轩轩砸开盲盒啦！快看看是什么奖励！"],"chest":["恭喜通关！宝箱打开啦，这是给你的礼物！"],"island":["太棒了轩轩，这个岛通关啦！小船出发去下一站！"]}
for k,a in L.items():
  for i,t in enumerate(a,1):
    subprocess.run(["python3","-m","edge_tts","--voice",V,"--text",t,"--write-media",f"{D}/{k}_{i}.mp3"],check=True)
print(json.dumps(L,ensure_ascii=False))
