import React from 'react';
import { SPECIAL_ROOMS, PERIODS, getKSTTodayString, WEEKDAYS_KO } from '../constants';
import { LayoutDashboard, CheckCircle, Clock } from 'lucide-react';

export function DashboardView({ reservations, onSaveReservation, onSelectRoomAndDate }) {
  const kstToday = getKSTTodayString();
  const dateObj = new Date();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const weekdayKo = WEEKDAYS_KO[dateObj.getDay()];

  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Header Banner */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--brand-indigo-light)', padding: '0.6rem', borderRadius: '10px', color: 'var(--brand-indigo)' }}>
            <LayoutDashboard size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              오늘의 특별실 현황 대시보드
              <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                KST 기준
              </span>
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              📅 <strong>{kstToday} ({weekdayKo}요일)</strong> — 교내 모든 12개 특별실의 하루 예약 현황을 한눈에 파악합니다.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--reservation-bg)', border: '1px solid var(--reservation-border)', borderRadius: '3px' }}></span>
            <span>예약됨</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '3px' }}></span>
            <span>사용 가능</span>
          </div>
        </div>
      </div>

      {/* Dashboard Matrix Table */}
      <div className="calendar-section" style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th style={{ width: '160px', padding: '0.85rem 0.5rem', background: '#f1f5f9', fontSize: '0.9rem', fontWeight: '800' }}>
                  특별실 \ 교시
                </th>
                {PERIODS.map(period => (
                  <th key={period.id} style={{ padding: '0.75rem 0.5rem', background: '#f8fafc', fontSize: '0.85rem', fontWeight: '700' }}>
                    {period.name}
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '400', color: 'var(--text-muted)' }}>
                      {period.time}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {SPECIAL_ROOMS.map(room => (
                <tr key={room.id}>
                  {/* Room Header Cell */}
                  <td style={{ background: '#f8fafc', padding: '0.75rem', fontWeight: '700', textAlign: 'left' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                      onClick={() => onSelectRoomAndDate(room.id, kstToday)}
                      title="클릭 시 해당 특별실 달력으로 이동"
                    >
                      <span style={{ fontSize: '1.2rem' }}>{room.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--brand-indigo)' }}>{room.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '400' }}>{room.location}</div>
                      </div>
                    </div>
                  </td>

                  {/* Period Status Cells for Today */}
                  {PERIODS.map(period => {
                    const key = `${room.id}_${kstToday}_${period.id}`;
                    const resItem = reservations[key];
                    const hasReservation = resItem && resItem.text && resItem.text.trim();

                    return (
                      <td
                        key={period.id}
                        className="reservation-cell"
                        onClick={() => onSelectRoomAndDate(room.id, kstToday)}
                        style={{ height: '60px' }}
                      >
                        {hasReservation ? (
                          <div className="reservation-badge">
                            {resItem.text}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            -
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
