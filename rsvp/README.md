# AURA RSVP · מערכת אישורי הגעה

מערכת אישורי הגעה לחתונה, מותאמת לאייפון (אפשר להוסיף למסך הבית כאפליקציה).

## מה יש במערכת

- **כניסה מאובטחת עם Google**: רק `arielkahalani1@gmail.com` נכנס כמנהל. האכיפה נעשית גם בשרת (Firestore Rules), לא רק במסך.
- **שותפים**: המנהל יוצר קישור הרשאה ושולח אותו. מי שנכנס דרכו מתחבר עם Google ויכול לייבא ולהזמין את אנשי הקשר **שלו** בלבד. אפשר לבטל גישה בכל רגע.
- **ייבוא אנשי קשר עם בחירה**: בחירה ישירה מאנשי הקשר באייפון (Contact Picker), או ייבוא קובץ vCard של כל אנשי הקשר. אחרי הייבוא בוחרים את מי להוסיף (חיפוש, בחירת הכול, סימון של מי שכבר ברשימה). יש גם הוספה ידנית.
- **תמונת הזמנה**: מעלים תמונה והיא מכווצת אוטומטית. היא מוצגת בדף האורח, ובוואטסאפ היא מופיעה כתצוגה מקדימה גדולה של הקישור. לחיצה עליה פותחת את דף האישור.
- **שליחה לפי קבוצות**: סבב ראשון (מי שעוד לא קיבל), עוד לא ענו, מתלבטים, לא אישרו, לא מגיעים, אישרו (תזכורת), כולם. אפשר גם לסנן לפי קבוצה (משפחה, חברים וכו׳) ולפי מי הוסיף. השליחה עוברת אורח אחרי אורח בוואטסאפ, ב־SMS, או בתמונה וקישור דרך תפריט השיתוף, ועם כל אורח הודעה אישית וקישור אישי.
- **דף האורח**: ההזמנה, תאריך עברי ולועזי, שעות, ניווט ב־Waze לאלגריה, הוספה ליומן, ספירה לאחור, ושלושה כפתורים:
  ירוק **מגיע/ה** (בוחרים כמה מבוגרים וכמה ילדים, ואז מופיעה הודעת אישור), **עדיין מתלבט/ת**, ואדום **לא מגיע/ה**. אפשר לשנות תשובה מאוחר יותר.
- **לוח בקרה בזמן אמת**: צפי אורחים, אחוז היענות, התפלגות תשובות, משפך שליחה, קצב תשובות, פילוח לפי מזמין ולפי קבוצה, ותשובות אחרונות. יש גם ייצוא לאקסל (CSV).

## הקמה (פעם אחת, כ־15 דקות)

### 1. Firebase (חינם)
1. נכנסים ל־<https://console.firebase.google.com> ויוצרים פרויקט חדש.
2. **Authentication** ← Get started ← Sign-in method ← מפעילים **Google**.
3. **Firestore Database** ← Create database (Production mode).
4. **Firestore ← Rules**: מדביקים את תוכן הקובץ `firestore.rules` ולוחצים Publish.
5. **Project settings ← Your apps ← Web (</>)**: רושמים אפליקציה ומעתיקים את `apiKey`, `authDomain`, `projectId`, `appId`.

### 2. פריסה ל־Vercel (חינם)
1. ב־<https://vercel.com> ← Add New Project ← מייבאים את הריפו `Aura-event`.
2. **Root Directory**: `rsvp`.
3. **Environment Variables**: לפי `.env.example`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_OWNER_EMAIL=arielkahalani1@gmail.com
   ```
4. Deploy.
5. בחזרה ב־Firebase: **Authentication ← Settings ← Authorized domains**, מוסיפים את הדומיין של Vercel (למשל `aura-rsvp.vercel.app`).

### 3. באייפון
- פותחים את האתר ב־Safari ← כפתור שיתוף ← **הוספה למסך הבית**.
- כדי לבחור אנשי קשר ישירות מהטלפון: **הגדרות ← אפליקציות ← Safari ← מתקדם ← Feature Flags ← Contact Picker API**. אפשר גם בלי זה: ייבוא קובץ (אנשי קשר ← רשימות ← לחיצה ארוכה על "כל אנשי הקשר" ← ייצוא).

## פיתוח מקומי

```bash
cd rsvp
npm install
cp .env.example .env.local   # ממלאים פרטים, או מול האמולטור:
                             # NEXT_PUBLIC_USE_EMULATOR=1, NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-aura
npx firebase-tools emulators:start --only auth,firestore --project demo-aura
npm run dev
npm run test:rules           # בדיקות אבטחה מול האמולטור
```

## הערה על שליחה אוטומטית
וואטסאפ לא מאפשר שליחה המונית אוטומטית מטלפון פרטי. לכן המערכת מכינה לכל אורח הודעה אישית מוכנה, ושולחים בלחיצה אחת לכל אורח. שליחה אוטומטית לגמרי בלי לחיצות דורשת חשבון WhatsApp Business API בתשלום (למשל דרך Twilio), ואפשר להוסיף אותה בהמשך.
