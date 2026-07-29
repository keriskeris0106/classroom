import React, { useState, useEffect } from 'react';
import { SPECIAL_ROOMS, getKSTTodayString } from './constants';
import {
  subscribeToReservations,
  subscribeToHistory,
  saveReservation,
  batchSaveReservations,
  getLocalReservations,
  isFirebaseConnected as checkFirebaseConnected
} from './firebase';

import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { CalendarView } from './components/CalendarView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { RecurringModal } from './components/RecurringModal';
import { FirebaseModal } from './components/FirebaseModal';

export default function App() {
  const kstToday = getKSTTodayString();

  // 4 Top-level Tabs: 'home' | 'reservation' | 'dashboard' | 'history'
  const [currentTab, setCurrentTab] = useState('home');
  // Active Room ID in Calendar View
  const [activeRoomId, setActiveRoomId] = useState(SPECIAL_ROOMS[0].id);
  // Current Active Week Date (defaults to KST Today)
  const [currentWeekDate, setCurrentWeekDate] = useState(kstToday);

  // Real-time Data States
  const [reservations, setReservations] = useState(getLocalReservations());
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(checkFirebaseConnected());

  // Modals
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  // Subscribe to Realtime Updates
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

  // Home Screen Room Selector Click
  const handleSelectRoomFromHome = (roomId) => {
    setActiveRoomId(roomId);
    setCurrentTab('reservation');
  };

  // Single Reservation Save / Update / Delete with Instant UI Feedback
  const handleSaveReservation = async (roomId, dateStr, periodId, text, oldText) => {
    try {
      const updatedMap = await saveReservation(roomId, dateStr, periodId, text, oldText);
      if (updatedMap) {
        setReservations({ ...updatedMap });
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      alert('예약 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // Batch / Recurring Reservation Save
  const handleBatchSave = async (itemsArray, logText) => {
    try {
      const updatedMap = await batchSaveReservations(itemsArray, logText);
      if (updatedMap) {
        setReservations({ ...updatedMap });
      }
      alert(`🎉 총 ${itemsArray.length}개의 반복 예약이 성공적으로 일괄 등록되었습니다!`);
    } catch (err) {
      console.error('Error batch saving:', err);
      alert('반복 예약 일괄 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // Dashboard Cell Click Handler -> Jump to Reservation View
  const handleSelectRoomAndDate = (roomId, dateStr) => {
    setActiveRoomId(roomId);
    setCurrentWeekDate(dateStr);
    setCurrentTab('reservation');
  };

  return (
    <div className="app-container">
      {/* 1. Top Header with 4 Main Tabs */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        isFirebaseConnected={isConnected}
      />

      {/* 2. Main Content View Area */}
      <main className="main-content">
        {currentTab === 'home' && (
          <HomeView
            onSelectRoom={handleSelectRoomFromHome}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
          />
        )}

        {currentTab === 'reservation' && (
          <CalendarView
            activeRoomId={activeRoomId}
            setActiveRoomId={setActiveRoomId}
            currentWeekDate={currentWeekDate}
            setCurrentWeekDate={setCurrentWeekDate}
            reservations={reservations}
            onSaveReservation={handleSaveReservation}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            reservations={reservations}
            onSaveReservation={handleSaveReservation}
            onSelectRoomAndDate={handleSelectRoomAndDate}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView historyLogs={historyLogs} />
        )}
      </main>

      {/* 3. Recurring Reservation Modal */}
      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onBatchSave={handleBatchSave}
        defaultRoomId={activeRoomId}
      />

      {/* 4. Firebase Config Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        isFirebaseConnected={isConnected}
        onConnectionChange={(status) => setIsConnected(status)}
      />
    </div>
  );
}
