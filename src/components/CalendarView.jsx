import React, { useState } from 'react';
import { SPECIAL_ROOMS, PERIODS, getKSTTodayString, getWeekDaysMonToFri, SEMESTER_START_DATE, SEMESTER_END_DATE } from '../constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Check, Trash2, X, Plus } from 'lucide-react';

export function CalendarView({
  activeRoomId,
  setActiveRoomId,
  currentWeekDate,
  setCurrentWeekDate,
  reservations,
  onSaveReservation
}) {
  const [hoveredRow, setHoveredRow] = useState(null); // periodId
  const [hoveredCol, setHoveredCol] = useState(null); // dateStr 'YYYY-MM-DD'

  // Overwrite Confirmation Modal State (Exact 2 Buttons)
  const [overwriteTarget, setOverwriteTarget] = useState(null); // { roomId, dateStr, periodId, existingText }
  // Quick Free Text Edit Modal State
  const [editTarget, setEditTarget] = useState(null); // { roomId, dateStr, periodId, existingText }
  const [inputText, setInputText] = useState('');

  const kstToday = getKSTTodayString();
  const roomObj = SPECIAL_ROOMS.find(r => r.id === activeRoomId) || SPECIAL_ROOMS[0];

  // 지정된 날짜 기준 월~금 5개 평일 날짜 배열 구하기
  const weekDays = getWeekDaysMonToFri(currentWeekDate);
  const monDateStr = weekDays[0].dateStr;
  const friDateStr = weekDays[4].dateStr;

  // 주차 이동 (이전주 / 다음주)
  const handlePrevWeek = () => {
    const d = new Date(monDateStr);
    d.setDate(d.getDate() - 7);
    const prevStr = d.toISOString().split('T')[0];
    if (prevStr >= '2026-08-10') { // 2학기 준비 1주일 전까지 허용
      setCurrentWeekDate(prevStr);
    }
  };

  const handleNextWeek = () => {
    const d = new Date(monDateStr);
    d.setDate(d.getDate() + 7);
    const nextStr = d.toISOString().split('T')[0];
    if (nextStr <= '2027-01-15') {
      setCurrentWeekDate(nextStr);
    }
  };

  // 오늘 날짜로 자동 이동 버튼 클릭
  const handleGoToday = () => {
    setCurrentWeekDate(kstToday);
  };

  // 셀 클릭
  const handleCellClick = (dateStr, periodId) => {
    const key = `${activeRoomId}_${dateStr}_${periodId}`;
    const existing = reservations[key] ? reservations[key].text : '';

    if (existing && existing.trim()) {
      // 1. 이미 예약된 칸 -> 딱 2개 버튼 경고 팝업
      setOverwriteTarget({
        roomId: activeRoomId,
        dateStr,
        periodId,
        existingText: existing.trim()
      });
    } else {
      // 2. 빈 셀 -> 입력 팝업
      setEditTarget({
        roomId: activeRoomId,
        dateStr,
        periodId,
        existingText: ''
      });
      setInputText('');
    }
  };

  // 경고 팝업: "네, 변경하겠습니다"
  const handleConfirmOverwriteYes = () => {
    if (overwriteTarget) {
      setEditTarget({ ...overwriteTarget });
      setInputText(overwriteTarget.existingText);
      setOverwriteTarget(null);
    }
  };

  // 경고 팝업: "아니오, 변경하지 않겠습니다"
  const handleConfirmOverwriteNo = () => {
    setOverwriteTarget(null);
  };

  // 예약 저장
  const handleSave = (e) => {
    if (e) e.preventDefault();
    if (!editTarget) return;

    onSaveReservation(
      editTarget.roomId,
      editTarget.dateStr,
      editTarget.periodId,
      inputText,
      editTarget.existingText
    );
    setEditTarget(null);
    setInputText('');
  };

  // 예약 삭제
  const handleDelete = () => {
    if (!editTarget) return;
    onSaveReservation(
      editTarget.roomId,
      editTarget.dateStr,
      editTarget.periodId,
      '',
      editTarget.existingText
    );
    setEditTarget(null);
    setInputText('');
  };

  const periodObj = editTarget ? PERIODS.find(p => p.id === editTarget.periodId) : null;

  return (
    <section className="calendar-section" style={{ width: '100%' }}>
      {/* 1. Room Tab Selector & Navigation */}
      <div style={{ background: '#fafafa', borderBottom: '1px solid var(--border-color)', padding: '0.5rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {SPECIAL_ROOMS.map(room => (
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
        </div>
      </div>

      {/* 2. Weekly Navigation Bar & Today Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Active Room Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{roomObj.icon}</span>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
              [{roomObj.name}] 주차별 예약 달력
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {roomObj.location}</span>
          </div>
        </div>

        {/* Week Navigator Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn" onClick={handlePrevWeek} title="이전주">
            <ChevronLeft size={18} />
            <span>이전주</span>
          </button>

          <div style={{ fontSize: '1rem', fontWeight: '800', background: '#f1f5f9', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            📅 {monDateStr} (월) ~ {friDateStr} (금)
          </div>

          <button className="btn" onClick={handleNextWeek} title="다음주">
            <span>다음주</span>
            <ChevronRight size={18} />
          </button>

          {/* Today Button - Jump to Today */}
          <button
            className="btn"
            onClick={handleGoToday}
            style={{ fontWeight: '800', backgroundColor: '#eef2ff', borderColor: '#c7d2fe', color: '#4f46e5' }}
          >
            <CalendarIcon size={16} />
            <span>오늘 ({kstToday}) 이동</span>
          </button>
        </div>
      </div>

      {/* 3. High-Readability 5-Day Weekly Table */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="grid-table" style={{ tableLayout: 'fixed' }} onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}>
          <thead>
            <tr>
              <th className="period-header-th" style={{ width: '140px' }}>교시 \ 요일</th>
              {weekDays.map(dayObj => {
                const isToday = dayObj.dateStr === kstToday;
                return (
                  <th
                    key={dayObj.dateStr}
                    className={`date-header-th ${isToday ? 'today-column' : ''}`}
                    style={{ width: '20%', padding: '0.75rem 0.5rem' }}
                  >
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {dayObj.month}월
                      </span>
                      <br />
                      <span style={{ fontSize: '1.25rem', fontWeight: '900' }}>
                        {dayObj.dayNumber}일
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', marginLeft: '0.3rem', color: 'var(--brand-indigo)' }}>
                        ({dayObj.weekdayName})
                      </span>
                    </div>
                    {isToday && <span className="today-tag">TODAY</span>}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {PERIODS.map(period => {
              const isRowHovered = hoveredRow === period.id;

              return (
                <tr key={period.id}>
                  {/* Period Header */}
                  <td className="period-cell">
                    {period.name}
                    <span className="period-time-sub">{period.time}</span>
                  </td>

                  {/* 5 Mon-Fri Weekday Cells */}
                  {weekDays.map(dayObj => {
                    const key = `${activeRoomId}_${dayObj.dateStr}_${period.id}`;
                    const resItem = reservations[key];
                    const hasReservation = resItem && resItem.text && resItem.text.trim();

                    const isColHovered = hoveredCol === dayObj.dateStr;
                    const isTargetCell = isRowHovered && isColHovered;
                    const isToday = dayObj.dateStr === kstToday;

                    let cellClasses = 'reservation-cell';
                    if (isTargetCell) cellClasses += ' crosshair-target';
                    else if (isRowHovered) cellClasses += ' crosshair-row';
                    else if (isColHovered) cellClasses += ' crosshair-col';

                    if (isToday) cellClasses += ' today-column-cell';

                    return (
                      <td
                        key={dayObj.dateStr}
                        className={cellClasses}
                        style={{ height: '72px' }}
                        onMouseEnter={() => {
                          setHoveredRow(period.id);
                          setHoveredCol(dayObj.dateStr);
                        }}
                        onClick={() => handleCellClick(dayObj.dateStr, period.id)}
                      >
                        {hasReservation ? (
                          <div className="reservation-badge">
                            {resItem.text}
                          </div>
                        ) : (
                          <span className="add-placeholder-icon">+</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Overwrite Confirmation Modal (EXACT 2 BUTTONS) */}
      {overwriteTarget && (
        <div className="modal-overlay" onClick={handleConfirmOverwriteNo}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
                <AlertTriangle size={24} />
                <h3 className="modal-title">이미 예약된 시간입니다. 덮어쓰시겠습니까?</h3>
              </div>
            </div>

            <div className="warning-box">
              <span>⚠️ 기존 예약 내용:</span>
              <span style={{ fontWeight: '800', textDecoration: 'underline' }}>
                "{overwriteTarget.existingText}"
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              선택 일시: {overwriteTarget.dateStr} ({PERIODS.find(p => p.id === overwriteTarget.periodId)?.name})
            </p>

            <div className="exact-two-buttons">
              <button
                className="btn-modal-action btn-confirm-yes"
                onClick={handleConfirmOverwriteYes}
              >
                네, 변경하겠습니다
              </button>
              <button
                className="btn-modal-action btn-confirm-no"
                onClick={handleConfirmOverwriteNo}
              >
                아니오, 변경하지 않겠습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Text Input / Edit Modal */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editTarget.existingText ? '예약 내용 수정 / 삭제' : '신규 자유 텍스트 예약'}
              </h3>
              <button className="btn" style={{ border: 'none', padding: '0.2rem' }} onClick={() => setEditTarget(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                <div>📍 <strong>특별실:</strong> {roomObj.name} ({roomObj.location})</div>
                <div>📅 <strong>날짜:</strong> {editTarget.dateStr}</div>
                <div>⏰ <strong>교시:</strong> {periodObj?.name} ({periodObj?.time})</div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                  예약자 / 학년 / 수업 내용 입력:
                </label>
                <input
                  type="text"
                  autoFocus
                  className="date-picker-input"
                  style={{ width: '100%', fontSize: '1rem', padding: '0.65rem' }}
                  placeholder="예: 3학년, 3-6, 예술강사"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  * 자유롭게 입력할 수 있습니다. (드롭다운 없이 자유 텍스트 작성)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                {editTarget.existingText && (
                  <button
                    type="button"
                    className="btn"
                    style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}
                    onClick={handleDelete}
                  >
                    <Trash2 size={16} />
                    <span>예약 삭제</span>
                  </button>
                )}
                <button type="button" className="btn" onClick={() => setEditTarget(null)}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>저장하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
