import React from 'react';
import { SPECIAL_ROOMS } from '../constants';
import { Calendar, LayoutDashboard, Printer, Repeat, Settings, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

export function Header({
  activeRoomId,
  setActiveRoomId,
  currentView,
  setCurrentView,
  onOpenRecurringModal,
  onOpenFirebaseModal,
  isFirebaseConnected
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="navbar no-print">
      {/* 1. Top Brand & Action Bar */}
      <div className="nav-top-bar">
        <div className="brand-section">
          <span className="brand-icon">🏫</span>
          <div>
            <h1 className="brand-title">
              교내 특별실 실시간 예약 시스템
              <span className="brand-subtitle">2026학년도 2학기 (26.8.17~27.1.8)</span>
            </h1>
          </div>
        </div>

        <div className="nav-actions">
          {/* Connection Status Badge */}
          <button
            onClick={onOpenFirebaseModal}
            className="btn"
            title="파이어베이스 실시간 데이터베이스 연결 상태 관리"
            style={{
              borderColor: isFirebaseConnected ? '#22c55e' : '#f59e0b',
              backgroundColor: isFirebaseConnected ? '#f0fdf4' : '#fffbeb',
              color: isFirebaseConnected ? '#15803d' : '#b45309'
            }}
          >
            {isFirebaseConnected ? (
              <>
                <Wifi size={16} />
                <span>파이어베이스 연동 중</span>
              </>
            ) : (
              <>
                <WifiOff size={16} />
                <span>로컬 연동 모드 (설정 클릭)</span>
              </>
            )}
          </button>

          {/* View Toggle Button */}
          <button
            className={`btn ${currentView === 'dashboard' ? 'btn-primary' : ''}`}
            onClick={() => setCurrentView(currentView === 'dashboard' ? 'calendar' : 'dashboard')}
          >
            {currentView === 'dashboard' ? (
              <>
                <Calendar size={16} />
                <span>달력 보기</span>
              </>
            ) : (
              <>
                <LayoutDashboard size={16} />
                <span>오늘의 특별실 현황</span>
              </>
            )}
          </button>

          {/* Recurring Reservation Button */}
          <button className="btn btn-warning" onClick={onOpenRecurringModal}>
            <Repeat size={16} />
            <span>반복 예약</span>
          </button>

          {/* Print View Button */}
          <button className="btn" onClick={handlePrint}>
            <Printer size={16} />
            <span>인쇄 모드</span>
          </button>

          {/* Firebase Config Modal Button */}
          <button className="btn" onClick={onOpenFirebaseModal}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* 2. Special Rooms 12 Tabs Slider */}
      {currentView === 'calendar' && (
        <nav className="rooms-tab-container">
          {SPECIAL_ROOMS.map((room) => (
            <button
              key={room.id}
              className={`room-tab-btn ${activeRoomId === room.id ? 'active' : ''}`}
              onClick={() => setActiveRoomId(room.id)}
            >
              <span>{room.icon}</span>
              <span>{room.name}</span>
              <span className="tab-badge-location">{room.location}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
