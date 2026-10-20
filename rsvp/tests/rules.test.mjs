// Security-rules tests against the local Firebase emulators.
// Run: npm run emulators (in another terminal), then: npm run test:rules
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, query,
  serverTimestamp, setDoc, setLogLevel, updateDoc, where,
} from 'firebase/firestore';

setLogLevel('silent');
const PROJECT = 'demo-aura';
let n = 0;
let failed = 0;

async function client(identity) {
  const app = initializeApp({ apiKey: 'fake', projectId: PROJECT, authDomain: 'localhost' }, `app${n++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  let uid = null;
  if (identity) {
    const cred = GoogleAuthProvider.credential(JSON.stringify({ sub: identity.sub, email: identity.email, email_verified: identity.verified ?? true }));
    uid = (await signInWithCredential(auth, cred)).user.uid;
  }
  return { db, uid };
}

async function expect(label, shouldPass, fn) {
  let ok;
  try { await fn(); ok = true; } catch { ok = false; }
  const good = ok === shouldPass;
  if (!good) failed++;
  console.log(`${good ? '✓' : '✗'} ${label} (${ok ? 'allowed' : 'denied'})`);
}

await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });

const owner = await client({ sub: 'owner', email: 'arielkahalani1@gmail.com' });
const stranger = await client({ sub: 'stranger', email: 'someone@gmail.com' });
const partner = await client({ sub: 'partner', email: 'partner@gmail.com' });
const anon = await client(null);

await expect('owner writes settings', true, () => setDoc(doc(owner.db, 'settings/event'), { coupleNames: 'A & B' }));
await expect('anonymous reads settings', true, () => getDoc(doc(anon.db, 'settings/event')));
await expect('anonymous writes settings', false, () => setDoc(doc(anon.db, 'settings/event'), { coupleNames: 'x' }));
await expect('stranger writes settings', false, () => setDoc(doc(stranger.db, 'settings/event'), { coupleNames: 'x' }));

const g = { name: 'Dana', phone: '972501234567', status: 'pending', adults: 0, kids: 0, sentCount: 0, addedByUid: owner.uid, addedByName: 'Ariel' };
await expect('owner creates guest', true, () => setDoc(doc(owner.db, 'guests/GUEST0001token'), g));
await expect('owner lists guests', true, () => getDocs(collection(owner.db, 'guests')));
await expect('stranger lists guests', false, () => getDocs(collection(stranger.db, 'guests')));
await expect('stranger creates guest', false, () => setDoc(doc(stranger.db, 'guests/STRANGERguest1'), { ...g, addedByUid: stranger.uid }));
await expect('anonymous lists guests', false, () => getDocs(collection(anon.db, 'guests')));

// Guest answering from the invitation page
await expect('guest reads own invitation', true, () => getDoc(doc(anon.db, 'guests/GUEST0001token')));
await expect('guest confirms (2 adults, 1 kid)', true, () => updateDoc(doc(anon.db, 'guests/GUEST0001token'), { status: 'yes', adults: 2, kids: 1, respondedAt: serverTimestamp() }));
await expect('guest changes name', false, () => updateDoc(doc(anon.db, 'guests/GUEST0001token'), { name: 'Hacker' }));
await expect('guest sets 100 adults', false, () => updateDoc(doc(anon.db, 'guests/GUEST0001token'), { status: 'yes', adults: 100, kids: 0, respondedAt: serverTimestamp() }));
await expect('guest sets invalid status', false, () => updateDoc(doc(anon.db, 'guests/GUEST0001token'), { status: 'pending', adults: 0, kids: 0, respondedAt: serverTimestamp() }));
await expect('guest deletes invitation', false, () => deleteDoc(doc(anon.db, 'guests/GUEST0001token')));

// Share links / collaborators
await expect('owner creates share link', true, () => setDoc(doc(owner.db, 'shareLinks/LINK1'), { label: 'partner', active: true }));
await expect('stranger creates share link', false, () => setDoc(doc(stranger.db, 'shareLinks/LINK2'), { label: 'x', active: true }));
await expect('stranger joins with bogus link', false, () => setDoc(doc(stranger.db, `collaborators/${stranger.uid}`), { email: 'someone@gmail.com', name: 's', via: 'NOPE', active: true }));
await expect('partner joins with valid link', true, () => setDoc(doc(partner.db, `collaborators/${partner.uid}`), { email: 'partner@gmail.com', name: 'P', via: 'LINK1', active: true }));
await expect('partner joins as someone else', false, () => setDoc(doc(partner.db, `collaborators/${stranger.uid}`), { email: 'partner@gmail.com', name: 'P', via: 'LINK1', active: true }));
await expect('partner adds own guest', true, () => setDoc(doc(partner.db, 'guests/PARTNERguest01'), { ...g, addedByUid: partner.uid, addedByName: 'P' }));
await expect('partner adds guest as owner', false, () => setDoc(doc(partner.db, 'guests/PARTNERguest02'), g));
await expect('partner lists own guests', true, () => getDocs(query(collection(partner.db, 'guests'), where('addedByUid', '==', partner.uid))));
await expect('partner lists all guests', false, () => getDocs(collection(partner.db, 'guests')));
await expect('partner edits owner guest', false, () => updateDoc(doc(partner.db, 'guests/GUEST0001token'), { sentCount: 5 }));
await expect('partner marks own guest sent', true, () => updateDoc(doc(partner.db, 'guests/PARTNERguest01'), { sentCount: 1 }));
await expect('partner writes settings', false, () => setDoc(doc(partner.db, 'settings/event'), { coupleNames: 'x' }, { merge: true }));
await expect('partner lists collaborators', false, () => getDocs(collection(partner.db, 'collaborators')));
await expect('owner sees partner guests', true, async () => {
  const s = await getDocs(collection(owner.db, 'guests'));
  if (s.size !== 2) throw new Error('expected 2');
});

await expect('owner revokes partner', true, () => updateDoc(doc(owner.db, `collaborators/${partner.uid}`), { active: false }));
await expect('revoked partner lists own guests', false, () => getDocs(query(collection(partner.db, 'guests'), where('addedByUid', '==', partner.uid))));
await expect('revoked partner re-joins', false, () => setDoc(doc(partner.db, `collaborators/${partner.uid}`), { email: 'partner@gmail.com', name: 'P', via: 'LINK1', active: true }));

console.log(failed ? `\n${failed} FAILED` : '\nAll rules tests passed');
process.exit(failed ? 1 : 0);
