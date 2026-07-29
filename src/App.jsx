import React, { useState, useEffect } from 'react';
import { SPECIAL_ROOMS, MONTHS, getKSTTodayString, SEMESTER_START_DATE, SEMESTER_END_DATE } from './constants';
import {
  subscribeToReservations,
  subscribeToHistory,
  saveReservation,
  batchSaveReservations,
  isFirebaseConnected as checkFirebaseConnected
} from './firebase';

import { Header } from './components/Header';
import { MonthControl } from './components/MonthControl';
import { CalendarView } from './components/CalendarView';
import { DashboardView } from './components/DashboardView';
import { MiniHistory } from './components/MiniHistory';
import { RecurringModal } from './components/RecurringModal';
import { FirebaseModal } from './components/FirebaseModal';

export default function App() {
  const kstToday = getKSTTodayString();

  // Active Special Room Tab
  const [activeRoomId, setActiveRoomId] = useState(SPECIAL_ROOMS[0].id);
  // View mode: 'calendar' | 'dashboard'
  const [currentView, setCurrentView] = useState('calendar');

  // Initial Year / Month calculation
  const getInitialYearMonth = () => {
    if (kstToday >= SEMESTER_START_DATE && kstToday <= SEMESTER_END_DATE) {
      const parts = kstToday.split('-');
      return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
    }
    return { year: 2026, month: 8 };
  };

  const initialYM = getInitialYearMonth();
  const [selectedYear, setSelectedYear] = useState(initialYM.year);
  const [selectedMonth, setSelectedMonth] = useState(initialYM.month);
  const [searchDate, setSearchDate] = useState(kstToday);

  // Real-time Data States
  const [reservations, setReservations] = useState({});
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(checkFirebaseConnected());

  // Modals
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  // Subscribe to Realtime Updates (Firebase / BroadcastChannel Fallback)
  useEffect(() => {
    const unsubReservations = subscribeToReservations((val) => {
      setReservations(val || {});
    });

    const unsubHistory = subscribeToHistory((list) => {
      setHistoryLogs(list || []);
    });

    setIsConnected(checkFirebaseConnected());

    return () => {
      if (typeof unsubReservations === 'function') unsubReservations();
      if (typeof unsubHistory === 'function') unsubHistory();
    };
  }, [isConnected]);

  // Year/Month Change
  const handleChangeYearMonth = (year, month) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // Date Picker Search Handler
  const handleSearchDateChange = (dateVal) => {
    setSearchDate(dateVal);
    if (dateVal) {
      const parts = dateVal.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (MONTHS.some(item => item.year === y && item.month === m)) {
        setSelectedYear(y);
        setSelectedMonth(m);
      }
    }
  };

  // Go to Today
  const handleGoToday = () => {
    const today = getKSTTodayString();
    handleSearchDateChange(today);
  };

  // Single reservation save / delete
  const handleSaveReservation = async (roomId, dateStr, periodId, text, oldText) => {
    try {
      await saveReservation(roomId, dateStr, periodId, text, oldText);
    } catch (err) {
      console.error('Error saving reservation:', err);
      alert('예약 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // Batch / Recurring reservation save
  const handleBatchSave = async (itemsArray, logText) => {
    try {
      await batchSaveReservations(itemsArray, logText);
      alert(`🎉 총 ${itemsArray.length}개의 반복 예약이 성공적으로 일괄 등록되었습니다!`);
    } catch (err) {
      console.error('Error batch saving:', err);
      alert('반복 예약 일괄 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // Switch to room & date from Dashboard
  const handleSelectRoomAndDate = (roomId, dateStr) => {
    setActiveRoomId(roomId);
    handleSearchDateChange(dateStr);
    setCurrentView('calendar');
  };

  return (
    <div className="app-container">
      {/* 1. Header Navigation */}
      <Header
        activeRoomId={activeRoomId}
        setActiveRoomId={setActiveRoomId}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        isFirebaseConnected={isConnected}
      />

      {/* 2. Month & Search Control Bar */}
      {currentView === 'calendar' && (
        <MonthControl
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onChangeYearMonth={handleChangeYearMonth}
          searchDate={searchDate}
          onSearchDateChange={handleSearchDateChange}
          onGoToday={handleGoToday}
        />
      )}

      {/* 3. Main Content Body */}
      <main className="main-content">
        {currentView === 'calendar' ? (
          <CalendarView
            activeRoomId={activeRoomId}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            reservations={reservations}
            onSaveReservation={handleSaveReservation}
            searchDate={searchDate}
          />
        ) : (
          <DashboardView
            reservations={reservations}
            onSaveReservation={handleSaveReservation}
            onSelectRoomAndDate={handleSelectRoomAndDate}
          />
        )}

        {/* 4. Mini History Log Sidebar */}
        <MiniHistory historyLogs={historyLogs} />
      </main>

      {/* 5. Recurring Reservation Modal */}
      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onBatchSave={handleBatchSave}
        defaultRoomId={activeRoomId}
      />

      {/* 6. Firebase Config Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        isFirebaseConnected={isConnected}
        onConnectionChange={(status) => setIsConnected(status)}
      />
    </div>
  );
}
