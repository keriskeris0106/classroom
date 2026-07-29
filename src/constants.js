// 2026학년도 2학기 전용 교내 특별실 실시간 예약 상수 및 설정을 정의합니다.

export const SPECIAL_ROOMS = [
  { id: 'audiovisual', name: '시청각실', location: '마루동 1층', icon: '🎬', color: '#6366f1' },
  { id: 'practical', name: '실과실', location: '달빛동 2층', icon: '✂️', color: '#ec4899' },
  { id: 'ai', name: 'AI실', location: '달빛동 3층', icon: '🤖', color: '#3b82f6' },
  { id: 'com1', name: '컴퓨터실1', location: '달빛동 2층', icon: '💻', color: '#06b6d4' },
  { id: 'com2', name: '컴퓨터실2', location: '달빛동 2층', icon: '🖥️', color: '#14b8a6' },
  { id: 'arts1', name: '예체능실1', location: '달빛동 3층', icon: '🎨', color: '#8b5cf6' },
  { id: 'arts2', name: '예체능실2', location: '달빛동 3층', icon: '🎶', color: '#a855f7' },
  { id: 'playground', name: '운동장', location: '야외', icon: '⚽', color: '#22c55e' },
  { id: 'subject3', name: '교과전용실3', location: '4층', icon: '📐', color: '#f59e0b' },
  { id: 'art2', name: '미술실2', location: '3층', icon: '🖌️', color: '#eab308' },
  { id: 'music', name: '음악실', location: '5층', icon: '🎵', color: '#ef4444' },
  { id: 'art1', name: '미술실1', location: '2층', icon: '🎨', color: '#f97316' },
];

export const PERIODS = [
  { id: 'p1', name: '1교시', time: '09:00~09:40' },
  { id: 'p2', name: '2교시', time: '09:50~10:30' },
  { id: 'p3', name: '3교시', time: '10:40~11:20' },
  { id: 'p4', name: '4교시', time: '11:30~12:10' },
  { id: 'p5_34', name: '12:20(3,4학년)', time: '12:20~13:00' },
  { id: 'p5_56', name: '13:00(5,6학년)', time: '13:00~13:40' },
  { id: 'p6', name: '6교시', time: '14:00~14:40' },
];

// 사용 기간: 2026.8.17.(월) ~ 2027.1.8.(금) (2026학년도 2학기 전용)
export const SEMESTER_START_DATE = '2026-08-17';
export const SEMESTER_END_DATE = '2027-01-08';

export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

// 대한민국 표준시 (KST) 날짜 구하기 Helper
export function getKSTTodayString() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstTime = new Date(utc + (3600000 * 9));
  
  const yyyy = kstTime.getFullYear();
  const mm = String(kstTime.getMonth() + 1).padStart(2, '0');
  const dd = String(kstTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatKSTTimestamp(dateObj = new Date()) {
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  const month = kst.getMonth() + 1;
  const day = kst.getDate();
  const hours = String(kst.getHours()).padStart(2, '0');
  const minutes = String(kst.getMinutes()).padStart(2, '0');
  const seconds = String(kst.getSeconds()).padStart(2, '0');
  return `${month}.${day} ${hours}:${minutes}:${seconds}`;
}

// 주차 계산 Helper: 지정한 날짜가 속한 주(월~금)의 5개 날짜 객체 배열 반환
export function getWeekDaysMonToFri(targetDateStr) {
  const dateObj = new Date(targetDateStr);
  const dayOfWeek = dateObj.getDay(); // 0(일)~6(토)
  
  // 월요일과의 차이 (월요일 = 1)
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(dateObj);
  monday.setDate(dateObj.getDate() + diffToMon);

  const weekDays = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    weekDays.push({
      dateStr,
      dayNumber: d.getDate(),
      month: d.getMonth() + 1,
      weekdayName: WEEKDAYS_KO[i + 1],
      isWithinSemester: dateStr >= SEMESTER_START_DATE && dateStr <= SEMESTER_END_DATE
    });
  }
  return weekDays;
}
