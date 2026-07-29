import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove, serverTimestamp } from 'firebase/database';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, query, orderBy, limit } from 'firebase/firestore';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSy_CLASSROOM_DEFAULT_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'classroom.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://classroom-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'classroom',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'classroom.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:classroom'
};

const LOCAL_STORAGE_KEY_FIREBASE = 'classroom_firebase_config';
const LOCAL_STORAGE_KEY_RESERVATIONS = 'classroom_reservations_persistent_v4';
const LOCAL_STORAGE_KEY_HISTORY = 'classroom_history_persistent_v4';

export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FIREBASE);
    if (saved) return { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    console.error('Failed to parse saved firebase config', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

let currentApp = null;
let dbInstance = null;
let firestoreDb = null;
let broadcastChannel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('classroom_realtime_sync_v4');
}

export function initFirebase(config) {
  const cfg = config || getSavedFirebaseConfig();
  try {
    if (getApps().length > 0) {
      deleteApp(getApps()[0]);
    }
    currentApp = initializeApp(cfg);
    dbInstance = getDatabase(currentApp);
    firestoreDb = getFirestore(currentApp);
    return true;
  } catch (err) {
    console.error('[Firebase] Initialization error:', err);
    dbInstance = null;
    firestoreDb = null;
    return false;
  }
}

initFirebase();

// 1. 전 계정/전 기기 무새로고침(Zero-F5) 0.01초 실시간 구독
export function subscribeToReservations(onUpdate) {
  let unsubFirestore = null;
  let unsubRealtime = null;

  const emitUpdate = (val) => {
    onUpdate(val);
    localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(val));
  };

  // 1차: Firestore Realtime Stream
  if (firestoreDb) {
    try {
      unsubFirestore = onSnapshot(collection(firestoreDb, 'reservations'), (snapshot) => {
        const dataMap = {};
        snapshot.forEach(doc => {
          dataMap[doc.id] = doc.data();
        });
        if (Object.keys(dataMap).length > 0) {
          emitUpdate(dataMap);
        }
      }, (err) => {
        console.warn('[Firestore] Snapshot listener:', err.message);
      });
    } catch (e) {
      console.warn('[Firestore] Listener setup error:', e);
    }
  }

  // 2차: Realtime DB
  if (dbInstance) {
    try {
      const resRef = ref(dbInstance, 'reservations');
      unsubRealtime = onValue(resRef, (snapshot) => {
        const val = snapshot.val() || {};
        if (Object.keys(val).length > 0) {
          emitUpdate(val);
        }
      }, (err) => {
        console.warn('[Realtime DB] Listener:', err.message);
      });
    } catch (e) {
      console.warn('[Realtime DB] Listener setup error:', e);
    }
  }

  // 3차: 브라우저 내부 / 멀티 탭 / 멀티 창 즉시 이벤트 버스
  const notifyLocal = () => {
    const cached = getLocalReservations();
    onUpdate(cached);
  };
  notifyLocal();

  const handleCustomEvent = () => notifyLocal();
  const handleStorage = (e) => {
    if (e.key === LOCAL_STORAGE_KEY_RESERVATIONS) notifyLocal();
  };
  const handleBroadcast = (msg) => {
    if (msg.data && msg.data.type === 'RESERVATIONS_UPDATED') notifyLocal();
  };

  window.addEventListener('classroom_data_change', handleCustomEvent);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);

  return () => {
    if (typeof unsubFirestore === 'function') unsubFirestore();
    if (typeof unsubRealtime === 'function') unsubRealtime();
    window.removeEventListener('classroom_data_change', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
  };
}

// 2. 최근 변경 내역 (히스토리) 60명 전 교사 실시간 구독
export function subscribeToHistory(onUpdate) {
  let unsubFirestore = null;
  let unsubRealtime = null;

  const emitUpdate = (list) => {
    onUpdate(list);
    localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(list));
  };

  if (firestoreDb) {
    try {
      const q = query(collection(firestoreDb, 'history'), orderBy('timestamp', 'desc'), limit(150));
      unsubFirestore = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        emitUpdate(list);
      }, (err) => {
        console.warn('[Firestore History] Listener:', err.message);
      });
    } catch (e) {
      console.warn('[Firestore History] Setup error:', e);
    }
  }

  if (dbInstance) {
    try {
      const histRef = ref(dbInstance, 'history');
      unsubRealtime = onValue(histRef, (snapshot) => {
        const val = snapshot.val() || {};
        const list = Object.keys(val).map(k => ({ id: k, ...val[k] })).sort((a, b) => b.timestamp - a.timestamp);
        emitUpdate(list.slice(0, 150));
      });
    } catch (e) {
      console.warn('[Realtime History] Setup error:', e);
    }
  }

  const notifyLocal = () => {
    const cached = getLocalHistory();
    onUpdate(cached);
  };
  notifyLocal();

  const handleCustomEvent = () => notifyLocal();
  const handleStorage = (e) => {
    if (e.key === LOCAL_STORAGE_KEY_HISTORY) notifyLocal();
  };
  const handleBroadcast = (msg) => {
    if (msg.data && msg.data.type === 'HISTORY_UPDATED') notifyLocal();
  };

  window.addEventListener('classroom_data_change', handleCustomEvent);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);

  return () => {
    if (typeof unsubFirestore === 'function') unsubFirestore();
    if (typeof unsubRealtime === 'function') unsubRealtime();
    window.removeEventListener('classroom_data_change', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
  };
}

