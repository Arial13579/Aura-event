const { chromium } = require('playwright');
const out = '/home/user/Aura-event/tiktok-images';
const css = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
.bgl{position:absolute;inset:0;overflow:hidden;z-index:1}
body{font-family:'Heebo',sans-serif;direction:rtl;color:#3B3355;overflow:hidden;position:relative;
 background:var(--bg)}
.blob{position:absolute;border-radius:50%;filter:blur(10px);opacity:.55}
.wrap{position:absolute;inset:0;z-index:2;height:100%;padding:150px 90px 170px;display:flex;flex-direction:column}
.tag{align-self:flex-start;background:rgba(255,255,255,.75);padding:16px 34px;border-radius:60px;font-weight:700;font-size:34px;color:var(--accent);box-shadow:0 8px 30px rgba(80,60,120,.08)}
.page{position:absolute;top:70px;left:90px;font-size:32px;font-weight:700;color:rgba(59,51,85,.45);z-index:3}
h1{font-size:104px;line-height:1.08;font-weight:900;margin-top:50px;letter-spacing:-1px}
h1 em{font-style:normal;color:var(--accent)}
.sub{font-size:44px;line-height:1.4;margin-top:34px;color:#5d5578;font-weight:500}
.cards{margin-top:60px;display:flex;flex-direction:column;gap:38px}
.card{background:rgba(255,255,255,.82);border-radius:44px;padding:44px 48px;box-shadow:0 18px 50px rgba(80,60,120,.10);display:flex;gap:34px;align-items:flex-start}
.num{flex:none;width:96px;height:96px;border-radius:30px;background:var(--accent);color:#fff;font-size:52px;font-weight:900;display:flex;align-items:center;justify-content:center}
.card h3{font-size:50px;font-weight:800;line-height:1.2}
.card p{font-size:36px;line-height:1.45;color:#5d5578;margin-top:12px}
.save{display:inline-block;margin-top:16px;background:var(--soft);color:var(--accent);font-weight:800;font-size:32px;padding:8px 22px;border-radius:20px}
.foot{margin-top:auto;font-size:38px;font-weight:700;color:#5d5578;text-align:center}
.foot b{color:var(--accent)}
`;
const css2 = `
.big{font-size:300px;font-weight:900;line-height:.9;color:var(--accent);opacity:.9;margin-top:40px}
.ex{margin-top:50px;background:rgba(255,255,255,.82);border-radius:44px;padding:50px;box-shadow:0 18px 50px rgba(80,60,120,.10)}
.ex .lbl{font-size:32px;font-weight:800;color:var(--accent);margin-bottom:18px}
.ex p{font-size:40px;line-height:1.5;color:#4a4266}
.bubble{background:var(--soft);border-radius:30px 30px 30px 8px;padding:28px 34px;font-size:38px;line-height:1.45;margin-top:16px;color:#3B3355}
.chip{align-self:flex-start;margin-top:44px;background:var(--accent);color:#fff;font-weight:800;font-size:38px;padding:18px 36px;border-radius:60px}
.hero-list{margin-top:70px;display:flex;flex-direction:column;gap:30px}
.hero-list div{background:rgba(255,255,255,.8);border-radius:36px;padding:34px 44px;font-size:44px;font-weight:700;box-shadow:0 14px 40px rgba(80,60,120,.08)}
.hero-list span{color:var(--accent);font-weight:900;margin-left:18px}
`;
const blobs = (c1,c2,c3)=>`<div class="bgl"><div class="blob" style="width:700px;height:700px;background:${c1};top:-200px;left:-250px"></div>
<div class="blob" style="width:600px;height:600px;background:${c2};bottom:-150px;right:-200px"></div>
<div class="blob" style="width:380px;height:380px;background:${c3};top:45%;left:-120px"></div></div>`;
const page = (n, theme, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}${css2}
:root{--bg:${theme.bg};--accent:${theme.accent};--soft:${theme.soft}}</style></head>
<body>${blobs(...theme.blobs)}<div class="page">${n}/5</div><div class="wrap">${body}</div></body></html>`;
const card = (i,t,p,s)=>`<div class="card"><div class="num">${i}</div><div><h3>${t}</h3><p>${p}</p>${s?`<span class="save">${s}</span>`:''}</div></div>`;

const T = [
 {bg:'linear-gradient(160deg,#FDE8E4 0%,#F3E6FA 55%,#E4EEFD 100%)',accent:'#C2577A',soft:'#FBE0E8',blobs:['#FFC9C2','#C9D8FF','#E6C8F5']},
 {bg:'linear-gradient(160deg,#E6F6F1 0%,#EAF0FB 100%)',accent:'#2E8C7A',soft:'#D5F0E8',blobs:['#BDEBDD','#CFDDFB','#FFF0C2']},
 {bg:'linear-gradient(160deg,#FFF3E2 0%,#FCE6EC 100%)',accent:'#D0703C',soft:'#FFE5D2',blobs:['#FFD9B0','#F8C9D6','#FFF2C0']},
 {bg:'linear-gradient(160deg,#EEE9FB 0%,#E3F1FA 100%)',accent:'#6A55C2',soft:'#E5DEFA',blobs:['#D3C7F7','#BFE3F5','#F7D0E6']},
 {bg:'linear-gradient(160deg,#F6E9FB 0%,#FDE9E2 50%,#FFF6DF 100%)',accent:'#A2479A',soft:'#F5DDF2',blobs:['#EBC6F2','#FFD3C4','#FFE9A8']},
];

const pages = [
 page(1,T[0],`<div class="tag">לבעלי עסקים בתחום האירועים</div>
 <h1 style="font-size:116px;margin-top:80px">בעל עסק של אירועים<br>ו<em>אין לך זמן?</em></h1>
 <div class="sub" style="font-size:52px;font-weight:700;color:#3B3355;margin-top:50px">קבל 4 טיפים לחסוך זמן<br>כבר מהשבוע הזה</div>
 <div class="hero-list">
  <div><span>01</span>פחות הקלדה</div>
  <div><span>02</span>פחות הודעות הלוך ושוב</div>
  <div><span>03</span>פחות הסחות דעת</div>
  <div><span>04</span>הטיפ שחוסך הכי הרבה</div>
 </div>
 <div class="foot">החליקו ← <b>ותחזירו לעצמכם שעות</b></div>`),
page(2,T[1],`<div class="tag">טיפ 1 · תקשורת</div>
 <div class="big">1</div>
 <h1 style="margin-top:10px"><em>תשובות מוכנות</em><br>בוואטסאפ</h1>
 <div class="sub">את אותן 5 שאלות שואלים אתכם כל יום. תכתבו את התשובה פעם אחת — ותשלחו בלחיצה.</div>
 <div class="ex"><div class="lbl">דוגמה</div><div class="bubble">היי! המחיר לאירוע מתחיל מ־X ₪ וכולל… לבדיקת זמינות שלחו תאריך, מיקום ומספר אורחים</div></div>
 <div class="chip">חיסכון: כ־3 שעות בשבוע</div>
 <div class="foot">החליקו לטיפ הבא ←</div>`),
page(3,T[2],`<div class="tag">טיפ 2 · סדר</div>
 <div class="big">2</div>
 <h1 style="margin-top:10px">טופס <em>אחד</em><br>לכל הפרטים</h1>
 <div class="sub">במקום 20 הודעות "ומה השעה?" "וכמה אורחים?" — לינק לטופס קצר שהלקוח ממלא לבד.</div>
 <div class="ex"><div class="lbl">מה שמים בטופס</div><p>תאריך · מיקום · מספר אורחים · שעות · סוג האירוע · איש קשר ביום האירוע</p></div>
 <div class="chip">חיסכון: כ־40 דקות לכל לקוח</div>
 <div class="foot">החליקו לטיפ הבא ←</div>`),
page(4,T[3],`<div class="tag">טיפ 3 · ריכוז</div>
 <div class="big">3</div>
 <h1 style="margin-top:10px">שעה <em>קבועה</em><br>להודעות</h1>
 <div class="sub">לענות לכל הודעה ברגע שהיא מגיעה — זה מה שגונב לכם את היום. קבעו 2 חלונות ביום לענות לכולם ביחד.</div>
 <div class="ex"><div class="lbl">איך זה נראה</div><p>10:00 ו־17:00 — סבב תשובות.<br>בין לבין: התראות כבויות, עבודה רצופה.</p></div>
 <div class="chip">פחות הסחות · יותר ריכוז</div>
 <div class="foot">החליקו לטיפ הבא ←</div>`),
 page(5,T[4],`<div class="tag">טיפ 4 · הטיפ שחוסך הכי הרבה</div>
 <h1>הצעת מחיר<br>ב<em>דקה</em>, לא בשעה</h1>
 <div class="sub">מערכת הצעות המחיר שלי נבנתה בדיוק בשביל בעלי עסקים בתחום האירועים:</div>
 <div class="cards" style="gap:26px;margin-top:44px">
  ${card('✓','חבילות ותוספות מוכנות מראש','בוחרים, והמחיר מחושב אוטומטית')}
  ${card('✓','הצעה מעוצבת וממותגת בלינק','נראים מקצועיים מהרגע הראשון')}
  ${card('✓','הלקוח מאשר וחותם אונליין','ואתם רואים מתי הוא צפה בהצעה')}
 </div>
 <div class="card" style="margin-top:44px;background:var(--accent);color:#fff;flex-direction:column;align-items:center;text-align:center;gap:10px">
  <h3 style="font-size:56px">רוצים לנסות?</h3>
  <p style="color:#fff;margin:0;font-size:40px">כתבו לי <b>"הצעה"</b> בתגובות או לינק בביו</p>
 </div>`),
];

(async()=>{
 const b = await chromium.launch();
 const p = await b.newPage({viewport:{width:1080,height:1920}});
 for (let i=0;i<pages.length;i++){
  await p.setContent(pages[i],{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:`${out}/tiktok-${i+1}.png`});
 }
 await b.close();
})();
