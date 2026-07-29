import React from 'react';
import { SPECIAL_ROOMS } from '../constants';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HomeView({ onSelectRoom }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Sleek Subtitle Header */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: '#eef2ff', padding: '0.5rem', borderRadius: '10px', color: '#4f46e5' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              특별실 예약 선택 (총 {SPECIAL_ROOMS.length}개 공간)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              예약을 원하시는 교내 특별실 카드를 클릭하면 바로 달력으로 이동합니다.
            </p>
          </div>
        </div>

        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4f46e5', background: '#eef2ff', padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
          2026학년도 2학기 (26.8.17 ~ 27.1.8)
        </span>
      </div>

      {/* 12 Special Rooms Cards Grid */}
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
                달력 보기 및 자유 텍스트 예약
              </p>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: '700', color: 'var(--brand-indigo)' }}>
              <span>📅 달력 이동하기</span>
              <ArrowRight size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