// 3. 단일 예약 저장 / 수정 / 삭제 (자동 삭제 절대 금지, 인위적 삭제만 허용)
export async function saveReservation(roomId, dateStr, periodId, text, oldText = '') {
  const key = `${roomId}_${dateStr}_${periodId}`;
  const nowTs = Date.now();
  const trimmed = (text || '').trim();

  const logText = trimmed 
    ? `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: '${trimmed}' 예약 등록/수정됨`
    : `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: 기존 예약 삭제됨`;

  // 1. 로컬 지속성 캐시 보장
  const localCache = getLocalReservations();
  if (trimmed) {
    localCache[key] = { roomId, date: dateStr, periodId, text: trimmed, updatedAt: nowTs };
  } else {
    delete localCache[key];
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(localCache));

  // 2. 히스토리 생성 (인위적 조작에 의해 삭제된 기록도 타임스탬프와 함께 표출)
  const localHist = getLocalHistory();
  localHist.unshift({
    id: 'h_' + nowTs + '_' + Math.random().toString(36).substr(2, 6),
    action: trimmed ? (oldText ? 'UPDATE' : 'CREATE') : 'DELETE',
    roomId,
    date: dateStr,
    periodId,
    text: trimmed,
    logText,
    timestamp: nowTs
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(localHist.slice(0, 150)));

  // Broadcast & Dispatch Custom Event
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
    broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
  }
  window.dispatchEvent(new CustomEvent('classroom_data_change'));

  // 3. Firestore 원격 동기화
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, 'reservations', key);
      if (trimmed) {
        await setDoc(docRef, { roomId, date: dateStr, periodId, text: trimmed, updatedAt: nowTs });
      } else {
        await deleteDoc(docRef);
      }
      await addDoc(collection(firestoreDb, 'history'), {
        action: trimmed ? (oldText ? 'UPDATE' : 'CREATE') : 'DELETE',
        roomId,
        date: dateStr,
        periodId,
        text: trimmed,
        logText,
        timestamp: nowTs
      });
    } catch (e) {
      console.warn('[Firestore Write Warning]:', e.message);
    }
  }

  // 4. Realtime DB 원격 동기화
  if (dbInstance) {
    try {
      if (trimmed) {
        await set(ref(dbInstance, `reservations/${key}`), { roomId, date: dateStr, periodId, text: trimmed, updatedAt: serverTimestamp() });
      } else {
        await remove(ref(dbInstance, `reservations/${key}`));
      }
      await push(ref(dbInstance, 'history'), {
        action: trimmed ? (oldText ? 'UPDATE' : 'CREATE') : 'DELETE',
        roomId,
        date: dateStr,
        periodId,
        text: trimmed,
        logText,
        timestamp: nowTs
      });
    } catch (e) {
      console.warn('[Realtime DB Write Warning]:', e.message);
    }
  }

  return localCache;
}

// 4. 다중 / 반복 예약 일괄 등록
export async function batchSaveReservations(reservationsArray, batchLogText) {
  if (!reservationsArray || reservationsArray.length === 0) return;
  const nowTs = Date.now();

  const localCache = getLocalReservations();
  reservationsArray.forEach(item => {
    const key = `${item.roomId}_${item.date}_${item.periodId}`;
    localCache[key] = {
      roomId: item.roomId,
      date: item.date,
      periodId: item.periodId,
      text: item.text.trim(),
      updatedAt: nowTs
    };
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(localCache));

  const localHist = getLocalHistory();
  localHist.unshift({
    id: 'h_' + nowTs + '_' + Math.random().toString(36).substr(2, 6),
    action: 'BATCH_CREATE',
    count: reservationsArray.length,
    logText: batchLogText,
    timestamp: nowTs
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(localHist.slice(0, 150)));

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
    broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
  }
  window.dispatchEvent(new CustomEvent('classroom_data_change'));

  if (firestoreDb) {
    try {
      for (const item of reservationsArray) {
        const key = `${item.roomId}_${item.date}_${item.periodId}`;
        await setDoc(doc(firestoreDb, 'reservations', key), {
          roomId: item.roomId,
          date: item.date,
          periodId: item.periodId,
          text: item.text.trim(),
          updatedAt: nowTs
        });
      }
      await addDoc(collection(firestoreDb, 'history'), {
        action: 'BATCH_CREATE',
        count: reservationsArray.length,
        logText: batchLogText,
        timestamp: nowTs
      });
    } catch (e) {
      console.warn('[Firestore Batch Warning]:', e.message);
    }
  }

  if (dbInstance) {
    try {
      for (const item of reservationsArray) {
        const key = `${item.roomId}_${item.date}_${item.periodId}`;
        await set(ref(dbInstance, `reservations/${key}`), {
          roomId: item.roomId,
          date: item.date,
          periodId: item.periodId,
          text: item.text.trim(),
          updatedAt: serverTimestamp()
        });
      }
      await push(ref(dbInstance, 'history'), {
        action: 'BATCH_CREATE',
        count: reservationsArray.length,
        logText: batchLogText,
        timestamp: nowTs
      });
    } catch (e) {
      console.warn('[Realtime DB Batch Warning]:', e.message);
    }
  }

  return localCache;
}

export function getLocalReservations() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RESERVATIONS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function roomIdName(id) {
  const map = {
    audiovisual: '시청각실', practical: '실과실', ai: 'AI실', com1: '컴퓨터실1', com2: '컴퓨터실2',
    arts1: '예체능실1', arts2: '예체능실2', playground: '운동장', subject3: '교과전용실3',
    art2: '미술실2', music: '음악실', art1: '미술실1'
  };
  return map[id] || id;
}

function periodIdName(pid) {
  const map = {
    p1: '1교시', p2: '2교시', p3: '3교시', p4: '4교시',
    p5_34: '12:20(3,4학년)', p5_56: '13:00(5,6학년)', p6: '6교시'
  };
  return map[pid] || pid;
}

export function isFirebaseConnected() {
  return firestoreDb !== null || dbInstance !== null;
}
