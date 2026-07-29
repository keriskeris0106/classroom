import React, { useState } from 'react';
import { SPECIAL_ROOMS, PERIODS, SEMESTER_START_DATE, SEMESTER_END_DATE, getKSTTodayString } from '../constants';
import { Check, Repeat, X, AlertTriangle } from 'lucide-react';

export function RecurringModal({ isOpen, onClose, onBatchSave, defaultRoomId, currentReservations }) {
  const kstToday = getKSTTodayString();

  const [roomId, setRoomId] = useState(defaultRoomId || SPECIAL_ROOMS[0].id);
  // 반복 요일 (1=월, 2=화, 3=수, 4=목, 5=금)
  const [selectedWeekdays, setSelectedWeekdays] = useState([3]); // 기본 수요일
  // 7개 교시 체크박스
  const [selectedPeriodIds, setSelectedPeriodIds] = useState(['p3']); // 기본 3교시
  
  const [startDate, setStartDate] = useState(
    kstToday >= SEMESTER_START_DATE && kstToday <= SEMESTER_END_DATE ? kstToday : SEMESTER_START_DATE
  );
  
  // 종료일 직접 지정
  const [endDate, setEndDate] = useState(SEMESTER_END_DATE);
  const [reservationText, setReservationText] = useState('');

  // Overwrite Warning State
  const [overwriteWarningItems, setOverwriteWarningItems] = useState(null);

  if (!isOpen) return null;

  const handleToggleWeekday = (dayNum) => {
    if (selectedWeekdays.includes(dayNum)) {
      if (selectedWeekdays.length > 1) {
        setSelectedWeekdays(selectedWeekdays.filter(d => d !== dayNum));
      }
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayNum].sort());
    }
  };

  const handleTogglePeriod = (pid) => {
    if (selectedPeriodIds.includes(pid)) {
      if (selectedPeriodIds.length > 1) {
        setSelectedPeriodIds(selectedPeriodIds.filter(p => p !== pid));
      }
    } else {
      setSelectedPeriodIds([...selectedPeriodIds, pid]);
    }
  };

  // 시작일부터 종료일까지 타임존 시프트 없는 정밀 반복 날짜 계산
  const calculateTargetReservations = () => {
    if (!startDate || !endDate || !reservationText.trim() || startDate > endDate) return [];

    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);

    // 정오(12:00) 기준 Date 객체 생성으로 타임존 오차 전면 차단
    let curr = new Date(sY, sM - 1, sD, 12, 0, 0);
    const endLimit = new Date(eY, eM - 1, eD, 12, 0, 0);

    const items = [];

    while (curr <= endLimit) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayOfWeek = curr.getDay(); // 0(일), 1(월), 2(화), 3(수), 4(목), 5(금), 6(토)

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

      // 하루씩 증가
      curr.setDate(curr.getDate() + 1);
    }

    return items;
  };

  const targetItems = calculateTargetReservations();

  // 제출 처리 (충돌 검사)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (targetItems.length === 0) {
      alert('선택하신 기간 및 요일 조건에 해당하는 날짜가 없거나 입력 내용이 비어있습니다.');
      return;
    }

    // 기존 예약과 충돌하는 항목 세기
    const existingConflictCount = targetItems.filter(item => {
      const key = `${item.roomId}_${item.date}_${item.periodId}`;
      const res = currentReservations ? currentReservations[key] : null;
      return res && res.text && res.text.trim();
    }).length;

    if (existingConflictCount > 0) {
      setOverwriteWarningItems(targetItems);
    } else {
      executeBatchSave(targetItems);
    }
  };

  const executeBatchSave = (items) => {
    const roomObj = SPECIAL_ROOMS.find(r => r.id === roomId);
    const logText = `[반복예약] ${roomObj?.name} 총 ${items.length}개 시간대 일괄 등록 ('${reservationText}')`;
    onBatchSave(items, logText);
    setOverwriteWarningItems(null);
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

        {!overwriteWarningItems ? (
          <form onSubmit={handleSubmit}>
            {/* 1. Special Room Selector */}
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

            {/* 4. Start & End Date Pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  4. 시작일 선택
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
                  5. 종료일 선택
                </label>
                <input
                  type="date"
                  className="date-picker-input"
                  style={{ width: '100%' }}
                  min={startDate}
                  max={SEMESTER_END_DATE}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* 5. Reservation Text */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                6. 예약자 / 학년 / 수업 내용 입력
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

            {/* Target Count Summary */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>
              💡 일괄 예약 요약: 지정한 시작일({startDate}) ~ 종료일({endDate}) 동안 <span style={{ textDecoration: 'underline', fontWeight: '800' }}>총 {targetItems.length}개 시간대</span>에 일괄 등록됩니다.
            </div>

            {/* Action Buttons */}
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
        ) : (
          /* Overwrite Warning Modal (EXACT 2 BUTTONS) */
          <div>
            <div className="warning-box">
              <AlertTriangle size={22} />
              <span>이미 예약된 교실/시간대가 포함되어 있습니다. 덮어쓰시겠습니까?</span>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              일괄 등록 예정인 {overwriteWarningItems.length}개 시간대 중 기존 예약이 존재하는 교실이 있습니다.<br />
              기존 일정을 덮어쓰시려면 아래 <strong>[네, 변경하겠습니다]</strong>를 클릭하세요.
            </p>

            <div className="exact-two-buttons">
              <button
                type="button"
                className="btn-modal-action btn-confirm-yes"
                onClick={() => executeBatchSave(overwriteWarningItems)}
              >
                네, 변경하겠습니다
              </button>
              <button
                type="button"
                className="btn-modal-action btn-confirm-no"
                onClick={() => setOverwriteWarningItems(null)}
              >
                아니오, 변경하지 않겠습니다
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
