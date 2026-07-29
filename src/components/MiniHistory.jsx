import React from 'react';
import { History, Clock, FileText } from 'lucide-react';
import { formatKSTTimestamp } from '../constants';

export function MiniHistory({ historyLogs }) {
  return (
    <aside className="history-panel no-print">
      <div className="history-header">
        <div className="history-title">
          <History size={18} color="var(--brand-indigo)" />
          <span>최근 변경 내역 (미니 히스토리)</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
          실시간
        </span>
      </div>

      <div className="history-list">
        {historyLogs && historyLogs.length > 0 ? (
          historyLogs.slice(0, 30).map((log) => {
            const timeStr = log.timestamp ? formatKSTTimestamp(new Date(log.timestamp)) : '';
            return (
              <div key={log.id || Math.random()} className="history-item">
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {log.logText || `${log.date} ${log.roomId} ${log.periodId} 예약됨`}
                </div>
                <div className="history-time">
                  <Clock size={11} style={{ display: 'inline', marginRight: '0.2rem' }} />
                  {timeStr}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '2rem 0' }}>
            <FileText size={24} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <br />
            아직 변경 내역이 없습니다.
          </div>
        )}
      </div>
    </aside>
  );
}
