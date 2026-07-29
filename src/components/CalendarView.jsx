import React, { useState } from 'react';
import { PERIODS, WEEKDAYS_KO, getKSTTodayString, SEMESTER_START_DATE, SEMESTER_END_DATE, SPECIAL_ROOMS } from '../constants';
import { AlertTriangle, Check, Plus, Trash2, X } from 'lucide-react';

export function CalendarView({
  activeRoomId,
  selectedYear,
  selectedMonth,
  reservations,
  onSaveReservation,
  searchDate
}) {
  const [hoveredRow, setHoveredRow] = useState(null); // period.id
  const [hoveredCol, setHoveredCol] = useState(null); // date string 'YYYY-MM-DD'

  // Overwrite Warning Modal State
  const [overwriteTarget, setOverwriteTarget] = useState(null); // { roomId, dateStr, periodId, existingText }
  // Quick Edit Modal State
  const [editTarget, setEditTarget] = useState(null); // { roomId, dateStr, periodId, existingText }
  const [inputText, setInputText] = useState('');

  const kstToday = getKSTTodayString();
  const roomObj = SPECIAL_ROOMS.find(r => r.id === activeRoomId) || SPECIAL_ROOMS[0];

  // Selected Month의 평일(월~금) 날짜 리스트 생성 (2026.08.17 ~ 2027.01.08 범위 제한)
  const weekdaysInMonth = [];
  const daysInMonthCount = new Date(selectedYear, selectedMonth, 0).getDate();

  for (let day = 1; day <= daysInMonthCount; day++) {
    const d = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = d.getDay();
    // 평일만 추출 (월=1, 화=2, 수=3, 목=4, 금=5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const mm = String(selectedMonth).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${selectedYear}-${mm}-${dd}`;

      // 2026.08.17 ~ 2027.01.08 학기 사용 기간 필터링
      if (dateStr >= SEMESTER_START_DATE && dateStr <= SEMESTER_END_DATE) {
        weekdaysInMonth.push({
          dateStr,
          dayNumber: day,
          weekdayName: WEEKDAYS_KO[dayOfWeek],
          isToday: dateStr === kstToday,
          isSearchTarget: dateStr === searchDate
        });
      }
    }
  }

  // 셀 클릭 처리
  const handleCellClick = (dateStr, periodId) => {
    const key = `${activeRoomId}_${dateStr}_${periodId}`;
    const existing = reservations[key] ? reservations[key].text : '';

    if (existing && existing.trim()) {
      // 1. 이미 예약된 경우 -> 딱 2개 버튼 경고 팝업 생성
      setOverwriteTarget({
        roomId: activeRoomId,
        dateStr,
        periodId,
        existingText: existing.trim()
      });
    } else {
      // 2. 빈 셀인 경우 -> 바로 입력창 생성
      setEditTarget({
        roomId: activeRoomId,
        dateStr,
        periodId,
        existingText: ''
      });
      setInputText('');
    }
  };

  // 경고 팝업에서 "네, 변경하겠습니다" 선택 시 -> 편집 창 활성화
  const handleConfirmOverwriteYes = () => {
    if (overwriteTarget) {
      setEditTarget({ ...overwriteTarget });
      setInputText(overwriteTarget.existingText);
      setOverwriteTarget(null);
    }
  };

  // 경고 팝업에서 "아니오, 변경하지 않겠습니다" 선택 시 -> 팝업 닫기
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
    <section className="calendar-section">
      {/* Room Title Header */}
      <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.4rem' }}>{roomObj.icon}</span>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
            [{roomObj.name}] {selectedYear}년 {selectedMonth}월 예약 달력
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'white', padding: '0.2rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            📍 {roomObj.location}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          💡 십자선 마우스 호버 지원 | 총 {weekdaysInMonth.length}개 수업일
        </div>
      </div>

      {/* Crosshair Grid Table */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="grid-table" onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}>
          <thead>
            <tr>
              <th className="period-header-th">교시 \ 날짜</th>
              {weekdaysInMonth.map((dayObj) => (
                <th
                  key={dayObj.dateStr}
                  className={`date-header-th ${dayObj.isToday ? 'today-column' : ''}`}
                  style={{
                    backgroundColor: dayObj.isSearchTarget ? '#e0e7ff' : undefined,
                    borderLeft: dayObj.isSearchTarget ? '2px solid #4f46e5' : undefined,
                    borderRight: dayObj.isSearchTarget ? '2px solid #4f46e5' : undefined
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {dayObj.dateStr.slice(5, 7)}월
                    </span>
                    <br />
                    <span style={{ fontSize: '1.05rem', fontWeight: '800' }}>
                      {dayObj.dayNumber}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', marginLeft: '0.2rem' }}>
                      ({dayObj.weekdayName})
                    </span>
                  </div>
                  {dayObj.isToday && <span className="today-tag">TODAY</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {PERIODS.map((period) => {
              const isRowHovered = hoveredRow === period.id;

              return (
                <tr key={period.id}>
                  {/* Period Header Column */}
                  <td className="period-cell">
                    {period.name}
                    <span className="period-time-sub">{period.time}</span>
                  </td>

                  {/* Date Columns for this Period */}
                  {weekdaysInMonth.map((dayObj) => {
                    const key = `${activeRoomId}_${dayObj.dateStr}_${period.id}`;
                    const resItem = reservations[key];
                    const hasReservation = resItem && resItem.text && resItem.text.trim();

                    const isColHovered = hoveredCol === dayObj.dateStr;
                    const isTargetCell = isRowHovered && isColHovered;

                    let cellClasses = 'reservation-cell';
                    if (isTargetCell) cellClasses += ' crosshair-target';
                    else if (isRowHovered) cellClasses += ' crosshair-row';
                    else if (isColHovered) cellClasses += ' crosshair-col';

                    if (dayObj.isToday) cellClasses += ' today-column-cell';

                    return (
                      <td
                        key={dayObj.dateStr}
                        className={cellClasses}
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

      {/* 1. EXACT 2 BUTTONS Overwrite Confirmation Modal */}
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

            {/* User requirement: 딱 2개 버튼 ("네, 변경하겠습니다", "아니오, 변경하지 않겠습니다") */}
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

      {/* 2. Free Text Input / Edit Modal */}
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
