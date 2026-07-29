import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';

// 60명 전 교사 전 기기(PC/스마트폰/태블릿) 100% 무새로고침 실시간 공유 클라우드 싱크 엔진
const DEFAULT_FIREBASE_DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://classroom-2026-default-rtdb.firebaseio.com';

const LOCAL_STORAGE_KEY_FIREBASE = 'classroom_firebase_config';
const LOCAL_STORAGE_KEY_RESERVATIONS = 'classroom_master_reservations_v7';
const LOCAL_STORAGE_KEY_HISTORY = 'classroom_master_history_v7';

export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FIREBASE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.databaseURL) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse saved firebase config', e);
  }
  return {
    databaseURL: DEFAULT_FIREBASE_DATABASE_URL,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || ''
  };
}

let firebaseApp = null;
let firebaseDb = null;

export function initFirebase(configOverride) {
  const cfg = configOverride || getSavedFirebaseConfig();
  if (!cfg || !cfg.databaseURL) return false;

  try {
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
    } else {
      firebaseApp = initializeApp({
        apiKey: cfg.apiKey || 'AIzaSyDemoKeyForClassroomRTDB2026',
        databaseURL: cfg.databaseURL,
        projectId: cfg.projectId || 'classroom-2026',
        authDomain: cfg.authDomain || ''
      });
    }
    firebaseDb = getDatabase(firebaseApp, cfg.databaseURL);
    return true;
  } catch (e) {
    console.error('Firebase initialization error:', e);
    return false;
  }
}

// 탭/창 간 로컬 동기화 채널
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('classroom_realtime_sync_v7');
}

