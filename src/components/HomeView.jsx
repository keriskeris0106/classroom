import React from 'react';
import { SPECIAL_ROOMS } from '../constants';
import { Calendar, LayoutDashboard, Repeat, History, ArrowRight } from 'lucide-react';

export function HomeView({ onSelectRoom, onNavigateTab, onOpenRecurringModal }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* 1. Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
        color: 'white',
        padding: '2rem 2.5rem',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(79, 70, 229, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between'
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', background: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', display: 'inline-block', marginBottom: '0.75rem' }}>
            ✨ 2026학년도 2학기 전용 (2026.08.17 ~ 2027.01.08)
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            교내 특별실 실시간 예약 시스템 홈
          </h2>
          <p style={{ fontSize: '1rem', opacity: 0.9, maxWidth: '650px', lineHeight: 1.6 }}>
            별도의 로그인 없이 원하는 특별실을 즉시 예약 및 수정할 수 있습니다.<br />
            주차별 월~금 5일간의 예약 현황을 한눈에 파악하고 실시간으로 공유하세요.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '220px' }}>
          <button
            className="btn btn-warning"
            style={{ padding: '0.85rem 1.25rem', fontSize: '1rem', fontWeight: '800', justifyContent: 'center' }}
            onClick={() => onNavigateTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>오늘의 현황 보기</span>
          </button>

          <button
            className="btn"
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.925rem', fontWeight: '700', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            onClick={onOpenRecurringModal}
          >
            <Repeat size={18} />
            <span>디테일 반복 예약</span>
          </button>
        </div>
      </div>

      {/* 2. Special Rooms Grid (12 Rooms) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏫 특별실 선택 (총 {SPECIAL_ROOMS.length}개 공간)</span>
          </h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            원하시는 특별실 카드를 클릭하면 바로 예약 달력으로 이동합니다.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {SPECIAL_ROOMS.map(room => (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'var(--brand-indigo)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.02)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '2.2rem', background: '#f8fafc', padding: '0.4rem', borderRadius: '10px' }}>
                  {room.icon}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--brand-indigo)', background: '#eef2ff', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: '700' }}>
                  📍 {room.location}
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  {room.name}
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  월~금 주차별 예약 현황 확인 및 신청
                </p>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: '700', color: 'var(--brand-indigo)' }}>
                <span>📅 예약 달력 열기</span>
                <ArrowRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
