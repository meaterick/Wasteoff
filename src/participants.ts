import { openDB, type DBSchema } from 'idb';
import { newStore, updateStore, type Action, type Store } from './model';

type Participant = {
  id: string;
  name: string;
  salt: Uint8Array;
  verifier: Uint8Array;
  session: string | null;
  store: Store;
};

interface LocalAccounts extends DBSchema {
  participants: { key: string; value: Participant };
}

export type SignIn = { id: string; name: string; store: Store };

const sessionKey = 'wasteoff-session';
const encoder = new TextEncoder();
let connection: ReturnType<typeof openDB<LocalAccounts>> | undefined;

function database() {
  connection ??= openDB<LocalAccounts>('wasteoff-accounts', 1, {
    upgrade(db) { db.createObjectStore('participants', { keyPath: 'id' }); },
  });
  return connection;
}

function getSession(): { id: string; token: string } | undefined {
  const saved = sessionStorage.getItem(sessionKey);
  if (!saved) return undefined;
  try {
    const { id, token } = JSON.parse(saved);
    if (typeof id === 'string' && typeof token === 'string') return { id, token };
  } catch {
    sessionStorage.removeItem(sessionKey);
  }
}

async function verifyPassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}

const signInView = ({ id, name, store }: Participant): SignIn => ({ id, name, store });

function remember(participant: Participant) {
  sessionStorage.setItem(sessionKey, JSON.stringify({ id: participant.id, token: participant.session }));
  return signInView(participant);
}

export async function restoreSignIn() {
  const session = getSession();
  if (!session) return undefined;
  const participant = await (await database()).get('participants', session.id);
  if (participant?.session === session.token) return signInView(participant);
  sessionStorage.removeItem(sessionKey);
}

export async function signIn(nameInput: string, password: string, create: boolean) {
  const name = nameInput.normalize('NFKC').trim();
  if (!/^[\p{L}\p{N}_-]{2,20}$/u.test(name)) {
    throw new Error('참가자 이름은 글자, 숫자, 밑줄, 붙임표로 2~20자 입력해 주세요.');
  }
  if (password.length < 8 || password.length > 128) throw new Error('비밀번호는 8~128자로 입력해 주세요.');
  const id = name.toLowerCase();
  const db = await database();
  const session = crypto.randomUUID();
  if (create) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const verifier = await verifyPassword(password, salt);
    const participant: Participant = { id, name, salt, verifier, session, store: newStore('typical') };
    try {
      await db.add('participants', participant);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'ConstraintError') {
        throw new Error('이미 사용 중인 참가자 이름이에요. 로그인하거나 다른 이름을 입력해 주세요.');
      }
      throw error;
    }
    return remember(participant);
  }

  const participant = await db.get('participants', id);
  if (!participant) throw new Error('이름과 비밀번호를 확인해 주세요.');
  const verifier = await verifyPassword(password, participant.salt);
  const difference = participant.verifier.reduce((sum, byte, index) => sum | (byte ^ verifier[index]), 0);
  if (difference !== 0) throw new Error('이름과 비밀번호를 확인해 주세요.');

  // Retain any order placed while password verification was running.
  const transaction = db.transaction('participants', 'readwrite');
  const current = (await transaction.store.get(id))!;
  const signedIn = { ...current, session };
  await transaction.store.put(signedIn);
  await transaction.done;
  return remember(signedIn);
}

export async function applyParticipantAction(action: Action) {
  const session = getSession();
  if (!session) return undefined;
  const db = await database();
  const transaction = db.transaction('participants', 'readwrite');
  const participant = await transaction.store.get(session.id);
  if (participant?.session !== session.token) {
    await transaction.done;
    sessionStorage.removeItem(sessionKey);
    return undefined;
  }
  const store = updateStore(participant.store, action);
  if (store !== participant.store) await transaction.store.put({ ...participant, store });
  await transaction.done;
  return { account: { ...signInView(participant), store }, changed: store !== participant.store };
}

export async function signOut() {
  const session = getSession();
  sessionStorage.removeItem(sessionKey);
  if (!session) return;
  const db = await database();
  const transaction = db.transaction('participants', 'readwrite');
  const current = await transaction.store.get(session.id);
  if (current?.session === session.token) await transaction.store.put({ ...current, session: null });
  await transaction.done;
}
