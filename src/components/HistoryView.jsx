import React from 'react';
import { History, Clock, FileText } from 'lucide-react';
import { formatKSTTimestamp } from '../constants';

export function HistoryView({ historyLogs }) {
  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Header Banner */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--brand-indigo-light)', padding: '0.66rem', borderRadius: '10px', color: 'var(--brand-indigo)' }}>
            <History size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
              교내 특별실 최근 변경 내역 (실시간 히스토리)
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              누가 언제 어떤 특별실을 예약, 수정, 삭제했는지 실시간 로그를 확인합니다.
            </p>
          </div>
        </div>

        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--brand-indigo)', background: '#eef2ff', padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
          총 {historyLogs ? historyLogs.length : 0}개 기록
        </span>
      </div>

      {/* History List */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.25rem', flex: 1 }}>
        {historyLogs && historyLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {historyLogs.map((log) => {
              const timeStr = log.timestamp ? formatKSTTimestamp(new Date(log.timestamp)) : '';
              return (
                <div
                  key={log.id || Math.random()}
                  style={{
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--brand-indigo)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {log.logText || `${log.date} ${log.roomId} ${log.periodId} 예약됨`}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={14} />
                    <span>{timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <br />
            아직 변경 내역이 등록되지 않았습니다.
          </div>
        )}
      </div>
    </section>
  );
}
