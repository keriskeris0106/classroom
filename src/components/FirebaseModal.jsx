import React, { useState } from 'react';
import { getSavedFirebaseConfig, initFirebase } from '../firebase';
import { Database, CheckCircle, Wifi, X, AlertCircle } from 'lucide-react';

export function FirebaseModal({ isOpen, onClose, isFirebaseConnected, onConnectionChange }) {
  const currentCfg = getSavedFirebaseConfig();

  const [apiKey, setApiKey] = useState(currentCfg.apiKey || '');
  const [databaseURL, setDatabaseURL] = useState(currentCfg.databaseURL || '');
  const [projectId, setProjectId] = useState(currentCfg.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentCfg.authDomain || '');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const newCfg = {
      apiKey: apiKey.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim()
    };
    localStorage.setItem('classroom_firebase_config', JSON.stringify(newCfg));
    const success = initFirebase(newCfg);
    onConnectionChange(success);
    if (success) {
      alert('🟢 파이어베이스 실시간 데이터베이스 연동 성공!');
    } else if (newCfg.databaseURL) {
      alert('⚠️ 파이어베이스 연동 실패: 입력하신 Database URL 및 API Key를 확인해주세요.');
    } else {
      alert('ℹ️ 파이어베이스 설정이 비어있어 로컬 실시간 시뮬레이션 모드로 작동합니다.');
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={22} color="var(--brand-indigo)" />
            <h3 className="modal-title">⚙️ Firebase 실시간 연동 설정</h3>
          </div>
          <button className="btn" style={{ border: 'none', padding: '0.2rem' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1rem', padding: '0.85rem', borderRadius: '8px', background: isFirebaseConnected ? '#f0fdf4' : '#fffbeb', border: `1px solid ${isFirebaseConnected ? '#bbf7d0' : '#fef08a'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', color: isFirebaseConnected ? '#166534' : '#854d0e' }}>
            {isFirebaseConnected ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>연동 상태: {isFirebaseConnected ? '파이어베이스 Realtime DB 연결됨 (모든 교사 실시간 동기화)' : '로컬 모드 (Firebase 키 미입력 상태)'}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Firebase Console에서 생성한 <code>databaseURL</code> 및 <code>apiKey</code>를 입력하시면 전 교사 PC/모바일 접속 시 100% 실시간 공유됩니다.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.25rem' }}>
              Database URL (필수)
            </label>
            <input
              type="text"
              className="date-picker-input"
              style={{ width: '100%' }}
              placeholder="https://your-project-id-default-rtdb.firebaseio.com"
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.25rem' }}>
              API Key (필수)
            </label>
            <input
              type="text"
              className="date-picker-input"
              style={{ width: '100%' }}
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                Project ID
              </label>
              <input
                type="text"
                className="date-picker-input"
                style={{ width: '100%' }}
                placeholder="your-project-id"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                Auth Domain
              </label>
              <input
                type="text"
                className="date-picker-input"
                style={{ width: '100%' }}
                placeholder="your-project-id.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn-primary">
              <Wifi size={16} />
              <span>연동 적용 및 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
