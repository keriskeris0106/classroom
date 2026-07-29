import React, { useState } from 'react';
import { SPECIAL_ROOMS, PERIODS, getKSTTodayString, getWeekDaysMonToFri, getMonthWeekdays, SEMESTER_START_DATE, SEMESTER_END_DATE, MONTHS } from '../constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Check, Trash2, X, Search, Layers, Grid } from 'lucide-react';

export function CalendarView({
  activeRoomId,
  setActiveRoomId,
  currentWeekDate,
  setCurrentWeekDate,
  reservations,
  onSaveReservation
}) {
  // Calendar View Mode: 'month' (한 달 전체 보기) vs 'week' (주차별 보기)
  const [viewMode, setViewMode] = useState('month');

  // Month View State (기본 2026년 8월 즉시 로딩)
  const initialDateObj = new Date(currentWeekDate || '2026-08-17');
  const [selectedYear, setSelectedYear] = useState(initialDateObj.getFullYear() || 2026);
  const [selectedMonth, setSelectedMonth] = useState(initialDateObj.getMonth() + 1 || 8);

  const [hoveredRow, setHoveredRow] = useState(null); // periodId
  const [hoveredCol, setHoveredCol] = useState(null); // dateStr 'YYYY-MM-DD'

  // Overwrite Confirmation Modal State (Exact 2 Buttons + Delete)
  const [overwriteTarget, setOverwriteTarget] = useState(null); // { roomId, dateStr, periodId, existingText }
  // Quick Free Text Edit Modal State
  const [editTarget, setEditTarget] = useState(null); // { roomId, dateStr, periodId, existingText }
  const [inputText, setInputText] = useState('');

  const kstToday = getKSTTodayString();
  const roomObj = SPECIAL_ROOMS.find(r => r.id === activeRoomId) || SPECIAL_ROOMS[0];

  // 1. 주차별 평일 (월~금 5일)
  const weekDays = getWeekDaysMonToFri(currentWeekDate);
  const monDateStr = weekDays[0].dateStr;
  const friDateStr = weekDays[4].dateStr;

  // 2. 월간 전체 평일 리스트
  const monthWeekdays = getMonthWeekdays(selectedYear, selectedMonth);

  // 주차 이동
  const handlePrevWeek = () => {
    const d = new Date(monDateStr);
    d.setDate(d.getDate() - 7);
    const prevStr = d.toISOString().split('T')[0];
    if (prevStr >= '2026-08-10') {
      setCurrentWeekDate(prevStr);
      const parts = prevStr.split('-');
      setSelectedYear(parseInt(parts[0], 10));
      setSelectedMonth(parseInt(parts[1], 10));
    }
  };

  const handleNextWeek = () => {
    const d = new Date(monDateStr);
    d.setDate(d.getDate() + 7);
    const nextStr = d.toISOString().split('T')[0];
    if (nextStr <= '2027-01-15') {
      setCurrentWeekDate(nextStr);
      const parts = nextStr.split('-');
      setSelectedYear(parseInt(parts[0], 10));
      setSelectedMonth(parseInt(parts[1], 10));
    }
  };

  // 원하는 날짜 순간이동 (Teleport)
  const handleDateTeleport = (targetDateStr) => {
    if (!targetDateStr) return;
    setCurrentWeekDate(targetDateStr);
    const parts = targetDateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (MONTHS.some(item => item.year === y && item.month === m)) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  };

  // 오늘 날짜로 자동 이동 (한달 전체보기 & 주차별 보기 모두 지원)
  const handleGoToday = () => {
    handleDateTeleport(kstToday);
  };

  // 셀 클릭
  const handleCellClick = (dateStr, periodId) => {
    const key = `${activeRoomId}_${dateStr}_${periodId}`;
    const existing = reservations[key] ? reservations[key].text : '';

    if (existing && existing.trim()) {
      setOverwriteTarget({
        roomId: activeRoomId,
        dateStr,
        periodId,
        existingText: existing.trim()
      });
    } else {
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

  // 경고 팝업에서 기존 일정 바로 삭제
  const handleDirectDeleteFromWarning = () => {
    if (!overwriteTarget) return;
    onSaveReservation(
      overwriteTarget.roomId,
      overwriteTarget.dateStr,
      overwriteTarget.periodId,
      '',
      overwriteTarget.existingText
    );
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
  const activeDaysList = viewMode === 'month' ? monthWeekdays : weekDays;

  return (
    <section className="calendar-section" style={{ width: '100%' }}>
      {/* 1. Special Room Tab Selector */}
      <div style={{ background: '#fafafa', borderBottom: '1px solid var(--border-color)', padding: '0.5rem 1rem' }} className="no-print">
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

      {/* 2. Controls Bar: View Mode Switcher + Month Selector + Teleport Date Search + Today Jump */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }} className="no-print">
        {/* Active Room Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{roomObj.icon}</span>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
              [{roomObj.name}] 예약 달력
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {roomObj.location}</span>
          </div>
        </div>

        {/* View Mode Switcher: [📅 한달 전체 보기] vs [🗓️ 주차별 보기] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px' }}>
          <button
            className={`btn ${viewMode === 'month' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('month')}
            style={{ border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.825rem' }}
          >
            <Grid size={15} />
            <span>📅 한달 전체 보기</span>
          </button>
          <button
            className={`btn ${viewMode === 'week' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('week')}
            style={{ border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.825rem' }}
          >
            <Layers size={15} />
            <span>🗓️ 주차별 보기</span>
          </button>
        </div>

        {/* Month Selector for Month View */}
        {viewMode === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {MONTHS.map(m => (
              <button
                key={`${m.year}-${m.month}`}
                className={`btn ${selectedYear === m.year && selectedMonth === m.month ? 'btn-primary' : ''}`}
                onClick={() => { setSelectedYear(m.year); setSelectedMonth(m.month); }}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.825rem' }}
              >
                {m.month}월
              </button>
            ))}
          </div>
        )}

        {/* Week Navigator for Week View */}
        {viewMode === 'week' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button className="btn" onClick={handlePrevWeek} style={{ padding: '0.35rem 0.6rem' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.875rem', fontWeight: '800', background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
              {monDateStr} ~ {friDateStr}
            </span>
            <button className="btn" onClick={handleNextWeek} style={{ padding: '0.35rem 0.6rem' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Date Teleport Picker & Today Jump (한달/주차별 모두 지원) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Search size={15} color="#64748b" />
            <input
              type="date"
              className="date-picker-input"
              style={{ fontSize: '0.825rem', padding: '0.35rem 0.6rem' }}
              min={SEMESTER_START_DATE}
              max={SEMESTER_END_DATE}
              value={currentWeekDate}
              onChange={(e) => handleDateTeleport(e.target.value)}
              title="원하는 날짜로 순간이동"
            />
          </div>

          <button
            className="btn"
            onClick={handleGoToday}
            style={{ fontWeight: '800', backgroundColor: '#eef2ff', borderColor: '#c7d2fe', color: '#4f46e5', fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}
          >
            <CalendarIcon size={15} />
            <span>오늘 ({kstToday}) 이동</span>
          </button>
        </div>
      </div>

      {/* 3. High-Readability Matrix Table with Friday Borders & 8.17 월 Date Header */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="grid-table" onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}>
          <thead>
            <tr>
              <th className="period-header-th" style={{ width: '130px' }}>교시 \ 날짜</th>
              {activeDaysList.map(dayObj => {
                const isToday = dayObj.dateStr === kstToday;
                const isFriday = dayObj.isFriday;

                return (
                  <th
                    key={dayObj.dateStr}
                    className={`date-header-th ${isToday ? 'today-column' : ''}`}
                    style={{
                      borderRight: (viewMode === 'month' && isFriday) ? '3px solid #64748b' : undefined,
                      padding: '0.5rem 0.25rem'
                    }}
                  >
                    <div>
                      {/* 간결한 날짜표기: 예) 8.17 월 */}
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: isToday ? 'var(--brand-indigo)' : 'var(--text-primary)' }}>
                        {dayObj.displayLabel || `${dayObj.month}.${dayObj.dayNumber} ${dayObj.weekdayName}`}
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

                  {/* Day Cells with Friday thick vertical border */}
                  {activeDaysList.map(dayObj => {
                    const key = `${activeRoomId}_${dayObj.dateStr}_${period.id}`;
                    const resItem = reservations[key];
                    const hasReservation = resItem && resItem.text && resItem.text.trim();

                    const isColHovered = hoveredCol === dayObj.dateStr;
                    const isTargetCell = isRowHovered && isColHovered;
                    const isToday = dayObj.dateStr === kstToday;
                    const isFriday = dayObj.isFriday;

                    let cellClasses = 'reservation-cell';
                    if (isTargetCell) cellClasses += ' crosshair-target';
                    else if (isRowHovered) cellClasses += ' crosshair-row';
                    else if (isColHovered) cellClasses += ' crosshair-col';

                    if (isToday) cellClasses += ' today-column-cell';

                    return (
                      <td
                        key={dayObj.dateStr}
                        className={cellClasses}
                        style={{
                          borderRight: (viewMode === 'month' && isFriday) ? '3px solid #64748b' : undefined
                        }}
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

      {/* EXACT 2 BUTTONS Overwrite Confirmation Modal + Direct Delete Button */}
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

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              선택 일시: {overwriteTarget.dateStr} ({PERIODS.find(p => p.id === overwriteTarget.periodId)?.name})
            </p>

            <div className="exact-two-buttons" style={{ marginBottom: '0.75rem' }}>
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

            <div style={{ textAlign: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                className="btn"
                onClick={handleDirectDeleteFromWarning}
                style={{ width: '100%', backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', fontWeight: '700' }}
              >
                <Trash2 size={16} />
                <span>기존 예약 일정 바로 삭제하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Text Input / Edit Modal with Delete Option */}
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
                    style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', fontWeight: '700' }}
                    onClick={handleDelete}
                  >
                    <Trash2 size={16} />
                    <span>예약 일정 삭제</span>
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
