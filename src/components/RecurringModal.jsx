import React, { useState } from 'react';
import { SPECIAL_ROOMS, PERIODS, SEMESTER_START_DATE, SEMESTER_END_DATE, getKSTTodayString } from '../constants';
import { Check, Calendar, Repeat, X } from 'lucide-react';

export function RecurringModal({ isOpen, onClose, onBatchSave, defaultRoomId }) {
  const kstToday = getKSTTodayString();

  const [roomId, setRoomId] = useState(defaultRoomId || SPECIAL_ROOMS[0].id);
  // Weekdays (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
  const [selectedWeekdays, setSelectedWeekdays] = useState([3]); // default Wednesday
  // 7 Periods Multi-Select Checkboxes
  const [selectedPeriodIds, setSelectedPeriodIds] = useState(['p3']); // default 3교시
  
  const [startDate, setStartDate] = useState(
    kstToday >= SEMESTER_START_DATE && kstToday <= SEMESTER_END_DATE ? kstToday : SEMESTER_START_DATE
  );
  
  const [repeatMode, setRepeatMode] = useState('4weeks'); // '4weeks', '8weeks', 'semester', 'custom'
  const [customEndDate, setCustomEndDate] = useState(SEMESTER_END_DATE);
  
  const [reservationText, setReservationText] = useState('');

  if (!isOpen) return null;

  // Toggle weekday selection
  const handleToggleWeekday = (dayNum) => {
    if (selectedWeekdays.includes(dayNum)) {
      if (selectedWeekdays.length > 1) {
        setSelectedWeekdays(selectedWeekdays.filter(d => d !== dayNum));
      }
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayNum].sort());
    }
  };

  // Toggle period selection
  const handleTogglePeriod = (pid) => {
    if (selectedPeriodIds.includes(pid)) {
      if (selectedPeriodIds.length > 1) {
        setSelectedPeriodIds(selectedPeriodIds.filter(p => p !== pid));
      }
    } else {
      setSelectedPeriodIds([...selectedPeriodIds, pid]);
    }
  };

  // Calculate target dates for recurring reservation
  const calculateTargetReservations = () => {
    if (!startDate || !reservationText.trim()) return [];

    let calculatedEndDate = customEndDate;
    const startObj = new Date(startDate);

    if (repeatMode === '4weeks') {
      const endObj = new Date(startObj);
      endObj.setDate(endObj.getDate() + (4 * 7) - 1);
      calculatedEndDate = endObj.toISOString().split('T')[0];
    } else if (repeatMode === '8weeks') {
      const endObj = new Date(startObj);
      endObj.setDate(endObj.getDate() + (8 * 7) - 1);
      calculatedEndDate = endObj.toISOString().split('T')[0];
    } else if (repeatMode === 'semester') {
      calculatedEndDate = SEMESTER_END_DATE;
    }

    if (calculatedEndDate > SEMESTER_END_DATE) {
      calculatedEndDate = SEMESTER_END_DATE;
    }

    const items = [];
    let current = new Date(startDate);
    const endBoundary = new Date(calculatedEndDate);

    while (current <= endBoundary) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayOfWeek = current.getDay();

      if (dateStr >= SEMESTER_START_DATE && dateStr <= SEMESTER_END_DATE) {
        if (selectedWeekdays.includes(dayOfWeek)) {
          selectedPeriodIds.forEach(pid => {
            items.push({
              roomId,
              date: dateStr,
              periodId: pid,
              text: reservationText.trim()
            });
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return items;
  };

  const targetItems = calculateTargetReservations();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (targetItems.length === 0) {
      alert('등록할 예약 조건에 해당하는 날짜가 없거나 입력 내용이 비어있습니다.');
      return;
    }

    const roomObj = SPECIAL_ROOMS.find(r => r.id === roomId);
    const logText = `[반복예약] ${roomObj?.name}총 ${targetItems.length}개 교시 예약 등록됨 ('${reservationText}')`;
    
    onBatchSave(targetItems, logText);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Repeat size={22} color="var(--brand-indigo)" />
            <h3 className="modal-title">디테일 반복 예약 일괄 등록</h3>
          </div>
          <button className="btn" style={{ border: 'none', padding: '0.2rem' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. Special Room Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
              1. 특별실 선택
            </label>
            <select
              className="date-picker-input"
              style={{ width: '100%', padding: '0.6rem' }}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              {SPECIAL_ROOMS.map(r => (
                <option key={r.id} value={r.id}>
                  {r.icon} {r.name} ({r.location})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Weekdays Multi-Select */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
              2. 반복 요일 선택 (다중 선택 가능)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { day: 1, label: '월요일' },
                { day: 2, label: '화요일' },
                { day: 3, label: '수요일' },
                { day: 4, label: '목요일' },
                { day: 5, label: '금요일' }
              ].map(w => {
                const isSelected = selectedWeekdays.includes(w.day);
                return (
                  <button
                    key={w.day}
                    type="button"
                    className={`btn ${isSelected ? 'btn-primary' : ''}`}
                    style={{ flex: 1, padding: '0.5rem 0.2rem' }}
                    onClick={() => handleToggleWeekday(w.day)}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 7 Periods Multi-Select Checkboxes */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
              3. 교시 선택 (7개 항목 체크박스 다중 선택 가능)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {PERIODS.map(p => {
                const isChecked = selectedPeriodIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.5rem',
                      background: isChecked ? '#eef2ff' : 'white',
                      border: isChecked ? '1px solid #818cf8' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: isChecked ? '700' : '500'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePeriod(p.id)}
                    />
                    <span>{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Start Date & Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                시작일 선택
              </label>
              <input
                type="date"
                className="date-picker-input"
                style={{ width: '100%' }}
                min={SEMESTER_START_DATE}
                max={SEMESTER_END_DATE}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                반복 기간 선택
              </label>
              <select
                className="date-picker-input"
                style={{ width: '100%', padding: '0.6rem' }}
                value={repeatMode}
                onChange={(e) => setRepeatMode(e.target.value)}
              >
                <option value="4weeks">4주간 반복</option>
                <option value="8weeks">8주간 반복</option>
                <option value="semester">2학기 종강일까지 (27.01.08 금)</option>
                <option value="custom">종료일 직접 지정</option>
              </select>
            </div>
          </div>

          {repeatMode === 'custom' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                종료일 직접 입력
              </label>
              <input
                type="date"
                className="date-picker-input"
                style={{ width: '100%' }}
                min={startDate}
                max={SEMESTER_END_DATE}
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}

          {/* 5. Reservation Text */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
              예약자 / 학년 / 수업 내용 입력
            </label>
            <input
              type="text"
              className="date-picker-input"
              style={{ width: '100%', fontSize: '0.95rem' }}
              placeholder="예: 3학년, 3-6, 예술강사"
              value={reservationText}
              onChange={(e) => setReservationText(e.target.value)}
              required
            />
          </div>

          {/* Target count summary */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>
            💡 일괄 예약 요약: 선택한 조건으로 <span style={{ textDecoration: 'underline', fontWeight: '800' }}>총 {targetItems.length}개 교시</span>에 일괄 예약이 등록됩니다.
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn-warning" disabled={targetItems.length === 0}>
              <Check size={16} />
              <span>{targetItems.length}개 일괄 예약하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
