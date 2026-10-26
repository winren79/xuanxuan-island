/* 轩轩闯关岛 公共脚本 v3 —— 两科共用
   进度：localStorage["xuanxuan-island-progress"]；录音等大数据：IndexedDB "xuanxuan-island"/recordings
   对外接口见 接入规则.md。旧接口 finish/correct/totals/load/save/bar/addCoins/wrongStats/wrongHTML 保持不变。 */
(function(){
  var KEY="xuanxuan-island-progress", COIN_PER_CORRECT=10, COIN_PER_STAR=20, READ_COINS=20, CASH_MAX=20;
  var BASE=(function(){var s=(document.currentScript&&document.currentScript.src)||"";return s.replace(/common\.js(\?.*)?$/,"");})();
  var DEFAULT_POOLS={
    box:[{name:"周末手机 30 分钟",type:"time",amount:30,weight:3},{name:"周末电视 30 分钟",type:"time",amount:30,weight:3},
         {name:"10 元",type:"cash",amount:10,weight:2},{name:"20 元",type:"cash",amount:20,weight:1},
         {name:"爸爸的一个小要求",type:"wish",amount:0,weight:2},{name:"妈妈的一个小要求",type:"wish",amount:0,weight:2},
         {name:"金币 100",type:"coins",amount:100,weight:3}],
    chest:[{name:"金币 50",type:"coins",amount:50,weight:4},{name:"金币 100",type:"coins",amount:100,weight:2},
           {name:"周末电视 30 分钟",type:"time",amount:30,weight:2},{name:"10 元",type:"cash",amount:10,weight:1},
           {name:"自选一次晚餐",type:"wish",amount:0,weight:2}]};
  var TYPE_NAMES={time:"周末时间",cash:"现金",coins:"金币",wish:"小要求",other:"其他"};
  function clone(o){return JSON.parse(JSON.stringify(o));}
  function today(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function nl(s){return esc(s).replace(/\n/g,"<br>");}
  function load(){
    var p; try{p=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){p={};}
    if(p.version!==2&&p.version!==3){ p={version:3,coins:+p.coins||0,subjects:{}}; } // v1 样例存档：保留金币
    p.version=3; p.subjects=p.subjects||{};
    if(p.vstatusVer!==2){p.vstatus={};p.vstatusVer=2;try{localStorage.setItem(KEY,JSON.stringify(p));}catch(e){}} // 一次性把旧的变式状态清零为未练 p.coins=+p.coins||0;
    var s=p.settings=p.settings||{};
    if(s.music===undefined)s.music=true;
    if(!s.thresholds||!s.thresholds.length)s.thresholds=[10,25,45,70,100];
    if(!(s.step>0))s.step=30;
    s.pools=s.pools||{}; if(!s.pools.box)s.pools.box=clone(DEFAULT_POOLS.box); if(!s.pools.chest)s.pools.chest=clone(DEFAULT_POOLS.chest);
    p.redeem=p.redeem||[]; p.boxes=p.boxes||{granted:0}; p.chests=p.chests||{}; p.readAwards=p.readAwards||{}; p.parent=p.parent||{}; p.practiceLog=p.practiceLog||[];
    return p;
  }
  function save(p){try{localStorage.setItem(KEY,JSON.stringify(p));}catch(e){}}
  function upper(subject){return String(subject).toUpperCase();}

  var G={KEY:KEY,COIN_PER_CORRECT:COIN_PER_CORRECT,COIN_PER_STAR:COIN_PER_STAR,READ_COINS:READ_COINS,CASH_MAX:CASH_MAX,
         BASE:BASE,DEFAULT_POOLS:DEFAULT_POOLS,TYPE_NAMES:TYPE_NAMES,load:load,save:save,today:today,esc:esc,nl:nl};

  /* ---------- 金币 / 星星 / 结算 ---------- */
  G.addCoins=function(n){var p=load();p.coins=Math.max(0,p.coins+n);save(p);G.refreshBars();return p.coins;};
  G.correct=function(opt){var c=G.addCoins(COIN_PER_CORRECT);if(!(opt&&opt.silent)){G.sfx("correct");G.praise();}return c;}; // 答对 +10 + 音效 + 表扬语音
  G.wrong=function(opt){if(!(opt&&opt.silent)){G.sfx("wrong");G.encourage();}};                                              // 答错：音效 + 鼓励语音
  G.finish=function(subject,levelId,stars,correctRate){
    stars=Math.max(1,Math.min(3,Math.round(stars)||1));
    correctRate=Math.max(0,Math.min(1,+correctRate||0));
    var p=load(), s=p.subjects[subject]=p.subjects[subject]||{}, old=s[levelId]||{};
    s[levelId]={stars:stars,bestStars:Math.max(old.bestStars||0,stars),correctRate:correctRate,
      bestRate:Math.max(old.bestRate||0,correctRate),date:today(),plays:(old.plays||0)+1};
    var bonus=stars*COIN_PER_STAR; p.coins+=bonus; save(p); G.refreshBars();
    G.logPractice({kind:"level",subject:subject,id:levelId,stars:stars,correctRate:correctRate});
    setTimeout(function(){G.processRewards(subject);},1600);   // 自动：阶梯盲盒 → 章节通关小船 → 宝箱
    return {bonus:bonus,coins:p.coins,record:s[levelId]};
  };
  G.totals=function(){var p=load(),st=0;for(var k in p.subjects)for(var l in p.subjects[k])st+=p.subjects[k][l].bestStars||0;return {stars:st,coins:p.coins};};
  G.bar=function(el){if(!el)return;el.setAttribute("data-xxbar","1");var t=G.totals(),n=G.nextThreshold(t.stars);
    el.innerHTML='<span class="pill">⭐ '+t.stars+'</span><span class="pill">🪙 '+t.coins+'</span><span class="pill small" title="下一个盲盒">🎁 '+t.stars+'/'+n+'</span>';};
  G.refreshBars=function(){[].forEach.call(document.querySelectorAll("[data-xxbar]"),function(el){G.bar(el);});};

  /* ---------- 阶梯门槛 ---------- */
  G.thresholdList=function(upto){var s=load().settings,t=s.thresholds.slice().sort(function(a,b){return a-b;}),last=t[t.length-1];
    while(last+s.step<=upto+s.step*1){last+=s.step;t.push(last);if(t.length>500)break;}return t;};
  G.unlockedBoxes=function(stars){return G.thresholdList(stars).filter(function(x){return x<=stars;}).length;};
  G.nextThreshold=function(stars){var t=G.thresholdList(stars);for(var i=0;i<t.length;i++)if(t[i]>stars)return t[i];return stars+load().settings.step;};

  /* ---------- 奖池抽取 / 兑换记录 ---------- */
  G.draw=function(poolName){var pool=load().settings.pools[poolName]||[],sum=0;pool=pool.filter(function(x){return x.weight>0;});
    pool.forEach(function(x){sum+=+x.weight;});var r=Math.random()*sum;
    for(var i=0;i<pool.length;i++){r-=pool[i].weight;if(r<=0)return clone(pool[i]);}return clone(pool[pool.length-1]||{name:"金币 50",type:"coins",amount:50});};
  G.grant=function(prize,source){var p=load();
    if(prize.type==="cash")prize.amount=Math.min(CASH_MAX,+prize.amount||0);
    var r={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),date:today(),prize:prize.name,type:prize.type,amount:prize.amount||0,
      source:source,weekend:prize.type==="time",status:"待兑现"};
    if(prize.type==="coins"){p.coins+=(+prize.amount||0);r.status="已兑现";}
    p.redeem.unshift(r);save(p);G.refreshBars();return r;};
  G.prizeLabel=function(x){return esc(x.name||x.prize)+((x.type==="time"||x.weekend)?' <span class="tagw">周末使用</span>':'');};

  /* ---------- 章节 ---------- */
  var loading={};
  G.loadScript=function(src,cb){var s=document.createElement("script");s.src=src;s.onload=function(){cb(true);};s.onerror=function(){cb(false);};document.head.appendChild(s);};
  G.getChapters=function(subject,cb){var U=upper(subject);
    function done(){var lv=window[U+"_LEVELS"]||[],ch=clone(window[U+"_CHAPTERS"]||[]),used={};
      ch.forEach(function(c){c.levels=c.levels||[];c.levels.forEach(function(id){used[id]=1;});});
      var rest=lv.filter(function(l){return !used[l.id];}).map(function(l){return l.id;});
      if(rest.length)ch.push({id:"_more",title:ch.length?"更多关卡":(subject==="physics"?"物理关卡":"关卡"),icon:"🏝️",levels:rest});
      cb(ch,lv);}
    var need=[];if(!window[U+"_LEVELS"])need.push("levels.js");if(!window[U+"_CHAPTERS"])need.push("chapters.js");
    if(!need.length||loading[subject])return done();loading[subject]=1;
    (function next(){if(!need.length)return done();G.loadScript(BASE+subject+"/"+need.shift(),next);})();};
  G.levelStars=function(subject,id){var r=(load().subjects[subject]||{})[id];return r?r.bestStars||0:0;};
  G.chapterCleared=function(subject,ch){return !ch.locked&&ch.levels.length>0&&ch.levels.every(function(id){return G.levelStars(subject,id)>=1;});};
  G.currentChapter=function(subject,chs){for(var i=0;i<chs.length;i++){var c=chs[i];if(!c.locked&&c.levels.length&&!G.chapterCleared(subject,c))return i;}
    var last=0;chs.forEach(function(c,i){if(G.chapterCleared(subject,c))last=i;});return last;};

  /* ---------- 地图（SVG 卡通海岛） ---------- */
  function islandPos(n){var W=360,H=130+(n-1)*112,a=[];for(var i=0;i<n;i++)a.push([i%2?250:110,H-72-i*112]);return {W:W,H:H,pos:a};}
  G.mapSVG=function(subject,chs,boatAt){var L=islandPos(chs.length),pos=L.pos,h='<svg class="xxmap" viewBox="0 0 '+L.W+' '+L.H+'" xmlns="http://www.w3.org/2000/svg">'+
    '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD6F5"/><stop offset="1" stop-color="#2FA6D9"/></linearGradient>'+
    '<pattern id="wave" width="60" height="28" patternUnits="userSpaceOnUse"><path d="M0 14 q15 -9 30 0 t30 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></pattern></defs>'+
    '<rect width="100%" height="100%" rx="22" fill="url(#sea)"/><rect width="100%" height="100%" rx="22" fill="url(#wave)"/>';
    for(var i=0;i<pos.length-1;i++){var a=pos[i],b=pos[i+1];h+='<path d="M'+a[0]+' '+a[1]+' Q'+(a[0]+b[0])/2+' '+((a[1]+b[1])/2+(i%2?-30:30))+' '+b[0]+' '+b[1]+'" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 9" stroke-linecap="round" opacity="'+(chs[i+1].locked?.45:.95)+'"/>';}
    chs.forEach(function(c,i){var p=pos[i],cl=G.chapterCleared(subject,c),st=0;c.levels.forEach(function(id){st+=G.levelStars(subject,id);});
      h+='<g class="isl'+(c.locked?' locked':'')+'" data-i="'+i+'" id="isl-'+esc(c.id)+'" transform="translate('+p[0]+' '+p[1]+')" style="cursor:pointer">'+
      '<ellipse rx="70" ry="30" cy="14" fill="#BDEBFA" opacity=".55"/><ellipse rx="58" ry="28" cy="6" fill="#F6D58E" stroke="#E2B860" stroke-width="3"/>'+
      '<ellipse rx="34" ry="18" cy="-4" fill="'+(c.locked?"#9AA79C":"#4CAF50")+'"/><text x="-34" y="0" font-size="26">'+(c.locked?"🔒":(c.icon||"🌴"))+'</text>'+
      (cl?'<text x="16" y="-14" font-size="24">🚩</text>':'')+
      '<text y="44" text-anchor="middle" font-size="17" font-weight="bold" fill="#3a2a1a" stroke="#fff" stroke-width="4" paint-order="stroke">'+(i+1)+'. '+esc(c.title)+'</text>'+
      '<text y="-30" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="#3a2a1a" stroke-width="3" paint-order="stroke">'+(c.locked?"未开放":c.levels.length?"⭐"+st+"/"+c.levels.length*3:"建设中")+'</text></g>';});
    var bp=pos[Math.max(0,Math.min(boatAt,pos.length-1))];
    h+='<g id="boat" style="transform:translate('+(bp[0]+44)+'px,'+(bp[1]-8)+'px);transition:transform 2s ease-in-out"><text font-size="34" class="bob">⛵</text></g></svg>';
    return h;};
  G.moveBoat=function(svgRoot,chs,toIndex){var pos=islandPos(chs.length).pos,p=pos[Math.max(0,Math.min(toIndex,pos.length-1))],b=svgRoot.querySelector("#boat");
    if(b)b.style.transform="translate("+(p[0]+44)+"px,"+(p[1]-8)+"px)";};
  G.islandPanelHTML=function(subject,ch,lv,base){
    var h='<h2>'+(ch.icon||"🏝️")+' '+esc(ch.title)+(G.chapterCleared(subject,ch)?' <span class="ok">🚩 已通关</span>':'')+'</h2>';
    if(ch.locked)return h+'<p>🔒 还没学到这一章，学到了就会开放！</p>';
    if(!ch.levels.length)return h+'<p>🚧 关卡建设中，敬请期待</p>';
    var prevSeq=null;
    ch.levels.forEach(function(id,i){var l=lv.filter(function(x){return x.id===id;})[0];if(!l)return;var b=G.levelStars(subject,id);
      var lock=l.seq&&prevSeq&&G.levelStars(subject,prevSeq)<1;if(l.seq)prevSeq=id;
      var D=window[upper(subject)+"_DATA"],lids=l.items||(l.boss?[l.boss]:[]),cnt={"未练":0,"已练":0,"已过关":0};
      lids.forEach(function(x){var di=G.dataItem(subject,x);if(di)cnt[G.itemStatus(subject,di)]++;});
      var tags=lids.length?' '+["未练","已练","已过关"].filter(function(k){return cnt[k];}).map(function(k){return G.statusTag(k+(lids.length>1?" "+cnt[k]:""));}).join(""):"";
      var t=(l.icon||"")+' 第'+(i+1)+'关 '+(l.boss?'👑 Boss · ':'')+esc(l.title)+'<br><span style="font-size:18px">'+(lock?'🔒 先通过上一关':"⭐".repeat(b)+"☆".repeat(3-b))+'</span>'+tags;
      h+=lock?'<a class="btn ghost lockedlv" id="lv-'+esc(id)+'" style="opacity:.55;pointer-events:none">'+t+'</a>'
        :'<a class="btn '+(subject==="physics"?"green":"red")+'" id="lv-'+esc(id)+'" href="'+(base||"")+esc(l.file)+'">'+t+'</a>';});
    return h+'<small>本章所有关卡都拿到 ≥1⭐ 就通关，小船开往下一个岛并开宝箱！</small>';};
  /** 岛页（地图页）一键渲染：subject/index.html 只需 <div id="app"></div> + XXGame.mapPage("physics") */
  G.mapPage=function(subject,opt){opt=opt||{};var app=document.getElementById(opt.el||"app"),U=upper(subject);
    G.getChapters(subject,function(chs,lv){var cur=G.currentChapter(subject,chs),sel=+(sessionStorage.getItem("xx-isl-"+subject)||cur);if(!(sel<chs.length))sel=cur;
      app.innerHTML='<a class="back" href="../index.html">← 返回首页</a><h1>'+(subject==="physics"?"⚡ 物理岛":"🔢 数学岛")+'</h1><div class="bar" id="bar"></div>'+
        '<div class="grid"><div class="col1"><div class="mapbox">'+G.mapSVG(subject,chs,cur)+'</div><small class="maptip">点小岛查看关卡 · ⛵ 是你现在的位置</small></div>'+
        '<div class="col2"><div class="card" id="panel"></div><div class="card"><h2>📒 错题状态</h2><div id="wrong"></div></div></div></div>';
      G.bar(document.getElementById("bar"));
      document.getElementById("wrong").innerHTML=G.wrongHTML(subject,window[U+"_DATA"],lv,"");
      function show(i){sel=i;sessionStorage.setItem("xx-isl-"+subject,i);document.getElementById("panel").innerHTML=G.islandPanelHTML(subject,chs[i],lv,"");
        [].forEach.call(app.querySelectorAll(".isl"),function(g){g.classList.toggle("sel",+g.getAttribute("data-i")===i);});}
      [].forEach.call(app.querySelectorAll(".isl"),function(g){g.addEventListener("click",function(){show(+g.getAttribute("data-i"));
        if(window.innerWidth<900)document.getElementById("panel").scrollIntoView({behavior:"smooth",block:"start"});});});
      show(sel); G.processRewards(subject);});};

  /* ---------- 弹层：盲盒 / 小船 / 宝箱 ---------- */
  G.overlay=function(html){var o=document.createElement("div");o.className="xx-ov";o.innerHTML='<div class="xx-modal">'+html+'</div>';document.body.appendChild(o);
    return {el:o,close:function(){o.remove();}};};
  var busy=false;
  G.processRewards=function(subject,cb){if(busy){return cb&&cb();}busy=true;
    function end(){busy=false;G.refreshBars();cb&&cb();}
    var queue=[],p=load(),stars=G.totals().stars,pending=G.unlockedBoxes(stars)-p.boxes.granted;
    for(var i=0;i<pending;i++)queue.push({kind:"box"});
    var go=function(){var q=queue.shift();if(!q)return end();if(q.kind==="box")G.blindBox(go);else G.chapterClear(subject,q.chs,q.i,go);};
    if(!subject)return go();
    G.getChapters(subject,function(chs){var p2=load();chs.forEach(function(c,i){if(G.chapterCleared(subject,c)&&!p2.chests[subject+":"+c.id])queue.push({kind:"chest",chs:chs,i:i});});go();});};
  G.blindBox=function(done){var p=load(),n=p.boxes.granted,th=G.thresholdList(G.totals().stars)[n];
    var prizes=[G.draw("box"),G.draw("box"),G.draw("box")],o=G.overlay('<h2 class="center">🎉 星星达到 '+th+' ⭐！</h2><p class="center">三个盲盒，选一个用锤子砸开！</p>'+
      '<div class="bb-row">'+[0,1,2].map(function(i){return '<button class="bb" id="bb'+i+'" data-i="'+i+'"><span class="bb-face">🎁</span><span class="bb-prize"></span></button>';}).join("")+'</div>'+
      '<div id="bbmsg" class="center msg"></div><button class="btn orange" id="bbok" style="display:none">收下奖励</button>');
    var picked=false;[].forEach.call(o.el.querySelectorAll(".bb"),function(b){b.onclick=function(){if(picked)return;picked=true;var i=+b.dataset.i;
      var hm=document.createElement("span");hm.className="hammer";hm.textContent="🔨";b.appendChild(hm);
      setTimeout(function(){G.sfx("smash");b.classList.add("open","picked");b.querySelector(".bb-prize").innerHTML=G.prizeLabel(prizes[i]);
        var r=G.grant(prizes[i],"盲盒（"+th+"⭐）"),q=load();q.boxes.granted=n+1;save(q);
        o.el.querySelector("#bbmsg").innerHTML='你砸到了：<b>'+G.prizeLabel(prizes[i])+'</b>'+(r.status==="已兑现"?"（已到账）":"（等爸爸妈妈兑现）");
        G.voiceClip("box","哇，轩轩砸开盲盒啦！快看看是什么奖励！");
        setTimeout(function(){[0,1,2].forEach(function(j){if(j===i)return;var x=o.el.querySelector("#bb"+j);x.classList.add("open","other");x.querySelector(".bb-prize").innerHTML=G.prizeLabel(prizes[j]);});
          var ok=o.el.querySelector("#bbok");ok.style.display="block";ok.onclick=function(){o.close();done&&done();};},900);},650);};});};
  G.chapterClear=function(subject,chs,i,done){var nxt=i+1<chs.length?i+1:i,c=chs[i],o=G.overlay('<h2 class="center">🚩 「'+esc(c.title)+'」通关！</h2>'+
      '<div class="mapbox small">'+G.mapSVG(subject,chs,i)+'</div><p class="center" id="sailmsg">⛵ 小船出发……</p><button class="btn orange" id="tochest" style="display:none">打开宝箱 🧰</button>');
    G.sfx("chest");G.voiceClip("island","太棒了轩轩，这个岛通关啦！小船出发去下一站！");setTimeout(function(){var svg=o.el.querySelector("svg"),dest=svg.querySelector('[data-i="'+nxt+'"]');if(dest&&dest.scrollIntoView)dest.scrollIntoView({block:"center"});G.moveBoat(svg,chs,nxt);},400);
    setTimeout(function(){o.el.querySelector("#sailmsg").innerHTML=nxt===i?"已经到达最后一个岛！":(chs[nxt].locked?"下一站「"+esc(chs[nxt].title)+"」还没开放，先停在码头～":"到达「"+esc(chs[nxt].title)+"」！");
      var b=o.el.querySelector("#tochest");b.style.display="block";b.onclick=function(){o.close();G.chest(subject,c,done);};},2600);};
  G.chest=function(subject,ch,done){var prize=G.draw("chest"),o=G.overlay('<h2 class="center">🧰 「'+esc(ch.title)+'」宝箱</h2><div class="chest" id="chest">🧰</div><p class="center" id="chmsg">点宝箱打开！</p><button class="btn green" id="chok" style="display:none">太好了</button>');
    var opened=false;o.el.querySelector("#chest").onclick=function(){if(opened)return;opened=true;var el=this;el.classList.add("shake");
      setTimeout(function(){G.sfx("chest");el.classList.remove("shake");el.classList.add("opened");el.innerHTML="✨🎁✨";
        var r=G.grant(prize,"宝箱·"+ch.title),p=load();p.chests[subject+":"+ch.id]={date:today(),prize:prize.name};save(p);
        o.el.querySelector("#chmsg").innerHTML='获得：<b>'+G.prizeLabel(prize)+'</b>'+(r.status==="已兑现"?"（已到账）":"（等爸爸妈妈兑现）");G.voiceClip("chest","恭喜通关！宝箱打开啦，这是给你的礼物！");
        var ok=o.el.querySelector("#chok");ok.style.display="block";ok.onclick=function(){o.close();done&&done();};},700);};};

  /* ---------- 声音：WebAudio 合成（无外部音频） ---------- */
  var AC=null,master=null;
  function ac(){if(!AC){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{AC=new C();master=AC.createGain();master.gain.value=.8;master.connect(AC.destination);}catch(e){return null;}}
    if(AC.state==="suspended"&&AC.resume)AC.resume();return AC;}
  function tone(f,t,d,type,vol){var a=ac();if(!a)return;var o=a.createOscillator(),g=a.createGain();o.type=type||"square";o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol||.08,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.05);return o;}
  function hz(semi){return 440*Math.pow(2,(semi-9)/12);} // semi: 0=C4
  G.sfx=function(kind){var a=ac();if(!a)return;var t=a.currentTime+.01;
    if(kind==="correct"){[12,16,19,24].forEach(function(s,i){tone(hz(s),t+i*.07,.18,"triangle",.14);});}
    else if(kind==="wrong"){var o=tone(330,t,.45,"sawtooth",.08);if(o)o.frequency.exponentialRampToValueAtTime(140,t+.4);tone(155,t+.18,.35,"square",.05);}
    else if(kind==="chest"){[12,16,19,24,28,31,36].forEach(function(s,i){tone(hz(s),t+i*.06,.3,"triangle",.1);tone(hz(s+12),t+i*.06+.03,.12,"sine",.05);});}
    else if(kind==="smash"){var n=a.sampleRate*.35,buf=a.createBuffer(1,n,a.sampleRate),d=buf.getChannelData(0);for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
      var src=a.createBufferSource(),g=a.createGain();src.buffer=buf;g.gain.value=.5;src.connect(g);g.connect(master);src.start(t);
      var o2=tone(120,t,.3,"sine",.35);if(o2)o2.frequency.exponentialRampToValueAtTime(45,t+.28);[24,28,31].forEach(function(s,i){tone(hz(s),t+.25+i*.07,.2,"triangle",.1);});}};
  // 轻快循环：C 大调五声音阶，132 BPM，8 小节
  var MEL=[12,null,16,19,21,19,16,null, 14,null,16,14,12,null,9,null, 9,12,14,null,16,null,19,16, 14,12,14,null,null,null,null,null,
           16,null,19,21,24,21,19,null, 21,19,16,null,14,null,12,null, 9,12,14,16,19,null,16,14, 12,null,null,null,7,9,12,null];
  var BASS=[0,0,-3,-3,-7,-7,-5,-5, 0,0,-3,-3,-7,-5,0,0];
  var mus={timer:null,step:0,next:0};
  function schedule(){var a=AC;if(!a)return;var spb=60/132/2;while(mus.next<a.currentTime+.2){var s=mus.step%64,m=MEL[s];
      if(m!==null)tone(hz(m),mus.next,spb*1.6,"triangle",.045);
      if(s%4===0)tone(hz(BASS[(s/4)%16]-12),mus.next,spb*3.2,"square",.03);
      if(s%2===1)tone(2400,mus.next,.03,"square",.006);
      mus.next+=spb;mus.step++;}}
  G.musicOn=function(){var a=ac();if(!a||mus.timer)return;mus.next=a.currentTime+.08;mus.timer=setInterval(schedule,40);};
  G.musicOff=function(){if(mus.timer){clearInterval(mus.timer);mus.timer=null;}};
  G.setMusic=function(on){var p=load();p.settings.music=!!on;save(p);on?G.musicOn():G.musicOff();var b=document.getElementById("xx-music");if(b)b.textContent=on?"🎵":"🔇";};
  function musicButton(){if(document.getElementById("xx-music"))return;var b=document.createElement("button");b.id="xx-music";b.className="xx-music";b.setAttribute("aria-label","背景音乐开关");
    b.textContent=load().settings.music?"🎵":"🔇";b.onclick=function(e){e.stopPropagation();G.setMusic(!load().settings.music);};document.body.appendChild(b);
    var first=function(){document.removeEventListener("pointerdown",first,true);if(load().settings.music)G.musicOn();};document.addEventListener("pointerdown",first,true);}

  /* ---------- 语音：speechSynthesis 中文女声（无则静默降级） ---------- */
  G.PRAISE=["太棒了，轩轩！","答对啦，你真厉害！","思路清清楚楚，继续保持！","漂亮！又拿下一题！","轩轩真是数学小达人！","完全正确，给你点个赞！","厉害了，这题难不倒你！","好样的，离通关又近一步！","聪明！你的进步大家都看到了！"];
  G.ENCOURAGE=["没关系，看看提示再来！","别灰心，错了才会进步！","慢慢来，你一定行！","再想一想，你离答案很近了！","加油轩轩，我们再试一次！","错一次不要紧，弄懂就是赚到！","深呼吸，读一读讲解卡！","相信自己，下一题一定对！","勇敢的人不怕犯错！"];
  var voice=null;
  function pickVoice(){if(!window.speechSynthesis)return null;var vs=speechSynthesis.getVoices()||[],zh=vs.filter(function(v){return /^zh(-|_)?(CN|Hans)?/i.test(v.lang)||/中文|Chinese|普通话/.test(v.name);});
    var cn=zh.filter(function(v){return /CN|Hans/i.test(v.lang);});if(cn.length)zh=cn;
    voice=zh.filter(function(v){return /female|女|Xiaoxiao|Huihui|Xiaoyi|Yaoyao|Tingting|Meijia|Lili|Xiaomo|Xiaohan/i.test(v.name);})[0]||zh[0]||null;
    G.voiceInfo={total:vs.length,zh:zh.length,chosen:voice?voice.name:null};return voice;}
  if(window.speechSynthesis){pickVoice();try{speechSynthesis.addEventListener("voiceschanged",pickVoice);}catch(e){}}
  G.speak=function(text){try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return false;var vs=speechSynthesis.getVoices();if(!voice)pickVoice();
      if(vs.length&&!voice)return false; // 有语音列表但没有中文：静默
      var u=new SpeechSynthesisUtterance(text);u.lang="zh-CN";if(voice)u.voice=voice;u.rate=1.05;u.pitch=1.15;speechSynthesis.cancel();speechSynthesis.speak(u);return true;}catch(e){return false;}};
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  /* 预生成 mp3（edge-tts 晓伊），失败才回退 speechSynthesis */
  var VBASE=(function(){var ss=document.getElementsByTagName("script");for(var i=ss.length-1;i>=0;i--){var m=(ss[i].getAttribute("src")||"").match(/^(.*?)common\.js/);if(m)return m[1]+"audio/voice/";}return "audio/voice/";})();
  var VN={praise:9,encourage:9,box:1,chest:1,island:1},curA=null;
  G.voiceClip=function(kind,fallback){var n=VN[kind]||1,i=Math.floor(Math.random()*n),f=function(){G.speak(fallback!=null?fallback:(kind==="praise"?G.PRAISE[i]:kind==="encourage"?G.ENCOURAGE[i]:""));};
    try{if(window.speechSynthesis)speechSynthesis.cancel();if(curA){curA.pause();}var a=new Audio(VBASE+kind+"_"+(i+1)+".mp3");curA=a;var done=false,fb=function(){if(done)return;done=true;f();};
      a.onerror=fb;var pr=a.play();if(pr&&pr.catch)pr.catch(fb);return true;}catch(e){f();return false;}};
  G.praise=function(){return G.voiceClip("praise");}; G.encourage=function(){return G.voiceClip("encourage");};

  /* ---------- 讲解卡 + 朗读 ---------- */
  G.cardText=function(c){return "为什么会错："+(c["错因"]||"")+"\n知识点："+(c["概念"]||"")+"\n公式："+(c["公式"]||"");};
  G.normalize=function(s){return String(s||"").replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g,"").toLowerCase();};
  G.similarity=function(target,heard){var t=G.normalize(target),h=G.normalize(heard);if(!t.length)return 0;var bag={},m=0,i;
    for(i=0;i<h.length;i++)bag[h[i]]=(bag[h[i]]||0)+1;for(i=0;i<t.length;i++)if(bag[t[i]]>0){bag[t[i]]--;m++;}return m/t.length;};
  G.canRecognize=function(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)&&navigator.onLine!==false&&location.protocol!=="file:"&&window.isSecureContext!==false;};
  G.awardRead=function(cardId,date){var p=load();date=date||today();if(p.readAwards[cardId]===date)return false;p.readAwards[cardId]=date;p.coins+=READ_COINS;save(p);G.refreshBars();return true;};
  /** 生成讲解卡 HTML。card={id:"唯一卡号", 错因, 概念, 公式}；插入页面后调用 XXGame.bindWhyCard(容器, card) */
  G.whyCardHTML=function(c){return '<div class="why" data-card="'+esc(c.id)+'"><div class="why-h">🧠 为什么会错 · 知识点</div>'+
    '<p><b>错因：</b>'+nl(c["错因"])+'</p><p><b>概念：</b>'+nl(c["概念"])+'</p><p><b>公式：</b>'+nl(c["公式"])+'</p>'+
    '<button class="btn orange read-btn">🎤 读出来（+'+READ_COINS+'🪙）</button><div class="read-msg"></div></div>';};
  G.bindWhyCard=function(root,c){var card=root.querySelector('.why[data-card="'+(window.CSS&&CSS.escape?CSS.escape(c.id):c.id)+'"]')||root.querySelector(".why");if(!card)return;
    var btn=card.querySelector(".read-btn"),msg=card.querySelector(".read-msg"),text=G.cardText(c);
    btn.onclick=function(){if(G.canRecognize())recognize();else record("当前环境无法在线识别（"+(location.protocol==="file:"?"本地文件打开":!navigator.onLine?"离线":"不支持")+"），改为录音交给家长审核。");};
    function recognize(){var R=window.SpeechRecognition||window.webkitSpeechRecognition,r=new R();r.lang="zh-CN";r.interimResults=false;r.maxAlternatives=3;r.continuous=true;
      var heard="";msg.innerHTML="🎤 正在听……读完点一下“读完了”";btn.textContent="✅ 读完了";btn.onclick=function(){try{r.stop();}catch(e){}};
      r.onresult=function(e){for(var i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){var best=e.results[i][0].transcript;heard+=best;}};
      r.onerror=function(e){if(/not-allowed|service-not-allowed|network|audio-capture/.test(e.error)){r.onend=null;reset();record("语音识别不可用（"+e.error+"），改为录音交给家长审核。");}};
      r.onend=function(){reset();var s=G.similarity(text,heard);if(s>=.8){var ok=G.awardRead(c.id);msg.innerHTML='<span class="ok">读得真好！相似度 '+Math.round(s*100)+'% '+(ok?"+"+READ_COINS+"🪙":"（这张卡今天已奖励过）")+'</span>';G.sfx("correct");}
        else msg.innerHTML='<span class="bad">相似度 '+Math.round(s*100)+'%，要到 80% 才算过，再读一次吧！</span>';};
      try{r.start();}catch(e){reset();record("语音识别启动失败，改为录音。");}}
    function reset(){btn.textContent="🎤 读出来（+"+READ_COINS+"🪙）";btn.onclick=function(){if(G.canRecognize())recognize();else record("改为录音交给家长审核。");};}
    function record(why){var md=navigator.mediaDevices;
      if(!(md&&md.getUserMedia&&window.MediaRecorder)){G.saveRecording({cardId:c.id,text:text,blob:null,note:"设备不支持录音，请家长当面听读"}).then(function(){msg.innerHTML=why+'<br>已加入「待家长审核」（无录音，请家长当面听读）。';});return;}
      md.getUserMedia({audio:true}).then(function(stream){var chunks=[],mr=new MediaRecorder(stream),t0=Date.now(),tm;
        mr.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data);};
        mr.onstop=function(){clearTimeout(tm);stream.getTracks().forEach(function(t){t.stop();});var blob=new Blob(chunks,{type:mr.mimeType||"audio/webm"});
          G.saveRecording({cardId:c.id,text:text,blob:blob,secs:Math.round((Date.now()-t0)/1000)}).then(function(){reset();msg.innerHTML='<span class="ok">📨 录音已交给家长审核，通过后 +'+READ_COINS+'🪙</span>';});};
        mr.start();msg.innerHTML=why+'<br>⏺ 录音中……对着手机把上面的卡片读一遍';btn.textContent="⏹ 读完了，交给家长";btn.onclick=function(){if(mr.state!=="inactive")mr.stop();};
        tm=setTimeout(function(){if(mr.state!=="inactive")mr.stop();},90000);
      }).catch(function(e){G.saveRecording({cardId:c.id,text:text,blob:null,note:"麦克风权限被拒绝："+(e&&e.name)}).then(function(){msg.innerHTML=why+'<br>麦克风用不了，已加入「待家长审核」，请家长当面听读后通过。';});});}};

  /* ---------- IndexedDB（录音） ---------- */
  var dbp=null;
  G.db=function(){if(dbp)return dbp;dbp=new Promise(function(res,rej){if(!window.indexedDB)return rej(new Error("no indexedDB"));var r=indexedDB.open("xuanxuan-island",1);
      r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains("recordings"))d.createObjectStore("recordings",{keyPath:"id"});};
      r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});return dbp;};
  function tx(mode,fn){return G.db().then(function(d){return new Promise(function(res,rej){var t=d.transaction("recordings",mode),st=t.objectStore("recordings"),out=fn(st);
    t.oncomplete=function(){res(out&&out.result!==undefined?out.result:out);};t.onerror=function(){rej(t.error);};});});}
  G.saveRecording=function(rec){rec.id=rec.id||Date.now().toString(36)+Math.random().toString(36).slice(2,6);rec.date=today();rec.ts=Date.now();rec.status="待审核";
    return tx("readwrite",function(st){st.put(rec);}).catch(function(){var p=load();(p.readQueue=p.readQueue||[]).push({id:rec.id,cardId:rec.cardId,text:rec.text,date:rec.date,status:"待审核",note:"无法保存录音"});save(p);});};
  G.listRecordings=function(){return tx("readonly",function(st){return st.getAll();}).then(function(a){return (a||[]).sort(function(x,y){return y.ts-x.ts;});}).catch(function(){return load().readQueue||[];});};
  G.reviewRecording=function(id,pass){return tx("readonly",function(st){return st.get(id);}).then(function(rec){if(!rec)return null;
      var awarded=pass?G.awardRead(rec.cardId,rec.date):false;rec.status=pass?"已通过":"未通过";rec.awarded=awarded;rec.reviewed=today();
      return tx("readwrite",function(st){st.put(rec);}).then(function(){return rec;});});};

  /* ---------- 错题统计（旧接口） ---------- */
  G.wrongStats=function(subject,data,levels){
    var c={"未练":0,"已练":0,"已过关":0},news=[],rec=load().subjects[subject]||{},passed={};
    (levels||[]).forEach(function(l){if(l.boss&&rec[l.id]&&rec[l.id].bestStars>=2)passed[l.boss]=l;});
    var items=(data&&data.items)||[];
    items.forEach(function(it){var st=G.itemStatus(subject,it);c[st]=(c[st]||0)+1;
      if(it["new"]){var lv=(levels||[]).filter(function(l){return l.boss===it.id;})[0];if(!lv&&subject==="math"&&window.MATH_AUTO){var al=(window.MATH_AUTO.levels||[]).filter(function(l){return (l.items||[]).indexOf(it.id)>=0;})[0];if(al)lv={id:al.id,title:al.title,file:al.file,auto:true};}news.push({it:it,level:lv,status:st});}});
    return {count:c,total:items.length,news:news,updated:data&&data.updated};};
  G.wrongHTML=function(subject,data,levels,base){
    var s=G.wrongStats(subject,data,levels);if(!s.total)return '<p>暂无错题数据</p>';
    var h='<div class="stat3"><span style="background:#C01F1F">未练 '+s.count["未练"]+'</span><span style="background:#D9A400">已练 '+s.count["已练"]+'</span><span style="background:#1E7B34">已过关 '+s.count["已过关"]+'</span></div>';
    if(s.news.length){h+='<div class="newlist"><b><span class="new">NEW</span> 本次Boss关</b>';
      s.news.forEach(function(n){h+='<div class="newitem">'+(n.level?'<a href="'+(base||"")+esc(n.level.file)+'">':'')+'<b>'+esc(n.it.id)+'</b> '+esc(String(n.it["知识点"]).split(/[；;]/)[0])+
        (n.level?' 👉 '+(n.level.auto?'小关':'Boss')+'：'+esc(n.level.title)+'</a>':' <small>（关卡制作中）</small>')+' <small>['+n.status+']</small></div>';});h+='</div>';}
    return h+'<small style="color:#888">错题本更新：'+esc(s.updated||"—")+'</small>';};

  /* ---------- 今日练习日志 / 家长导出 ---------- */
  G.logPractice=function(ev){var p=load();p.practiceLog=p.practiceLog||[];
    ev=ev||{};ev.date=ev.date||today();ev.ts=ev.ts||Date.now();
    p.practiceLog.push(ev);
    var cut=Date.now()-60*864e5;
    p.practiceLog=p.practiceLog.filter(function(x){return !x.ts||x.ts>=cut;});
    if(p.practiceLog.length>2000)p.practiceLog=p.practiceLog.slice(-1500);
    save(p);};
  G.levelTitle=function(subject,id){var L=window[upper(subject)+"_LEVELS"]||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i].title||id;return id;};
  G.itemTitle=function(subject,id){var it=G.dataItem(subject,id);if(!it)return id;var kp=String(it["知识点"]||"").split(/[；;]/)[0];return id+(kp?" · "+kp:"");};
  G.todayPracticeText=function(day){day=day||today();var p=load(),logs=(p.practiceLog||[]).filter(function(x){return x.date===day;});
    var lines=["【轩轩闯关岛 · 今日练习】"+day,""];
    function block(subject,label){
      var lv=logs.filter(function(x){return x.subject===subject&&x.kind==="level";});
      var va=logs.filter(function(x){return x.subject===subject&&x.kind==="variant";});
      // 兼容：日志未启用前，用关卡最近日期=今天 作后备
      if(!lv.length){var rec=p.subjects[subject]||{};Object.keys(rec).forEach(function(id){if(rec[id]&&rec[id].date===day)lv.push({id:id,stars:rec[id].stars,correctRate:rec[id].correctRate,fallback:1});});}
      lines.push(label);
      if(!lv.length&&!va.length){lines.push("今天没有新练习。");lines.push("");return;}
      if(lv.length){lines.push("关卡 "+lv.length+" 场：");lv.forEach(function(x){var rate=x.correctRate!=null?Math.round(x.correctRate*100)+"%":"—";
        lines.push("- "+G.levelTitle(subject,x.id)+"　⭐"+(x.stars||"?")+"　正确率 "+rate+(x.fallback?"（按最近日期推断）":""));});}
      if(va.length){var ok=va.filter(function(x){return x.ok;}).length,bad=va.length-ok;
        lines.push("变式 "+va.length+" 题（对 "+ok+" / 错 "+bad+"）：");
        va.forEach(function(x){lines.push("- "+(x.ok?"✅":"❌")+" "+G.itemTitle(subject,x.id)+(x.status?" → "+x.status:""));});}
      else{var c=G.statusCount(subject,window[upper(subject)+"_DATA"]);
        lines.push("变式明细尚未记入今日日志；当前累计：未练 "+c["未练"]+" / 已练 "+c["已练"]+" / 已过关 "+c["已过关"]+"（请继续练，之后会按题记录）");}
      lines.push("");}
    block("math","【数学】");block("physics","【物理】");
    lines.push("用法：复制整段发群里或私信周老师/物理老师，即可据此写当日反馈。");
    return lines.join("\n");};
  G.copyText=function(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);
    return new Promise(function(res,rej){var a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.left="-9999px";document.body.appendChild(a);a.select();
      try{document.execCommand("copy");res();}catch(e){rej(e);}document.body.removeChild(a);});};

  /* ---------- 家长周报 ---------- */
  G.reportHTML=function(){var p=load(),h="";[["math","🔢 数学岛"],["physics","⚡ 物理岛"]].forEach(function(s){var L=window[upper(s[0])+"_LEVELS"]||[],rec=p.subjects[s[0]]||{},ids=L.map(function(l){return l.id;});
      Object.keys(rec).forEach(function(k){if(ids.indexOf(k)<0)ids.push(k);});h+='<div class="card"><h2>'+s[1]+'</h2>';
      if(!ids.length){h+='<p>暂无关卡</p></div>';return;}
      h+='<table><tr><th>关卡</th><th>星星</th><th>正确率</th><th>最近日期</th></tr>';
      ids.forEach(function(id){var l=L.filter(function(x){return x.id===id;})[0],r=rec[id];
        h+='<tr><td>'+esc(l?l.title:id)+'</td><td>'+(r?"⭐".repeat(r.stars)+'<br><small>最高'+r.bestStars+'</small>':'未玩')+'</td><td>'+(r?Math.round(r.correctRate*100)+'%':'—')+'</td><td>'+(r?r.date:'—')+'</td></tr>';});
      h+='</table></div>';});return h;};

  /* ---------- 通用闯关引擎（数学关使用，物理可选） ---------- */
  G.num=function(s){s=String(s==null?"":s).replace(/\s/g,"").replace(/[−–—]/g,"-").replace(/[（）()]/g,"");if(!s)return NaN;
    var m=s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);if(m)return +m[1]/+m[2];return /^-?\d+(\.\d+)?$/.test(s)?+s:NaN;};
  G.eq=function(a,b){return Math.abs(a-b)<1e-6;};
  G.dataItem=function(subject,id){var d=window[upper(subject)+"_DATA"];return d&&d.items?d.items.filter(function(x){return x.id===id;})[0]:null;};
  G.quiz=function(cfg){var items=cfg.items,idx=0,MAXH=3,hearts=MAXH,first=0,tried=false,sel=-1,$=function(id){return document.getElementById(id);};
    items.forEach(function(it,i){if(it.srcQ){var d=G.dataItem(cfg.subject,it.srcQ);it.qText=(it.qPrefix||"")+(d?d["原题"]:"（错题本缺少 "+it.srcQ+"）")+(it.qSuffix||"");}
      var w=it.whySrc&&G.dataItem(cfg.subject,it.whySrc);it.whyCard={id:cfg.subject+":"+cfg.levelId+":"+i,"错因":w?w["为什么错"]:(it.why||{})["错因"],"概念":w?w["概念"]:(it.why||{})["概念"],"公式":w?w["公式"]:(it.why||{})["公式"]};
      if(w)it.whyCard.id=cfg.subject+":"+it.whySrc;});
    G._quiz={item:function(){return items[idx];},index:function(){return idx;},hearts:function(){return hearts;}};
    function hud(){$("hearts").textContent="❤️".repeat(hearts)+"🤍".repeat(MAXH-hearts);$("stage").textContent=Math.min(idx+1,items.length)+"/"+items.length;$("coins").textContent="🪙 "+G.totals().coins;}
    function mcHTML(o){return o.map(function(x,j){return '<button class="opt" data-j="'+j+'">'+esc(x)+'</button>';}).join("");}
    function bindMC(){sel=-1;[].forEach.call($("box").querySelectorAll(".opt"),function(b){b.onclick=function(){[].forEach.call($("box").querySelectorAll(".opt"),function(x){x.classList.remove("sel");});b.classList.add("sel");sel=+b.dataset.j;};});}
    function render(msg){var it=items[idx];hud();cfg.onItem&&cfg.onItem(it,idx);
      var h='<span class="tag" style="background:'+(it.boss?"#C01F1F":"#D96B00")+'">'+esc(it.kind)+(it.srcQ?' · 错题本 '+esc(it.srcQ):'')+'</span><div class="qtext">'+(it.qText?nl(it.qText):"")+(it.q?'<p>'+nl(it.q)+'</p>':'')+'</div>';
      if(it.type==="mc")h+=mcHTML(it.opts);else h+='<div class="form">'+it.form+'</div>';
      h+='<div class="msg" id="msg">'+(msg||"")+'</div><button class="btn red" id="submit">提交</button>';$("box").innerHTML=h;if(it.type==="mc")bindMC();$("submit").onclick=submit;}
    function check(it){if(it.type==="mc")return sel<0?null:sel===it.ans;var v={},blank=false;
      [].forEach.call($("box").querySelectorAll("[data-f]"),function(x){var val=String(x.value||"").trim();if(!val)blank=true;v[x.getAttribute("data-f")]=val;});return blank?null:!!it.check(v);}
    function lose(){hearts=Math.max(0,hearts-1);hud();}
    function submit(){var it=items[idx],r=check(it);
      if(r===null){lose();G.sfx("wrong");if(hearts===0)return gameOver();$("msg").innerHTML='<span class="bad">有一步空着就交了，扣 1 ❤️！</span>';return;}
      if(r){if(!tried)first++;tried=false;G.correct();if(it.type==="mc")$("box").querySelectorAll(".opt")[it.ans].classList.add("right");
        $("msg").innerHTML='<span class="ok">✅ 答对！+'+COIN_PER_CORRECT+' 🪙</span>';$("submit").disabled=true;hud();setTimeout(function(){idx++;idx<items.length?render():end();},1000);return;}
      tried=true;lose();G.wrong();if(it.type==="mc")$("box").querySelectorAll(".opt")[sel].classList.add("wrong");showVariant();}
    function showVariant(){var it=items[idx];
      $("box").innerHTML='<span class="tag" style="background:#1E7B34">复活挑战</span><div class="hint">💡 提示：'+nl(it.hint)+'</div>'+G.whyCardHTML(it.whyCard)+
        '<p class="vq"><b>变式题：</b>'+nl(it.v.q)+'</p>'+mcHTML(it.v.opts)+'<div class="msg" id="msg">'+(hearts===0?'<span class="bad">❤️ 用完了！答对变式题就能复活！</span>':'答对变式题可复活 1 ❤️')+'</div><button class="btn green" id="submit">提交变式题</button>';
      G.bindWhyCard($("box"),it.whyCard);bindMC();$("submit").onclick=function(){if(sel<0){$("msg").innerHTML='<span class="bad">先选一个答案哦</span>';return;}
        if(sel===it.v.ans){hearts=Math.min(MAXH,hearts+1);G.sfx("correct");G.praise();render('<span class="ok">💖 复活成功！再试一次原题</span>');}
        else{$("box").querySelectorAll(".opt")[sel].classList.add("wrong");G.wrong();if(hearts===0)return gameOver();lose();if(hearts===0)return gameOver();$("msg").innerHTML='<span class="bad">不对，扣 1 ❤️，再看看讲解卡</span>';}};}
    function gameOver(){hud();$("box").innerHTML='<h2>💔 挑战失败</h2><p>❤️ 用完了，别灰心，再来一次！</p><button class="btn red" onclick="location.reload()">重新挑战</button><a class="btn ghost" href="index.html">返回地图</a>';}
    function end(){var rate=first/items.length,stars=cfg.stars?cfg.stars(rate):(rate>=.85?3:rate>=.55?2:1),res=G.finish(cfg.subject,cfg.levelId,stars,rate);hud();cfg.onEnd&&cfg.onEnd();
      $("box").innerHTML='<h1 id="result">🎉 通关！</h1><div style="text-align:center;font-size:48px">'+"⭐".repeat(stars)+"☆".repeat(3-stars)+'</div>'+
        '<p style="text-align:center">一次答对 '+first+'/'+items.length+'（正确率 '+Math.round(rate*100)+'%）<br>过关奖励 +'+res.bonus+' 🪙，金币总数 '+res.coins+'</p>'+
        '<a class="btn green" id="tomap" href="index.html">返回地图</a><a class="btn ghost" href="../index.html">回首页</a>';}
    render();};

  /* 自动错题小关：每题 = 错题本原题(自评) + 变式(自评)。原题做错 → 扣❤️ + 鼓励 + 讲解卡；变式做对可复活。 */
  G.selfQuiz=function(cfg){var ids=cfg.ids,items=ids.map(function(id){return G.dataItem(cfg.subject,id);}).filter(Boolean),
    idx=0,step=0,MAXH=3,hearts=MAXH,first=0,missed=false,$=function(id){return document.getElementById(id);};
    function hud(){$("hearts").textContent="❤️".repeat(hearts)+"🤍".repeat(MAXH-hearts);$("stage").textContent=Math.min(idx+1,items.length)+"/"+items.length;$("coins").textContent="🪙 "+G.totals().coins;}
    function card(it){return {id:cfg.subject+":"+it.id,"错因":it["为什么错"],"概念":it["概念"],"公式":it["公式"]};}
    function render(msg){var it=items[idx],v=(it["变式"]||[])[0];hud();
      var orig=step===0,h='<span class="tag" style="background:'+(orig?"#D96B00":"#1E7B34")+'">'+(orig?"原题 · 错题本 "+esc(it.id):"变式题 · 举一反三")+'</span>'+
        '<p style="opacity:.7">'+esc(it["知识点"]||"")+'</p><div class="qtext" style="font-size:20px">'+nl(orig?it["原题"]:v.q)+'</div>'+
        (msg?'<div class="msg">'+msg+'</div>':'')+(!orig&&missed?G.whyCardHTML(card(it)):'')+
        '<p style="opacity:.75">先在草稿纸上做完，再看答案自己判对错。</p><button class="btn orange" id="show">想好了，看答案</button><div id="res"></div>';
      if(!orig){$("box").innerHTML='<span class="tag" style="background:#1E7B34">变式题 · 举一反三</span> '+G.statusTag(G.itemStatus(cfg.subject,it))+(msg?'<div class="msg">'+msg+'</div>':'')+'<div id="vw"></div>';
        G.variantWidget($("vw"),v,{subject:cfg.subject,item:it,onDone:function(ok){varDone(ok);}});return;}
      $("box").innerHTML=h;
      $("show").onclick=function(){this.remove();$("res").innerHTML='<div class="hint"><b>答案：</b>'+nl(orig?it["正确答案"]:v.a)+(orig?'':'<br><b>解析：</b>'+nl(v.explain||""))+'</div>'+
        '<button class="btn green" id="yes">✅ 我做对了</button><button class="btn red" id="no">❌ 我做错了</button>';$("yes").onclick=function(){mark(true);};$("no").onclick=function(){mark(false);};};}
    function nextStep(){var it=items[idx];if(step===0&&(it["变式"]||[]).length){step=1;render();}else{step=0;missed=false;idx++;idx<items.length?render():end();}}
    function mark(ok){var it=items[idx];
      if(step===0){if(ok){first++;G.correct();missed=false;nextStep();}else{missed=true;hearts--;G.wrong();if(hearts<=0&&!(it["变式"]||[]).length)return gameOver();step=1;render('<span class="bad">没关系！先看讲解卡，再做变式题'+(hearts<=0?'——答对就复活！':'，答对可复活 1 ❤️')+'</span>');}return;}
      }
    function varDone(ok){if(ok===null)return nextStep();/* 金币/语音/状态已由 variantWidget 处理 */
      if(ok){if(missed)hearts=Math.min(MAXH,hearts+1);nextStep();}else{if(hearts<=0)return gameOver();if(missed){hearts--;if(hearts<=0)return gameOver();}nextStep();}}
    function gameOver(){hud();$("box").innerHTML='<h2>💔 挑战失败</h2><p>❤️ 用完了，别灰心，再来一次！</p><button class="btn red" onclick="location.reload()">重新挑战</button><a class="btn ghost" href="index.html">返回地图</a>';}
    function end(){var rate=items.length?first/items.length:1,stars=rate>=.85?3:rate>=.55?2:1,res=G.finish(cfg.subject,cfg.levelId,stars,rate);hud();
      $("box").innerHTML='<h1 id="result">🎉 通关！</h1><div style="text-align:center;font-size:48px">'+"⭐".repeat(stars)+"☆".repeat(3-stars)+'</div>'+
        '<p style="text-align:center">原题一次做对 '+first+'/'+items.length+'（正确率 '+Math.round(rate*100)+'%）<br>过关奖励 +'+res.bonus+' 🪙，金币总数 '+res.coins+'</p>'+
        '<a class="btn green" id="tomap" href="index.html">返回地图</a><a class="btn ghost" href="../index.html">回首页</a>';}
    G._quiz={item:function(){return items[idx];},index:function(){return idx;},hearts:function(){return hearts;},step:function(){return step;}};
    if(!items.length){$("box").innerHTML="<p>本关暂无题目</p>";return;}render();};

  document.addEventListener("DOMContentLoaded",musicButton);
  if(document.readyState!=="loading")musicButton();

  /* ---------- 可作答变式题：统一格式 + 自动判分 + 逐题状态 ----------
     变式字段：type "choice"|"fill"；stem；options["A. …"]；answer "B" 或 [[可接受…],…]；labels；anyOrder/anyOrderFrom；explain。
     兼容旧物理格式 q/opts/ans(下标)。状态存 localStorage 进度 p.vstatus[subject][id]：未练 / 已练 / 已过关（过关不回退）。 */
  var RANK={"未练":0,"已练":1,"已过关":2};
  G.vNorm=function(v){if(!v)return null;var o={type:v.type,stem:v.stem||v.q||"",explain:v.explain||""};
    if(!o.type)o.type=v.opts?"choice":"fill";
    if(o.type==="choice"){o.options=v.options||v.opts||[];o.ans=typeof v.ans==="number"?v.ans:"ABCDEFG".indexOf(String(v.answer||"").trim().toUpperCase());
      o.options=o.options.map(function(x,k){return /^[A-G][.．、]/.test(x)?x:"ABCDEFG"[k]+". "+x;});o.ok=o.ans>=0&&o.ans<o.options.length;}
    else{var a=v.answer;if(typeof a==="string")a=[[a]];else if(a&&a.length&&typeof a[0]==="string")a=v.labels&&v.labels.length===a.length?a.map(function(x){return [x];}):[a];
      o.blanks=a||[];o.labels=v.labels||o.blanks.map(function(){return "答案";});o.anyOrder=!!v.anyOrder;o.from=v.anyOrderFrom||0;o.ok=o.blanks.length>0;}
    return o;};
  /* 游戏内状态只看轩轩在闯关岛的作答，错题本/数据里的「状态」不作为起点（家长 10-22 要求全部从未练开始） */
  G.itemStatus=function(subject,it){return ((load().vstatus||{})[subject]||{})[it.id]||"未练";};
  G.setItemStatus=function(subject,id,ok){var p=load();p.vstatus=p.vstatus||{};var m=p.vstatus[subject]=p.vstatus[subject]||{};
    var cur=m[id]||"未练",nw=ok?"已过关":"已练";if(RANK[nw]>RANK[cur])m[id]=nw;save(p);
    G.logPractice({kind:"variant",subject:subject,id:id,ok:!!ok,status:m[id]||nw});return m[id];};
  G.statusTag=function(st){var c={"未练":"#C01F1F","已练":"#D9A400","已过关":"#1E7B34"}[String(st).split(" ")[0]]||"#888";
    return '<span class="sttag" style="display:inline-block;background:'+c+';color:#fff;border-radius:10px;padding:1px 8px;font-size:14px;margin-left:4px">'+st+'</span>';};
  G.statusCount=function(subject,data){var c={"未练":0,"已练":0,"已过关":0};((data&&data.items)||[]).forEach(function(it){c[G.itemStatus(subject,it)]++;});return c;};
  G.statusSummaryHTML=function(subject,data){var c=G.statusCount(subject,data);
    return '<div class="stat3"><span style="background:#C01F1F">未练 '+c["未练"]+'</span><span style="background:#D9A400">已练 '+c["已练"]+'</span><span style="background:#1E7B34">已过关 '+c["已过关"]+'</span></div>';};
  /* 数学表达式数值化：√ ∛ sqrt π × ÷ ^ 隐式乘法 与 字母（多组随机值代入比较） */
  function evalExpr(s,vars){var t=s,i=0;
    function peek(){return t[i];}
    function num(){var m=t.slice(i).match(/^\d+(\.\d+)?/);if(!m)throw 0;i+=m[0].length;return +m[0];}
    function atom(){var c=peek();if(c==="("){i++;var v=add();if(t[i]!==")")throw 0;i++;return v;}
      if(c==="√"||c==="∛"){i++;var r=pow();return c==="√"?(r<0?NaN:Math.sqrt(r)):Math.cbrt(r);}
      if(c==="π"){i++;return Math.PI;}
      if(/[a-z]/.test(c)){i++;if(!(c in vars))throw 0;return vars[c];}
      return num();}
    function pow(){var b=atom();if(t[i]==="^"){i++;var sg=1;if(t[i]==="-"){sg=-1;i++;}return Math.pow(b,sg*pow());}return b;}
    function unary(){if(t[i]==="-"){i++;return -unary();}if(t[i]==="+"){i++;return unary();}return pow();}
    function mul(){var v=unary();for(;;){var c=t[i];if(c==="*"){i++;v*=unary();}else if(c==="/"){i++;v/=unary();}
      else if(c&&/[\d(√∛πa-z]/.test(c)){v*=pow();}else return v;}}
    function add(){var v=mul();for(;;){if(t[i]==="+"){i++;v+=mul();}else if(t[i]==="-"){i++;v-=mul();}else return v;}}
    var r=add();if(i!==t.length)throw 0;return r;}
  function norm(s){s=String(s==null?"":s).replace(/[\uFF01-\uFF5E]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0);})
      .replace(/\u3000/g," ").replace(/[−–—﹣]/g,"-").replace(/[×·]/g,"*").replace(/÷/g,"/").replace(/sqrt/gi,"√").replace(/cbrt/gi,"∛").replace(/pi/gi,"π")
      .replace(/\+\/-|\+-|正负/g,"±").replace(/[，、；;]/g,",").replace(/[²]/g,"^2").replace(/[³]/g,"^3").replace(/\s+/g,"").replace(/[。.]$/,"");
    s=s.replace(/(千米|公里|km|海里|厘米|cm|毫米|mm|米|m|秒|s|个|人|度|°)$/i,"");
    var m=s.match(/^[A-Za-z][A-Za-z0-9₁₂₃]*=(.+)$/);if(m)s=m[1]; // x=…、k=…、y=…
    m=s.match(/^[A-Z][₁₂₃0-9]*(\(.*\))$/);if(m)s=m[1];             // P(3,4) → (3,4)
    return s;}
  var VARS=[{a:1.37,b:2.11,x:0.73,t:1.91,m:2.6,n:0.47,k:1.3},{a:3.3,b:-1.7,x:-2.2,t:0.35,m:-0.9,n:4.1,k:-2.4}];
  function valEq(u,a){try{return VARS.every(function(V){var x=evalExpr(u,V),y=evalExpr(a,V);return isFinite(x)&&isFinite(y)&&Math.abs(x-y)<1e-6*Math.max(1,Math.abs(y));});}catch(e){return null;}}
  function splitTop(s){var out=[],d=0,cur="";for(var k=0;k<s.length;k++){var c=s[k];if(c==="(")d++;if(c===")")d--;if(c===","&&d===0){out.push(cur);cur="";}else cur+=c;}out.push(cur);return out;}
  G.matchOne=function(input,acc){var u=norm(input);if(!u)return false;
    if(acc.charAt(0)==="~"){try{return Math.abs(evalExpr(u,{})-(+acc.slice(1)))<=0.051;}catch(e){return false;}}
    var a=norm(acc);if(u===a)return true;
    var pu=u.charAt(0)==="±",pa=a.charAt(0)==="±";if(pu!==pa)return false;if(pu){u=u.slice(1);a=a.slice(1);}
    var tu=/^\(.*\)$/.test(u)&&splitTop(u.slice(1,-1)),ta=/^\(.*\)$/.test(a)&&splitTop(a.slice(1,-1));
    if(ta&&ta.length>1){if(!tu||tu.length!==ta.length)return false;return ta.every(function(x,k){return x===tu[k]||valEq(tu[k],x)===true;});}
    return valEq(u,a)===true;};
  G.matchAny=function(input,list){return list.some(function(x){return G.matchOne(input,x);});};
  /* 返回每空对错数组；anyOrder 时 from 之后的空可任意顺序（不允许一个答案重复用两次） */
  G.checkFill=function(o,inputs){var res=inputs.map(function(){return false;}),used={};
    o.blanks.forEach(function(acc,k){if(!o.anyOrder||k<o.from)res[k]=G.matchAny(inputs[k],acc);});
    if(o.anyOrder){for(var k=o.from;k<inputs.length;k++){for(var j=o.from;j<o.blanks.length;j++){if(!used[j]&&G.matchAny(inputs[k],o.blanks[j])){used[j]=1;res[k]=true;break;}}}}
    return res;};
  G.answerText=function(o){return o.type==="choice"?o.options[o.ans]:o.blanks.map(function(a,k){return (o.labels[k]||"")+" "+a[0].replace(/^~/,"≈");}).join("；")+(o.anyOrder?"（顺序不限）":"");};
  /* 渲染一道可作答变式题。opt:{subject,item,onDone(ok)}；答对 +金币+表扬；答错 鼓励+讲解卡+正确答案 */
  G.variantWidget=function(el,v,opt){var o=G.vNorm(v),it=opt.item,done=false,sel=-1;
    if(!o||!o.ok){el.innerHTML='<p class="bad">这道变式题缺答案，已跳过</p><button class="btn green" id="vx">下一题 →</button>';el.querySelector("#vx").onclick=function(){opt.onDone&&opt.onDone(null);};return;}
    var h='<div class="vstem" style="font-size:20px">'+nl(o.stem)+'</div>';
    if(o.type==="choice")h+=o.options.map(function(x,j){return '<button class="opt vopt" data-j="'+j+'">'+esc(x)+'</button>';}).join("");
    else h+=o.labels.map(function(l,k){return '<label style="display:block;margin:8px 0;font-size:18px">'+esc(l)+' <input class="vin" data-k="'+k+'" autocomplete="off" style="font-size:20px;padding:6px 10px;border:3px solid var(--orange);border-radius:10px;width:min(260px,90%)"></label>';}).join("")+
      '<small style="opacity:.7">根号可输入 √ 或 sqrt，分数写 a/b，坐标写 (x,y)'+(o.anyOrder?'；多个答案顺序不限':'')+'</small>';
    h+='<div class="msg" id="vmsg"></div><button class="btn green" id="vsub">提交答案</button><div id="vres"></div>';el.innerHTML=h;
    var $q=function(s){return el.querySelector(s);};
    [].forEach.call(el.querySelectorAll(".vopt"),function(b){b.onclick=function(){if(done)return;sel=+b.dataset.j;[].forEach.call(el.querySelectorAll(".vopt"),function(x){x.classList.toggle("sel",x===b);});};});
    $q("#vsub").onclick=function(){if(done)return;var ok,marks;
      if(o.type==="choice"){if(sel<0){$q("#vmsg").innerHTML='<span class="bad">先选一个答案哦</span>';return;}ok=sel===o.ans;}
      else{var ins=[].map.call(el.querySelectorAll(".vin"),function(x){return x.value;});if(ins.some(function(x){return !x.trim();})){$q("#vmsg").innerHTML='<span class="bad">还有空没填哦</span>';return;}
        marks=G.checkFill(o,ins);ok=marks.every(Boolean);[].forEach.call(el.querySelectorAll(".vin"),function(x,k){x.style.borderColor=marks[k]?"#1E7B34":"#C01F1F";x.disabled=true;});}
      done=true;$q("#vsub").remove();var st=it?G.setItemStatus(opt.subject,it.id,ok):null;
      if(o.type==="choice"){var bs=el.querySelectorAll(".vopt");bs[o.ans].classList.add("right");if(!ok)bs[sel].classList.add("wrong");}
      var r=$q("#vres"),card=it?{id:opt.subject+":"+it.id,"错因":it["为什么错"],"概念":it["概念"],"公式":it["公式"]}:null;
      if(ok){G.correct();r.innerHTML='<p class="ok" style="font-size:20px">✅ 答对了！+'+G.COIN_PER_CORRECT+' 🪙 '+(st?G.statusTag(st):'')+'</p><div class="hint"><b>解析：</b>'+nl(o.explain)+'</div>';}
      else{G.wrong();r.innerHTML='<p class="bad" style="font-size:20px">❌ 差一点！别灰心 '+(st?G.statusTag(st):'')+'</p><div class="hint"><b>正确答案：</b>'+esc(G.answerText(o))+'<br><b>解析：</b>'+nl(o.explain)+'</div>'+(card?G.whyCardHTML(card):'');
        if(card)G.bindWhyCard(r,card);}
      r.insertAdjacentHTML("beforeend",'<button class="btn green big" id="vx">下一题 →</button>');$q("#vx").onclick=function(){opt.onDone&&opt.onDone(ok);};G.refreshBars&&G.refreshBars();};};
  /* 变式练习页：筛选（全部 / 未过关 / 未练）+ 状态标签 + 自动判分。“接上题”组保持原顺序（列表按错题→变式顺序，不打乱）。 */
  G.variantPractice=function(el,subject,data){var items=(data&&data.items)||[],mode=sessionStorage.getItem("xx-var-mode-"+subject)||"todo",queue=[],qi=0;
    function build(){queue=[];items.forEach(function(it){var st=G.itemStatus(subject,it);if(mode==="todo"&&st==="已过关")return;if(mode==="new"&&st!=="未练")return;
      (it["变式"]||[]).forEach(function(v,k){queue.push({it:it,v:v,k:k});});});qi=0;}
    function menu(){var c=G.statusCount(subject,data);
      el.innerHTML=G.statusSummaryHTML(subject,data)+'<p>选择练习范围：</p>'+
        [["todo","🎯 只练没过关的（未练+已练）"],["new","🆕 只练未练的"],["all","📚 全部"]].map(function(m){return '<button class="btn '+(mode===m[0]?"orange":"ghost")+' vmode" data-m="'+m[0]+'">'+m[1]+'</button>';}).join("")+
        '<button class="btn green big" id="vstart">开始练习</button><h3>错题清单</h3><div class="vlist">'+items.map(function(it){return '<div class="vrow" data-id="'+esc(it.id)+'" style="padding:4px 0;border-bottom:1px dashed #ddd"><b>'+esc(it.id)+'</b> '+esc(String(it["知识点"]||"").split(/[；;]/)[0])+' '+G.statusTag(G.itemStatus(subject,it))+'</div>';}).join("")+'</div>';
      [].forEach.call(el.querySelectorAll(".vmode"),function(b){b.onclick=function(){mode=b.dataset.m;sessionStorage.setItem("xx-var-mode-"+subject,mode);menu();};});
      el.querySelector("#vstart").onclick=function(){build();draw();};}
    function draw(){if(qi>=queue.length){el.innerHTML='<h2>🎉 '+(queue.length?'这一轮练完了！':'这个范围里没有题了！')+'</h2>'+G.statusSummaryHTML(subject,data)+'<button class="btn green" id="vback">回到清单</button>';el.querySelector("#vback").onclick=menu;return;}
      var x=queue[qi];el.innerHTML='<p style="opacity:.7">'+(qi+1)+'/'+queue.length+' · 来自错题 '+esc(x.it.id)+' '+G.statusTag(G.itemStatus(subject,x.it))+' · '+esc(x.it["知识点"]||"")+'</p><h3>变式 '+(x.k+1)+'</h3><div id="vw"></div><button class="btn ghost" id="vq" style="margin-top:12px">返回清单</button>';
      el.querySelector("#vq").onclick=menu;G.variantWidget(el.querySelector("#vw"),x.v,{subject:subject,item:x.it,onDone:function(){qi++;draw();window.scrollTo(0,0);}});}
    menu();};
  window.XXGame=G;
})();
