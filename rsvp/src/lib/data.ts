'use client';

import { useEffect, useState } from 'react';
import {
  collection, deleteDoc, doc, getDoc, increment, onSnapshot, query, serverTimestamp,
  setDoc, updateDoc, where, writeBatch, type DocumentData, type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_SETTINGS, type EventSettings, type Guest, type Status } from './types';
import { randomToken } from './token';

function ms(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === 'number') return v;
  const t = v as Timestamp;
  return typeof t.toMillis === 'function' ? t.toMillis() : null;
}

export function toGuest(id: string, d: DocumentData): Guest {
  return {
    id,
    name: d.name || '',
    phone: d.phone || '',
    tag: d.tag || '',
    note: d.note || '',
    status: (d.status as Status) || 'pending',
    adults: Number(d.adults) || 0,
    kids: Number(d.kids) || 0,
    addedByUid: d.addedByUid || '',
    addedByName: d.addedByName || '',
    sentCount: Number(d.sentCount) || 0,
    createdAt: ms(d.createdAt),
    lastSentAt: ms(d.lastSentAt),
    respondedAt: ms(d.respondedAt),
  };
}

export interface Viewer {
  uid: string;
  name: string;
  isOwner: boolean;
}

export function useGuests(viewer: Viewer | null) {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!viewer) return;
    const base = collection(db(), 'guests');
    const q = viewer.isOwner ? query(base) : query(base, where('addedByUid', '==', viewer.uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => toGuest(d.id, d.data()));
        list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        setGuests(list);
      },
      (e) => setError(e.message),
    );
  }, [viewer]);

  return { guests, error };
}

export function useSettings() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  useEffect(() => {
    return onSnapshot(doc(db(), 'settings', 'event'), (snap) => {
      setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() || {}) } as EventSettings);
    }, () => setSettings({ ...DEFAULT_SETTINGS }));
  }, []);
  return settings;
}

export async function saveSettings(patch: Partial<EventSettings>) {
  await setDoc(doc(db(), 'settings', 'event'), patch, { merge: true });
}

export async function saveInvitationImage(dataUrl: string) {
  const version = Date.now();
  await setDoc(doc(db(), 'settings', 'invitation'), { dataUrl, updatedAt: version });
  await saveSettings({ invitationVersion: version });
}

export async function removeInvitationImage() {
  await deleteDoc(doc(db(), 'settings', 'invitation'));
  await saveSettings({ invitationVersion: 0 });
}

export interface NewGuest {
  name: string;
  phone: string;
  tag?: string;
  note?: string;
}

export async function addGuests(viewer: Viewer, list: NewGuest[]) {
  // Firestore batches are limited to 500 writes
  for (let i = 0; i < list.length; i += 400) {
    const batch = writeBatch(db());
    for (const g of list.slice(i, i + 400)) {
      batch.set(doc(db(), 'guests', randomToken()), {
        name: g.name.trim().slice(0, 120),
        phone: g.phone,
        tag: (g.tag || '').trim(),
        note: (g.note || '').trim(),
        status: 'pending',
        adults: 0,
        kids: 0,
        sentCount: 0,
        addedByUid: viewer.uid,
        addedByName: viewer.name,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

export async function updateGuest(id: string, patch: Partial<Omit<Guest, 'id'>>) {
  const data: DocumentData = { ...patch };
  if ('status' in patch) data.respondedAt = patch.status === 'pending' ? null : serverTimestamp();
  await updateDoc(doc(db(), 'guests', id), data);
}

export async function deleteGuests(ids: string[]) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db());
    ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db(), 'guests', id)));
    await batch.commit();
  }
}

export async function markSent(id: string) {
  await updateDoc(doc(db(), 'guests', id), { sentCount: increment(1), lastSentAt: serverTimestamp() });
}

// ---------- Team ----------

export interface ShareLink { id: string; label: string; active: boolean; createdAt: number | null }
export interface Collaborator { id: string; name: string; email: string; active: boolean; joinedAt: number | null }

export function useTeam(enabled: boolean) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const u1 = onSnapshot(collection(db(), 'shareLinks'), (s) =>
      setLinks(s.docs.map((d) => ({ id: d.id, label: d.data().label || '', active: !!d.data().active, createdAt: ms(d.data().createdAt) }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))));
    const u2 = onSnapshot(collection(db(), 'collaborators'), (s) =>
      setCollabs(s.docs.map((d) => ({ id: d.id, name: d.data().name || '', email: d.data().email || '', active: !!d.data().active, joinedAt: ms(d.data().joinedAt) }))));
    return () => { u1(); u2(); };
  }, [enabled]);
  return { links, collabs };
}

export async function createShareLink(label: string) {
  const id = randomToken(24);
  await setDoc(doc(db(), 'shareLinks', id), { label, active: true, createdAt: serverTimestamp() });
  return id;
}

export async function setShareLinkActive(id: string, active: boolean) {
  await updateDoc(doc(db(), 'shareLinks', id), { active });
}

export async function setCollaboratorActive(id: string, active: boolean) {
  await updateDoc(doc(db(), 'collaborators', id), { active });
}

export async function getCollaborator(uid: string) {
  const snap = await getDoc(doc(db(), 'collaborators', uid));
  return snap.exists() ? snap.data() : null;
}

export async function joinWithLink(uid: string, email: string, name: string, via: string) {
  await setDoc(doc(db(), 'collaborators', uid), { email, name, via, active: true, joinedAt: serverTimestamp() });
}
