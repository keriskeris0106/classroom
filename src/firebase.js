import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove, serverTimestamp } from 'firebase/database';

// 1. 파이어베이스 기본 / 로컬 스토리지 설정 로드
const LOCAL_STORAGE_KEY_FIREBASE = 'classroom_firebase_config';
const LOCAL_STORAGE_KEY_RESERVATIONS = 'classroom_local_reservations_v2';
const LOCAL_STORAGE_KEY_HISTORY = 'classroom_local_history_v2';

export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FIREBASE);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse saved firebase config', e);
  }
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

let dbInstance = null;
let currentApp = null;
let broadcastChannel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('classroom_realtime_sync');
}

export function initFirebase(config) {
  const cfg = config || getSavedFirebaseConfig();
  if (!cfg.databaseURL && !cfg.apiKey) {
    console.log('[Firebase] Config is empty. Operating in local simulated realtime mode.');
    dbInstance = null;
    return false;
  }
  try {
    if (getApps().length > 0) {
      // Clean up previous app if re-initializing
      deleteApp(getApps()[0]);
    }
    currentApp = initializeApp(cfg);
    dbInstance = getDatabase(currentApp);
    console.log('[Firebase] Realtime Database initialized successfully!');
    return true;
  } catch (err) {
    console.error('[Firebase] Initialization error:', err);
    dbInstance = null;
    return false;
  }
}

// 초기화 시도
initFirebase();

// 2. 예약 데이터 실시간 구독 (onValue)
export function subscribeToReservations(onUpdate) {
  if (dbInstance) {
    const resRef = ref(dbInstance, 'reservations');
    const unsubscribe = onValue(resRef, (snapshot) => {
      const val = snapshot.val() || {};
      onUpdate(val);
      // 로컬 스토리지 캐시 업데이트
      localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(val));
    }, (error) => {
      console.error('[Firebase] Read error:', error);
      // Fallback to local storage
      const cached = getLocalReservations();
      onUpdate(cached);
    });
    return unsubscribe;
  } else {
    // Firebase 미연동 시: 로컬 스토리지 + BroadcastChannel 연동
    const notifyLocal = () => {
      const cached = getLocalReservations();
      onUpdate(cached);
    };
    notifyLocal();

    const handleStorage = (e) => {
      if (e.key === LOCAL_STORAGE_KEY_RESERVATIONS) {
        notifyLocal();
      }
    };
    const handleBroadcast = (msg) => {
      if (msg.data && msg.data.type === 'RESERVATIONS_UPDATED') {
        notifyLocal();
      }
    };

    window.addEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
    };
  }
}

// 3. 최근 히스토리 내역 실시간 구독
export function subscribeToHistory(onUpdate) {
  if (dbInstance) {
    const histRef = ref(dbInstance, 'history');
    const unsubscribe = onValue(histRef, (snapshot) => {
      const val = snapshot.val() || {};
      const list = Object.keys(val).map(k => ({ id: k, ...val[k] })).sort((a, b) => b.timestamp - a.timestamp);
      onUpdate(list.slice(0, 50)); // 최근 50개
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

// 4. 단일 셀 예약 저장/수정
export async function saveReservation(roomId, dateStr, periodId, text, oldText = '') {
  const key = `${roomId}_${dateStr}_${periodId}`;
  const nowTs = Date.now();
  const logText = text 
    ? `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: '${text}' 예약됨`
    : `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: 예약 취소됨`;

  if (dbInstance) {
    if (text && text.trim()) {
      await set(ref(dbInstance, `reservations/${key}`), {
        roomId,
        date: dateStr,
        periodId,
        text: text.trim(),
        updatedAt: serverTimestamp()
      });
    } else {
      await remove(ref(dbInstance, `reservations/${key}`));
    }
    // Record history
    await push(ref(dbInstance, 'history'), {
      action: text ? (oldText ? 'UPDATE' : 'CREATE') : 'DELETE',
      roomId,
      date: dateStr,
      periodId,
      text: text.trim(),
      logText,
      timestamp: nowTs
    });
  } else {
    // Local storage fallback with instant cross-tab sync
    const current = getLocalReservations();
    if (text && text.trim()) {
      current[key] = { roomId, date: dateStr, periodId, text: text.trim(), updatedAt: nowTs };
    } else {
      delete current[key];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(current));

    const history = getLocalHistory();
    history.unshift({
      id: 'h_' + nowTs + '_' + Math.random().toString(36).substr(2, 5),
      action: text ? (oldText ? 'UPDATE' : 'CREATE') : 'DELETE',
      roomId,
      date: dateStr,
      periodId,
      text: text.trim(),
      logText,
      timestamp: nowTs
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 50)));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
      broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
    }
  }
}

// 5. 다중 / 반복 예약 일괄 등록 (Batch Save)
export async function batchSaveReservations(reservationsArray, batchLogText) {
  if (!reservationsArray || reservationsArray.length === 0) return;
  const nowTs = Date.now();

  if (dbInstance) {
    const updates = {};
    reservationsArray.forEach(item => {
      const key = `${item.roomId}_${item.date}_${item.periodId}`;
      updates[`reservations/${key}`] = {
        roomId: item.roomId,
        date: item.date,
        periodId: item.periodId,
        text: item.text.trim(),
        updatedAt: serverTimestamp()
      };
    });
    // Atomic multi-path updates
    for (const k in updates) {
      await set(ref(dbInstance, k), updates[k]);
    }
    await push(ref(dbInstance, 'history'), {
      action: 'BATCH_CREATE',
      count: reservationsArray.length,
      logText: batchLogText,
      timestamp: nowTs
    });
  } else {
    const current = getLocalReservations();
    reservationsArray.forEach(item => {
      const key = `${item.roomId}_${item.date}_${item.periodId}`;
      current[key] = {
        roomId: item.roomId,
        date: item.date,
        periodId: item.periodId,
        text: item.text.trim(),
        updatedAt: nowTs
      };
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(current));

    const history = getLocalHistory();
    history.unshift({
      id: 'h_' + nowTs + '_' + Math.random().toString(36).substr(2, 5),
      action: 'BATCH_CREATE',
      count: reservationsArray.length,
      logText: batchLogText,
      timestamp: nowTs
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 50)));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
      broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
    }
  }
}

// Local storage getter utilities
function getLocalReservations() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RESERVATIONS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Helper room/period display names for logs
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
