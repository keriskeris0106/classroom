import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove, serverTimestamp } from 'firebase/database';

// 파이어베이스 프로젝트 'classroom' 기본 자동 연동 설정
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
const LOCAL_STORAGE_KEY_RESERVATIONS = 'classroom_local_reservations_v2';
const LOCAL_STORAGE_KEY_HISTORY = 'classroom_local_history_v2';

export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FIREBASE);
    if (saved) return { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    console.error('Failed to parse saved firebase config', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

let dbInstance = null;
let currentApp = null;
let broadcastChannel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('classroom_realtime_sync');
}

export function initFirebase(config) {
  const cfg = config || getSavedFirebaseConfig();
  if (!cfg.databaseURL || !cfg.apiKey) {
    console.log('[Firebase] Operating in local simulated realtime mode.');
    dbInstance = null;
    return false;
  }
  try {
    if (getApps().length > 0) {
      deleteApp(getApps()[0]);
    }
    currentApp = initializeApp(cfg);
    dbInstance = getDatabase(currentApp);
    console.log('[Firebase] Realtime Database initialized for classroom!');
    return true;
  } catch (err) {
    console.error('[Firebase] Initialization error:', err);
    dbInstance = null;
    return false;
  }
}

// 자동 연동 시도
initFirebase();

// 1. 예약 데이터 실시간 구독 (onValue)
export function subscribeToReservations(onUpdate) {
  if (dbInstance) {
    const resRef = ref(dbInstance, 'reservations');
    const unsubscribe = onValue(resRef, (snapshot) => {
      const val = snapshot.val() || {};
      onUpdate(val);
      localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(val));
    }, (error) => {
      console.warn('[Firebase] Network sync note:', error.message);
      const cached = getLocalReservations();
      onUpdate(cached);
    });
    return unsubscribe;
  } else {
    const notifyLocal = () => {
      const cached = getLocalReservations();
      onUpdate(cached);
    };
    notifyLocal();

    const handleStorage = (e) => {
      if (e.key === LOCAL_STORAGE_KEY_RESERVATIONS) notifyLocal();
    };
    const handleBroadcast = (msg) => {
      if (msg.data && msg.data.type === 'RESERVATIONS_UPDATED') notifyLocal();
    };

    window.addEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
    };
  }
}

// 2. 히스토리 실시간 구독
export function subscribeToHistory(onUpdate) {
  if (dbInstance) {
    const histRef = ref(dbInstance, 'history');
    const unsubscribe = onValue(histRef, (snapshot) => {
      const val = snapshot.val() || {};
      const list = Object.keys(val).map(k => ({ id: k, ...val[k] })).sort((a, b) => b.timestamp - a.timestamp);
      onUpdate(list.slice(0, 100));
      localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(list));
    });
    return unsubscribe;
  } else {
    const notifyLocal = () => {
      const cached = getLocalHistory();
      onUpdate(cached);
    };
    notifyLocal();

    const handleStorage = (e) => {
      if (e.key === LOCAL_STORAGE_KEY_HISTORY) notifyLocal();
    };
    const handleBroadcast = (msg) => {
      if (msg.data && msg.data.type === 'HISTORY_UPDATED') notifyLocal();
    };

    window.addEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
    };
  }
}

// 3. 단일 예약 저장/수정/삭제
export async function saveReservation(roomId, dateStr, periodId, text, oldText = '') {
  const key = `${roomId}_${dateStr}_${periodId}`;
  const nowTs = Date.now();
  const trimmed = (text || '').trim();

  const logText = trimmed 
    ? `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: '${trimmed}' 예약됨`
    : `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: 예약 취소됨`;

  // Always update local storage cache immediately for instant UI feedback
  const localCache = getLocalReservations();
  if (trimmed) {
    localCache[key] = { roomId, date: dateStr, periodId, text: trimmed, updatedAt: nowTs };
  } else {
    delete localCache[key];
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(localCache));

  const localHist = getLocalHistory();
  localHist.unshift({
    id: 'h_' + nowTs + '_' + Math.random().toString(36).substr(2, 5),
    action: trimmed ? (oldText ? 'UPDATE' : 'CREATE') : 'DELETE',
    roomId,
    date: dateStr,
    periodId,
    text: trimmed,
    logText,
    timestamp: nowTs
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(localHist.slice(0, 100)));

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
    broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
  }

  // Sync to Firebase if connected
  if (dbInstance) {
    try {
      if (trimmed) {
        await set(ref(dbInstance, `reservations/${key}`), {
          roomId,
          date: dateStr,
          periodId,
          text: trimmed,
          updatedAt: serverTimestamp()
        });
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
      console.error('[Firebase] Save error:', e);
    }
  }

  return localCache;
}

// 4. 반복/다중 예약 저장
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
    id: 'h_' + nowTs + '_' + Math.random().toString(36).substr(2, 5),
    action: 'BATCH_CREATE',
    count: reservationsArray.length,
    logText: batchLogText,
    timestamp: nowTs
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(localHist.slice(0, 100)));

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
    broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
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
      console.error('[Firebase] Batch save error:', e);
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
  return dbInstance !== null;
}