// 1. 60명 전 교사 기기 무새로고침(Zero-F5) 100% 실시간 구독
export function subscribeToReservations(onUpdate) {
  let isSubscribed = true;

  // 로컬 저장소 데이터 초기 방출
  const initialLocal = getLocalReservations();
  onUpdate(initialLocal);

  const cfg = getSavedFirebaseConfig();
  if (!firebaseDb) {
    initFirebase(cfg);
  }

  let unsubFirebase = null;

  // 파이어베이스 RTDB 웹소켓 실시간 리스너 연결
  if (firebaseDb) {
    try {
      const reservationsRef = ref(firebaseDb, 'reservations');
      unsubFirebase = onValue(
        reservationsRef,
        (snapshot) => {
          if (!isSubscribed) return;
          const dataMap = snapshot.val();
          if (dataMap) {
            const currentLocal = getLocalReservations();
            const merged = { ...currentLocal, ...dataMap };
            localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(merged));
            onUpdate(merged);
          }
        },
        (err) => {
          console.warn('[Firebase RTDB Sync Note]:', err);
        }
      );
    } catch (e) {
      console.warn('Failed to listen to Firebase RTDB:', e);
    }
  }

  // 클라우드 REST 폴링 백업 (네트워크 차단 등 예외 대비)
  const fetchCloudReservationsREST = async () => {
    if (!isSubscribed) return;
    try {
      const rawUrl = (cfg.databaseURL || DEFAULT_FIREBASE_DATABASE_URL).replace(/\/$/, '');
      const res = await fetch(`${rawUrl}/reservations.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && isSubscribed) {
          const currentLocal = getLocalReservations();
          const merged = { ...currentLocal, ...data };
          localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(merged));
          onUpdate(merged);
        }
      }
    } catch (e) {
      // 오프라인 상태 유지
    }
  };

  fetchCloudReservationsREST();
  const pollInterval = setInterval(fetchCloudReservationsREST, 2000);

  // 동일 기기 멀티 탭/창 이벤트 브로드캐스트
  const notifyLocal = () => {
    const cached = getLocalReservations();
    onUpdate(cached);
  };

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
    isSubscribed = false;
    if (typeof unsubFirebase === 'function') unsubFirebase();
    clearInterval(pollInterval);
    window.removeEventListener('classroom_data_change', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
  };
}

// 2. 최근 변경 내역 (히스토리) 60명 전 교사 실시간 구독
export function subscribeToHistory(onUpdate) {
  let isSubscribed = true;

  const initialHistory = getLocalHistory();
  onUpdate(initialHistory);

  const cfg = getSavedFirebaseConfig();
  if (!firebaseDb) {
    initFirebase(cfg);
  }

  let unsubFirebase = null;

  if (firebaseDb) {
    try {
      const historyRef = ref(firebaseDb, 'history');
      unsubFirebase = onValue(
        historyRef,
        (snapshot) => {
          if (!isSubscribed) return;
          const dataObj = snapshot.val();
          if (dataObj) {
            const list = Array.isArray(dataObj)
              ? dataObj
              : Object.keys(dataObj).map((k) => ({ id: k, ...dataObj[k] }));
            const sorted = list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 200);
            localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(sorted));
            onUpdate(sorted);
          }
        },
        (err) => {
          console.warn('[Firebase History Sync Note]:', err);
        }
      );
    } catch (e) {
      console.warn('Failed to listen to Firebase History:', e);
    }
  }

  const fetchCloudHistoryREST = async () => {
    if (!isSubscribed) return;
    try {
      const rawUrl = (cfg.databaseURL || DEFAULT_FIREBASE_DATABASE_URL).replace(/\/$/, '');
      const res = await fetch(`${rawUrl}/history.json`);
      if (res.ok) {
        const dataObj = await res.json();
        if (dataObj && isSubscribed) {
          const list = Array.isArray(dataObj)
            ? dataObj
            : Object.keys(dataObj).map((k) => ({ id: k, ...dataObj[k] }));
          const sorted = list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 200);
          localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(sorted));
          onUpdate(sorted);
        }
      }
    } catch (e) {
      // 오프라인 무시
    }
  };

  fetchCloudHistoryREST();
  const pollInterval = setInterval(fetchCloudHistoryREST, 2000);

  const notifyLocal = () => {
    const cached = getLocalHistory();
    onUpdate(cached);
  };

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
    isSubscribed = false;
    if (typeof unsubFirebase === 'function') unsubFirebase();
    clearInterval(pollInterval);
    window.removeEventListener('classroom_data_change', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
  };
}

// 3. 파이어베이스 연동 실시간 상태 리스너
export function subscribeToConnectionStatus(onChange) {
  if (!firebaseDb) {
    initFirebase();
  }
  if (!firebaseDb) {
    onChange(false);
    return () => {};
  }
  try {
    const connectedRef = ref(firebaseDb, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      onChange(snap.val() === true);
    }, () => {
      onChange(false);
    });
    return unsub;
  } catch (e) {
    onChange(false);
    return () => {};
  }
}

// 4. 단일 예약 저장/수정/삭제 (전 기기 무새로고침 즉시 반영)
export async function saveReservation(roomId, dateStr, periodId, text, oldText = '') {
  const key = `${roomId}_${dateStr}_${periodId}`;
  const nowTs = Date.now();
  const trimmed = (text || '').trim();

  const logText = trimmed
    ? `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: '${trimmed}' 예약 등록됨`
    : `[${dateStr}] ${roomIdName(roomId)} ${periodIdName(periodId)}: 예약 삭제됨`;

  // 1. 기기 A 로컬 캐시 즉시 업데이트
  const currentReservations = getLocalReservations();
  const updatedCache = { ...currentReservations };

  const resItem = trimmed
    ? { roomId, date: dateStr, periodId, text: trimmed, updatedAt: nowTs }
    : null;

  if (trimmed) {
    updatedCache[key] = resItem;
  } else {
    delete updatedCache[key];
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_RESERVATIONS, JSON.stringify(updatedCache));

  const localHist = getLocalHistory();
  const newHistItem = {
    id: 'h_' + nowTs + '_' + Math.random().toString(36).substring(2, 8),
    action: trimmed ? (oldText ? 'UPDATE' : 'CREATE') : 'DELETE',
    roomId,
    date: dateStr,
    periodId,
    text: trimmed,
    logText,
    timestamp: nowTs
  };
  localHist.unshift(newHistItem);
  const updatedHistory = localHist.slice(0, 200);
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
    broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
  }
  window.dispatchEvent(new CustomEvent('classroom_data_change'));

  // 2. 클라우드 파이어베이스 원격 전송
  syncToCloud(key, resItem, updatedCache, newHistItem, updatedHistory);

  return updatedCache;
}

// 5. 다중/반복 예약 일괄 등록
export async function batchSaveReservations(reservationsArray, batchLogText) {
  if (!reservationsArray || reservationsArray.length === 0) return;
  const nowTs = Date.now();

  const currentReservations = getLocalReservations();
  const updatedCache = { ...currentReservations };

  reservationsArray.forEach((item) => {
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
  const newHistItem = {
    id: 'h_' + nowTs + '_' + Math.random().toString(36).substring(2, 8),
    action: 'BATCH_CREATE',
    count: reservationsArray.length,
    logText: batchLogText,
    timestamp: nowTs
  };
  localHist.unshift(newHistItem);
  const updatedHistory = localHist.slice(0, 200);
  localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'RESERVATIONS_UPDATED' });
    broadcastChannel.postMessage({ type: 'HISTORY_UPDATED' });
  }
  window.dispatchEvent(new CustomEvent('classroom_data_change'));

  syncToCloud(null, null, updatedCache, newHistItem, updatedHistory);

  return updatedCache;
}

// 파이어베이스 클라우드 동기화 Helper
async function syncToCloud(singleKey, singleResItem, fullReservationsMap, newHistItem, fullHistoryList) {
  const cfg = getSavedFirebaseConfig();
  if (!firebaseDb) {
    initFirebase(cfg);
  }

  // 1. Firebase RTDB SDK 푸시 (가장 빠름 & 실시간 푸시)
  if (firebaseDb) {
    try {
      if (singleKey !== null && singleKey !== undefined) {
        const itemRef = ref(firebaseDb, `reservations/${singleKey}`);
        if (singleResItem) {
          await set(itemRef, singleResItem);
        } else {
          await remove(itemRef);
        }
      } else if (fullReservationsMap) {
        const allRef = ref(firebaseDb, 'reservations');
        await set(allRef, fullReservationsMap);
      }

      if (newHistItem) {
        const histRef = ref(firebaseDb, `history/${newHistItem.id}`);
        await set(histRef, newHistItem);
      }
    } catch (e) {
      console.warn('[Firebase RTDB Write Warning]:', e);
    }
  }

  // 2. REST API PUT 백업
  try {
    const rawUrl = (cfg.databaseURL || DEFAULT_FIREBASE_DATABASE_URL).replace(/\/$/, '');
    if (singleKey && singleResItem) {
      await fetch(`${rawUrl}/reservations/${singleKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleResItem)
      });
    } else if (fullReservationsMap) {
      await fetch(`${rawUrl}/reservations.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullReservationsMap)
      });
    }

    if (newHistItem) {
      await fetch(`${rawUrl}/history/${newHistItem.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHistItem)
      });
    }
  } catch (e) {
    console.warn('[Firebase REST Sync Warning]:', e);
  }
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
  return !!firebaseDb;
}

