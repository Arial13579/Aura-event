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
const blobs = (c1,c2,c3)=>`<div class="bgl"><div class="blob" style="width:700px;height:700px;background:${c1};top:-200px;left:-250px"></div>
<div class="blob" style="width:600px;height:600px;background:${c2};bottom:-150px;right:-200px"></div>
<div class="blob" style="width:380px;height:380px;background:${c3};top:45%;left:-120px"></div></div>`;
const page = (n, theme, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}
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
 page(1,T[0],`<div class="tag">לבעלי עסקים קטנים בתחום האירועים</div>
 <h1>עובדים 12 שעות ביום<br>ו<em>עדיין</em> לא מספיקים?</h1>
 <div class="sub">רוב הזמן שלכם לא הולך על האירוע עצמו —<br>הוא הולך על כל מה שמסביב.</div>
 <div class="cards">
  ${card('?','מענה לאותן שאלות שוב ושוב','"כמה זה עולה?" "אתם פנויים ב־12/3?"')}
  ${card('?','רדיפה אחרי מקדמות ואישורים','הודעות, תזכורות, ועוד הודעות…')}
  ${card('?','הצעת מחיר שלוקחת שעה','וורד, מחשבון, תיקונים ושליחה מחדש')}
 </div>
 <div class="foot">החליקו ← <b>טיפים שיחזירו לכם שעות כל שבוע</b></div>`),
 page(2,T[1],`<div class="tag">טיפ 1–2 · תקשורת עם לקוחות</div>
 <h1>תפסיקו <em>להקליד</em><br>את אותה הודעה</h1>
 <div class="cards">
  ${card(1,'הודעות מוכנות בוואטסאפ ביזנס','הכינו תשובות קבועות: מחירון בסיסי, אזורי שירות, איך מזמינים, מה כלול בחבילה. לחיצה אחת — ונשלח.','חיסכון: ~3 שעות בשבוע')}
  ${card(2,'יומן זמינות אונליין','במקום "רגע, אני בודק ביומן" — שלחו לינק שבו הלקוח רואה תאריכים פנויים וקובע שיחה לבד.','חיסכון: ~2 שעות בשבוע')}
 </div>
 <div class="foot">טיפ קטן: תנו להודעת הפתיחה <b>לסנן</b> לקוחות לא רלוונטיים</div>`),
 page(3,T[2],`<div class="tag">טיפ 3–4 · סדר וארגון</div>
 <h1>כל הפרטים<br>במקום <em>אחד</em></h1>
 <div class="cards">
  ${card(3,'טופס פרטי אירוע אחיד','תאריך, מיקום, מספר אורחים, שעות, איש קשר — טופס אחד במקום 20 הודעות הלוך ושוב.','חיסכון: ~40 דק׳ לכל לקוח')}
  ${card(4,'תזכורות אוטומטיות','תזכורת למקדמה, אישור סופי שבוע לפני, והודעת "מחר נפגשים" — בלי לזכור לבד.','פחות ביטולים, פחות לחץ')}
 </div>
 <div class="foot">מה שלא כתוב — <b>נשכח</b>. מה שאוטומטי — <b>קורה</b>.</div>`),
 page(4,T[3],`<div class="tag">טיפ 5–6 · סגירת עסקאות</div>
 <h1>סוגרים לקוח<br><em>בלי</em> פגישה נוספת</h1>
 <div class="cards">
  ${card(5,'חוזה וחתימה דיגיטלית','הלקוח חותם מהטלפון תוך דקה. בלי הדפסות, סריקות ו"שלחתי לך במייל?"','חיסכון: ~1 שעה לכל סגירה')}
  ${card(6,'לינק תשלום למקדמה','המקדמה משולמת באותו רגע שבו הלקוח מתלהב — ולא אחרי שבוע של מרדפים.','בלי מרדפים אחרי כסף')}
 </div>
 <div class="foot">ורגע לפני כל זה, יש <b>צעד אחד</b> שאוכל הכי הרבה זמן ←</div>`),
 page(5,T[4],`<div class="tag">הטיפ הכי חשוב</div>
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
