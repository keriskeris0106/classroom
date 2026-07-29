import React from 'react';
import { MONTHS, getKSTTodayString } from '../constants';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export function MonthControl({
  selectedYear,
  selectedMonth,
  onChangeYearMonth,
  searchDate,
  onSearchDateChange,
  onGoToday
}) {
  const kstToday = getKSTTodayString();

  return (
    <div className="month-control-bar no-print">
      <div className="month-selector-group">
        <span style={{ fontSize: '0.9rem', fontWeight: '700', marginRight: '0.5rem', color: '#334155' }}>
          🗓️ 월 선택:
        </span>
        {MONTHS.map((m) => {
          const isActive = selectedYear === m.year && selectedMonth === m.month;
          return (
            <button
              key={`${m.year}-${m.month}`}
              className={`month-btn ${isActive ? 'active' : ''}`}
              onClick={() => onChangeYearMonth(m.year, m.month)}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Date Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Search size={16} color="#64748b" />
          <input
            type="date"
            className="date-picker-input"
            min="2026-08-17"
            max="2027-01-08"
            value={searchDate}
            onChange={(e) => onSearchDateChange(e.target.value)}
          />
        </div>

        {/* Go Today Button */}
        <button
          className="btn"
          onClick={onGoToday}
          style={{ fontWeight: '700', backgroundColor: '#eef2ff', borderColor: '#c7d2fe', color: '#4f46e5' }}
        >
          <CalendarIcon size={16} />
          <span>오늘 ({kstToday})</span>
        </button>
      </div>
    </div>
  );
}
