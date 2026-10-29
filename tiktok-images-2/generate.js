const { chromium } = require('playwright');
const out = __dirname;
const css = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:'Heebo',sans-serif;direction:rtl;color:#F4EFEA;background:#0E0E10;position:relative}
.bgl{position:absolute;inset:0;overflow:hidden;z-index:1}
.glow{position:absolute;border-radius:50%;filter:blur(120px);opacity:.38}
.wrap{position:absolute;inset:0;z-index:2;padding:150px 90px 150px;display:flex;flex-direction:column}
.page{position:absolute;top:70px;left:90px;font-size:32px;font-weight:700;color:rgba(244,239,234,.4);z-index:3}
.tag{align-self:flex-start;border:2px solid var(--a);color:var(--a);padding:14px 32px;border-radius:60px;font-weight:700;font-size:34px}
.big{font-size:260px;font-weight:900;line-height:.9;color:var(--a);margin-top:50px}
h1{font-size:100px;line-height:1.08;font-weight:900;margin-top:20px;letter-spacing:-1px;color:#fff}
h1 em{font-style:normal;color:var(--a)}
.sub{font-size:42px;line-height:1.45;margin-top:34px;color:#CFC8C2;font-weight:400}
.box{margin-top:50px;background:#1A1A1D;border:1px solid rgba(255,255,255,.08);border-radius:44px;padding:48px 50px}
.box .lbl{font-size:32px;font-weight:800;color:var(--a);margin-bottom:20px}
.box li{list-style:none;font-size:38px;line-height:1.45;color:#E9E3DD;padding-right:44px;position:relative;margin-bottom:14px}
.box li::before{content:'';position:absolute;right:0;top:20px;width:18px;height:18px;border-radius:6px;background:var(--a)}
.chip{align-self:flex-start;margin-top:44px;background:var(--a);color:#0E0E10;font-weight:800;font-size:38px;padding:18px 38px;border-radius:60px}
.foot{margin-top:auto;font-size:36px;font-weight:700;color:#9C958F;text-align:center}
.foot b{color:var(--a)}
.bar{display:flex;height:90px;border-radius:24px;overflow:hidden;margin-top:12px;font-weight:800;font-size:34px}
.bar div{display:flex;align-items:center;justify-content:center}
.apps{margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:22px}
.app{background:#1A1A1D;border:1px solid rgba(255,255,255,.08);border-radius:30px;padding:28px 30px;font-size:36px;font-weight:700;color:#8E8882;position:relative}
.app s{text-decoration-color:var(--a);text-decoration-thickness:4px}
.arrow{text-align:center;font-size:70px;color:var(--a);margin:26px 0 10px;line-height:1}
.one{background:var(--a);color:#0E0E10;border-radius:44px;padding:44px 50px;text-align:center}
.one h3{font-size:58px;font-weight:900}
.one p{font-size:36px;margin-top:10px;font-weight:500}
.cta{margin-top:auto;background:#fff;color:#0E0E10;border-radius:60px;padding:34px;text-align:center;font-size:46px;font-weight:900}
.hero-list{margin-top:70px;display:flex;flex-direction:column;gap:28px}
.hero-list div{background:#1A1A1D;border:1px solid rgba(255,255,255,.08);border-radius:36px;padding:34px 44px;font-size:44px;font-weight:700;color:#F4EFEA}
.hero-list span{color:var(--a);font-weight:900;margin-left:20px}
.cta span{color:var(--a2)}
`;
const P = [
 {a:'#F6B8A8',g:['#F6B8A8','#B9A6F2']},
 {a:'#9EDBC8',g:['#9EDBC8','#F6D59A']},
 {a:'#C3B4F7',g:['#C3B4F7','#F4B6CF']},
 {a:'#F4B6CF',a2:'#B0477A',g:['#F4B6CF','#9EDBC8']},
];
const page=(n,p,body)=>`<!doctype html><html><head><meta charset="utf-8"><style>${css}
:root{--a:${p.a};--a2:${p.a2||p.a}}</style></head><body>
<div class="bgl"><div class="glow" style="width:800px;height:800px;background:${p.g[0]};top:-300px;left:-300px"></div>
<div class="glow" style="width:700px;height:700px;background:${p.g[1]};bottom:-300px;right:-300px"></div></div>
<div class="page">${n}/5</div><div class="wrap">${body}</div></body></html>`;

const pages=[
 page(1,P[0],`<div class="tag">לבעלי עסקים</div>
 <h1 style="font-size:124px;margin-top:80px">בעל עסק<br><em>ואין לך זמן?</em></h1>
 <div class="sub" style="font-size:54px;font-weight:700;color:#fff;margin-top:50px">קבל 4 טיפים לחסוך זמן<br>כבר מהשבוע הזה</div>
 <div class="hero-list">
  <div><span>01</span>לגלות לאן הזמן בורח</div>
  <div><span>02</span>להפסיק לעשות הכול לבד</div>
  <div><span>03</span>להתמקד במה שבאמת מכניס</div>
  <div><span>04</span>הטיפ שחוסך הכי הרבה</div>
 </div>
 <div class="foot">החליקו ← <b>ותחזירו לעצמכם שעות</b></div>`),
 page(2,P[0],`<div class="tag">טיפ 1 · ניהול זמן לבעלי עסקים</div>
 <div class="big">01</div>
 <h1>תעדו את<br>ה<em>יום הממוצע</em> שלכם</h1>
 <div class="sub">קחו דף ורשמו יום רגיל מהבוקר עד הלילה — בדקות. בלי לייפות. ככה תגלו לאן הזמן באמת בורח.</div>
 <div class="box"><div class="lbl">שימו לב במיוחד ל:</div><ul>
  <li>שיחות טלפון והודעות</li><li>נסיעות ושליחויות</li><li>הפסקות ודברים שלא קשורים לעבודה</li></ul></div>
 <div class="chip">מה שנמדד — משתפר</div>
 <div class="foot">החליקו לטיפ הבא ←</div>`),
 page(3,P[1],`<div class="tag">טיפ 2 · האצלת סמכויות</div>
 <div class="big">02</div>
 <h1>תפסיקו<br>לעשות <em>הכול לבד</em></h1>
 <div class="sub">עסק שגדל צריך עוד ידיים. העבירו משימות לאנשים אחרים — אבל רק אחרי שהדרכתם אותם כמו שצריך.</div>
 <div class="box"><div class="lbl">איך עושים את זה נכון:</div><ul>
  <li>מדריכים לפי השיטה שלכם</li><li>מגדירים בדיוק על מה האחריות</li><li>תקופת ניסיון לפני שמשחררים</li></ul></div>
 <div class="chip">אתם מנהלים — לא עושים הכול</div>
 <div class="foot">החליקו לטיפ הבא ←</div>`),
 page(4,P[2],`<div class="tag">טיפ 3 · עקרון פרטו</div>
 <div class="big">03</div>
 <h1>כלל ה־<em>80/20</em></h1>
 <div class="sub">80% מהתוצאות מגיעות מ־20% מהמאמץ. רשמו מה עשיתם היום שבאמת קידם את העסק — ותתמקדו רק בזה.</div>
 <div class="box"><div class="lbl">20% מהמאמץ = 80% מהתוצאה</div>
  <div class="bar"><div style="flex:20;background:var(--a);color:#0E0E10">20%</div><div style="flex:80;background:#2A2A2E;color:#8E8882">80% מהמאמץ</div></div>
  <div class="bar"><div style="flex:80;background:var(--a);color:#0E0E10">80% מהתוצאות</div><div style="flex:20;background:#2A2A2E;color:#8E8882">20%</div></div>
 </div>
 <div class="chip">ולא לקפוץ על כל רעיון חדש</div>
 <div class="foot">ויש עוד דרך לחסוך שעות ←</div>`),
 page(5,P[3],`<div class="tag">הטיפ הכי חוסך</div>
 <h1 style="margin-top:50px">למה לעבוד<br>עם <em>6 מערכות?</em></h1>
 <div class="apps">
  <div class="app"><s>מערכת הצעות מחיר</s></div><div class="app"><s>אקסל לקוחות</s></div>
  <div class="app"><s>אפליקציית חוזים</s></div><div class="app"><s>יומן נפרד</s></div>
  <div class="app"><s>מערכת תשלומים</s></div><div class="app"><s>תזכורות ידניות</s></div>
 </div>
 <div class="arrow">↓</div>
 <div class="one"><h3>תוכנה אחת שיש בה הכול</h3>
  <p>הצעות מחיר, לקוחות, חתימה, תשלום ותזכורות — במקום אחד. בלי לקפוץ בין אפליקציות ובלי להקליד פעמיים.</p></div>
 <div class="cta">כנסו לפרופיל <span>←</span> ותראו איך זה עובד</div>`),
];
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 for(let i=0;i<pages.length;i++){await p.setContent(pages[i],{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:`${out}/tiktok-${i+1}.png`});}
 await b.close();
})();
