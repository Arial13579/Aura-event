# AURA EVENT – אתר עמדות צילום לאירועים

## לפני העלאה לאוויר – 3 דברים

1. **תמונות** – להעלות לתיקייה `images/` לפי הרשימה ב-[`images/README.md`](images/README.md).
2. **כתובת האתר (דומיין)** – האתר מוגדר לכתובת `https://auraevent.co.il`.
   אם הכתובת שלכם שונה, החליפו אותה (חיפוש והחלפה של `auraevent.co.il`) בקבצים:
   `index.html`, `privacy.html`, `accessibility.html`, `sitemap.xml`, `robots.txt`.
   (את כתובת המייל `info@auraevent.co.il` לשנות רק אם גם היא שונה.)
3. **טפסים** – הטפסים נשלחים דרך Formspree. היכנסו ל-formspree.io וודאו שהטפסים
   `myzjboyj` (צור קשר) ו-`mpwrobzk` (ביקורות) פעילים ומחוברים למייל שלכם.
   מומלץ להפעיל שם גם את ההגדרה **Restrict to domain** עם הדומיין שלכם, כדי שאף אתר אחר לא יוכל לשלוח דרך הטפסים שלכם.

## איך מעלים לאוויר (חינם)

**אפשרות א' – Netlify (הכי פשוט):** נכנסים ל-app.netlify.com ← Add new site ← Import from GitHub ← בוחרים את
`Aura-event` ← Deploy. אחר כך ב-Domain settings מחברים את הדומיין. כותרות האבטחה בקובץ `_headers` יופעלו אוטומטית.

**אפשרות ב' – GitHub Pages:** ב-GitHub ← Settings ← Pages ← Source: `main` / root ← Save.
לדומיין משלכם: מזינים אותו ב-Custom domain ומסמנים Enforce HTTPS.

## אחרי שהאתר באוויר – כדי שימצאו אתכם בגוגל

1. **Google Search Console** (search.google.com/search-console) – מוסיפים את האתר ושולחים את `sitemap.xml`.
2. **Google Business Profile** (business.google.com) – פותחים כרטיס עסק עם הקישור לאתר. זה הדבר הכי משמעותי לחיפושים כמו "עמדת צילום לחתונה".
3. מבקשים מלקוחות ביקורות בגוגל, ומוסיפים את קישור האתר בביו של אינסטגרם/טיקטוק/פייסבוק.
4. מעדכנים מדי פעם את הגלריה בתמונות מאירועים חדשים (עם שמות קבצים באנגלית).

## מבנה הקבצים

| קובץ | תפקיד |
|---|---|
| `index.html` | העמוד הראשי |
| `main.js` | תפריט מובייל, טפסים, גלריה, דירוג כוכבים |
| `privacy.html` / `accessibility.html` | מדיניות פרטיות והצהרת נגישות |
| `404.html` | עמוד "לא נמצא" |
| `robots.txt` / `sitemap.xml` | הנחיות למנועי חיפוש |
| `_headers` | כותרות אבטחה (Netlify / Cloudflare Pages) |
