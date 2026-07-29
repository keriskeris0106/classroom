import React from 'react';
import { Home, Calendar, LayoutDashboard, History, Repeat, Printer, Database, CheckCircle, WifiOff } from 'lucide-react';

export function Header({
  currentTab,
  setCurrentTab,
  onOpenRecurringModal,
  onOpenFirebaseModal,
  isFirebaseConnected
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="navbar no-print">
      <div className="nav-top-bar" style={{ padding: '0.6rem 1.5rem' }}>
        {/* Brand Logo & Title */}
        <div
          className="brand-section"
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentTab('home')}
        >
          <span className="brand-icon">🏫</span>
          <div>
            <h1 className="brand-title" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
              교내 특별실 실시간 예약 시스템
              <span className="brand-subtitle">2026학년도 2학기 (26.8.17~27.1.8)</span>
            </h1>
          </div>
        </div>

        {/* 4 Sleek Top-level Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
          <button
            className={`btn ${currentTab === 'home' ? 'btn-primary' : ''}`}
            onClick={() => setCurrentTab('home')}
            style={{ border: 'none', padding: '0.45rem 0.85rem' }}
          >
            <Home size={16} />
            <span>🏠 홈</span>
          </button>

          <button
            className={`btn ${currentTab === 'reservation' ? 'btn-primary' : ''}`}
            onClick={() => setCurrentTab('reservation')}
            style={{ border: 'none', padding: '0.45rem 0.85rem' }}
          >
            <Calendar size={16} />
            <span>📅 특별실 예약</span>
          </button>

          <button
            className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
            style={{ border: 'none', padding: '0.45rem 0.85rem' }}
          >
            <LayoutDashboard size={16} />
            <span>📊 오늘의 현황</span>
          </button>

          <button
            className={`btn ${currentTab === 'history' ? 'btn-primary' : ''}`}
            onClick={() => setCurrentTab('history')}
            style={{ border: 'none', padding: '0.45rem 0.85rem' }}
          >
            <History size={16} />
            <span>📜 변경 내역</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="nav-actions">
          {/* Firebase Connection Status Button */}
          <button
            className="btn"
            onClick={onOpenFirebaseModal}
            style={{
              backgroundColor: isFirebaseConnected ? '#f0fdf4' : '#fffbeb',
              borderColor: isFirebaseConnected ? '#86efac' : '#fde047',
              color: isFirebaseConnected ? '#15803d' : '#a16207',
              fontWeight: '700',
              fontSize: '0.825rem',
              padding: '0.45rem 0.75rem'
            }}
            title="파이어베이스 클라우드 동기화 설정"
          >
            {isFirebaseConnected ? <CheckCircle size={15} color="#16a34a" /> : <WifiOff size={15} color="#d97706" />}
            <span>{isFirebaseConnected ? '파이어베이스 연동됨' : 'DB 설정'}</span>
          </button>

          {/* Recurring Reservation Button */}
          <button className="btn btn-warning" onClick={onOpenRecurringModal}>
            <Repeat size={15} />
            <span>반복 예약</span>
          </button>

          {/* Print Button */}
          <button className="btn" onClick={handlePrint}>
            <Printer size={15} />
            <span>인쇄</span>
          </button>
        </div>
      </div>
    </header>
  );
}

