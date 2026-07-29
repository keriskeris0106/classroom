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
const LOCAL_STORAGE_KEY_RESERVATIONS = 'classroom_master_reservations_v5';
const LOCAL_STORAGE_KEY_HISTORY = 'classroom_master_history_v5';

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
  broadcastChannel = new BroadcastChannel('classroom_realtime_sync_v5');
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

// 1. 전 브라우저/전 기기 무새로고침(Zero-F5) 실시간 구독
export function subscribeToReservations(onUpdate) {
  let unsubFirestore = null;
  let unsubRealtime = null;

  const emitUpdate = (remoteData) => {
    if (!remoteData) return;
    const currentLocal = getLocalReservations();
    // 기존 로컬 데이터와 원격 데이터를 병합하여 절대로 다른 날짜의 예약이 지워지지 않도록 보장
    const merged = { ...currentLocal, ...remoteData };
    onUpdate(merged);
    localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(merged));
  };

  // Firestore Realtime Stream
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

  // Realtime DB
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

  // 로컬 탭/창 간 실시간 동기화
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

  // 주기적 동기화 폴링 (1000ms) - F5 필요없이 타 브라우저 입력 즉시 반영
  const pollInterval = setInterval(() => {
    notifyLocal();
  }, 1000);

  window.addEventListener('classroom_data_change', handleCustomEvent);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);

  return () => {
    clearInterval(pollInterval);
    if (typeof unsubFirestore === 'function') unsubFirestore();
    if (typeof unsubRealtime === 'function') unsubRealtime();
    window.removeEventListener('classroom_data_change', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
  };
}

// 2. 히스토리 실시간 구독
export function subscribeToHistory(onUpdate) {
  let unsubFirestore = null;
  let unsubRealtime = null;

  const emitUpdate = (list) => {
    if (!list || list.length === 0) return;
    onUpdate(list);
    localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(list));
  };

  if (firestoreDb) {
    try {
      const q = query(collection(firestoreDb, 'history'), orderBy('timestamp', 'desc'), limit(200));
      unsubFirestore = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) emitUpdate(list);
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
        if (list.length > 0) emitUpdate(list.slice(0, 200));
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

  const pollInterval = setInterval(() => {
    notifyLocal();
  }, 1000);

  window.addEventListener('classroom_data_change', handleCustomEvent);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);

  return () => {
    clearInterval(pollInterval);
    if (typeof unsubFirestore === 'function') unsubFirestore();
    if (typeof unsubRealtime === 'function') unsubRealtime();
    window.removeEventListener('classroom_data_change', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
  };
}

// 3. 단일 예약 저장/수정/삭제 (기존 다른 일정을 절대로 삭제하지 않고 병합!)
export async function saveReservation(roomId, dateStr, periodId, text, oldText = '') {
  const key = `${roomId}_${dateStr}_${periodId}`;
  const nowTs = Date.now();
  const trimmed = (text || '').trim();

  const logText = trimmed 
    ? `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: '${trimmed}' 예약 등록됨`
    : `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: 예약 삭제됨`;

  // 1. 기존 로컬 데이터를 읽어 해당 키만 변경 (다른 일정 삭제 절대 방지)
  const currentReservations = getLocalReservations();
  const updatedCache = { ...currentReservations };

  if (trimmed) {
    updatedCache[key] = { roomId, date: dateStr, periodId, text: trimmed, updatedAt: nowTs };
  } else {
    delete updatedCache[key];
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(updatedCache));

  // 2. 히스토리 기록
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
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(localHist.slice(0, 200)));

  // 이벤트 발생
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
      console.warn('[Firestore Write]:', e.message);
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
      console.warn('[Realtime DB Write]:', e.message);
    }
  }

  return updatedCache;
}

// 4. 다중/반복 예약 일괄 등록 (기존 다른 일정을 절대로 덮어쓰지 않고 추가 병합!)
export async function batchSaveReservations(reservationsArray, batchLogText) {
  if (!reservationsArray || reservationsArray.length === 0) return;
  const nowTs = Date.now();

  const currentReservations = getLocalReservations();
  const updatedCache = { ...currentReservations };

  reservationsArray.forEach(item => {
    const key = `${item.roomId}_${item.date}_${item.periodId}`;
    updatedCache[key] = {
      roomId: item.roomId,
      date: item.date,
      periodId: item.periodId,
      text: item.text.trim(),
      updatedAt: nowTs
    };
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(updatedCache));

  const localHist = getLocalHistory();
  localHist.unshift({
    id: 'h_' + nowTs + '_' + Math.random().toString(36).substr(2, 6),
    action: 'BATCH_CREATE',
    count: reservationsArray.length,
    logText: batchLogText,
    timestamp: nowTs
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(localHist.slice(0, 200)));

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
      console.warn('[Firestore Batch]:', e.message);
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
      console.warn('[Realtime DB Batch]:', e.message);
    }
  }

  return updatedCache;
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
