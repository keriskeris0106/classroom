import React from 'react';
import { SPECIAL_ROOMS, PERIODS, getKSTTodayString, WEEKDAYS_KO, SEMESTER_START_DATE, SEMESTER_END_DATE } from '../constants';
import { LayoutDashboard, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export function DashboardView({
  selectedDashboardDate,
  setSelectedDashboardDate,
  reservations,
  onSelectRoomAndDate
}) {
  const kstToday = getKSTTodayString();
  const currentDateStr = selectedDashboardDate || kstToday;

  const dateObj = new Date(currentDateStr);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const weekdayKo = WEEKDAYS_KO[dateObj.getDay()];

  // 이전일 이동
  const handlePrevDay = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() - 1);
    const prevStr = d.toISOString().split('T')[0];
    if (prevStr >= SEMESTER_START_DATE) {
      setSelectedDashboardDate(prevStr);
    }
  };

  // 다음일 이동
  const handleNextDay = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().split('T')[0];
    if (nextStr <= SEMESTER_END_DATE) {
      setSelectedDashboardDate(nextStr);
    }
  };

  // 오늘로 순간이동
  const handleGoToday = () => {
    setSelectedDashboardDate(kstToday);
  };

  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Header Banner & Date Navigation Controls */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--brand-indigo-light)', padding: '0.65rem', borderRadius: '10px', color: 'var(--brand-indigo)' }}>
            <LayoutDashboard size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              교내 특별실 현황 대시보드
              {currentDateStr === kstToday && (
                <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                  오늘 (TODAY)
                </span>
              )}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              📅 <strong>{year}년 {month}월 {day}일 ({weekdayKo}요일)</strong> 현황 — 교내 12개 전 특별실의 1~6교시 예약 상태
            </p>
          </div>
        </div>

        {/* Date Teleport Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button className="btn" onClick={handlePrevDay} title="이전일">
            <ChevronLeft size={16} />
            <span>이전일</span>
          </button>

          <input
            type="date"
            className="date-picker-input"
            min={SEMESTER_START_DATE}
            max={SEMESTER_END_DATE}
            value={currentDateStr}
            onChange={(e) => setSelectedDashboardDate(e.target.value)}
            style={{ fontWeight: '700', padding: '0.45rem 0.75rem' }}
          />

          <button className="btn" onClick={handleNextDay} title="다음일">
            <span>다음일</span>
            <ChevronRight size={16} />
          </button>

          <button
            className="btn"
            onClick={handleGoToday}
            style={{ fontWeight: '800', backgroundColor: '#eef2ff', borderColor: '#c7d2fe', color: '#4f46e5' }}
          >
            <CalendarIcon size={15} />
            <span>오늘로 순간이동</span>
          </button>
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
                  {/* Room Name Header */}
                  <td style={{ background: '#f8fafc', padding: '0.75rem', fontWeight: '700', textAlign: 'left' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                      onClick={() => onSelectRoomAndDate(room.id, currentDateStr)}
                      title="클릭 시 해당 특별실 달력으로 이동"
                    >
                      <span style={{ fontSize: '1.2rem' }}>{room.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--brand-indigo)' }}>{room.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '400' }}>{room.location}</div>
                      </div>
                    </div>
                  </td>

                  {/* Period Status Cells */}
                  {PERIODS.map(period => {
                    const key = `${room.id}_${currentDateStr}_${period.id}`;
                    const resItem = reservations[key];
                    const hasReservation = resItem && resItem.text && resItem.text.trim();

                    return (
                      <td
                        key={period.id}
                        className="reservation-cell"
                        onClick={() => onSelectRoomAndDate(room.id, currentDateStr)}
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
