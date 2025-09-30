import { useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { useAppStore } from '../stores/useAppStore';

export default function InterviewerPage() {
  const { candidates, finalizeCandidate, setActiveCandidate } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const data = useMemo(() => {
    return Object.values(candidates)
      .map((c) => ({
        key: c.id,
        id: c.id,
        name: c.resume.name ?? 'Unknown',
        email: c.resume.email ?? '-',
        phone: c.resume.phone ?? '-',
        status: c.status,
        score: c.finalScore ?? 0,
        createdAt: c.createdAt,
      }))
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
  }, [candidates]);

  const [search, setSearch] = useState('');
  const filtered = data.filter((r) => `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'completed' ? 'green' : s === 'in_progress' ? 'blue' : 'default'}>{s}</Tag> },
    { title: 'Score', dataIndex: 'score', sorter: (a: any, b: any) => a.score - b.score },
    { title: 'Actions', key: 'actions', render: (_: any, r: any) => (
      <Space>
        <Button onClick={() => { setSelectedId(r.id); setActiveCandidate(r.id); }}>View</Button>
        {candidates[r.id]?.status !== 'completed' && (
          <Button type="primary" onClick={() => finalizeCandidate(r.id)}>Finalize</Button>
        )}
      </Space>
    ) },
  ];

  const c = selectedId ? candidates[selectedId] : undefined;

  return (
    <div className="p-4">
      <Card 
        title={
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <span className="theme-text-primary text-xl font-semibold">Interviewer Dashboard</span>
          </div>
        }
        className="theme-bg-glass backdrop-blur-lg theme-border-glass theme-shadow-lg"
        headStyle={{
          background: 'var(--bg-glass)',
          borderBottom: '1px solid var(--border-glass)',
          color: 'var(--text-primary)'
        }}
        bodyStyle={{
          background: 'transparent',
          color: 'var(--text-primary)'
        }}
      >
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input 
              placeholder="Search by name/email/phone" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              size="middle"
              className="flex-1"
              style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          
          <div className="overflow-hidden rounded-lg">
            <Table 
              columns={columns as any} 
              dataSource={filtered} 
              pagination={{ pageSize: 5 }}
              className="glass-table"
            />
          </div>
        </div>
      </Card>

      <Modal 
        open={!!c} 
        width={900} 
        onCancel={() => setSelectedId(undefined)} 
        footer={null} 
        title={
          <div className="flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <span className="theme-text-primary text-xl font-semibold">{c ? c.resume.name ?? 'Candidate' : ''}</span>
          </div>
        }
        className="glass-modal"
      >
        {c && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3 theme-bg-glass rounded-lg">
              <div>
                <Typography.Text className="theme-text-muted text-sm">Email:</Typography.Text>
                <Typography.Text className="theme-text-primary block text-lg">{c.resume.email ?? '-'}</Typography.Text>
              </div>
              <div>
                <Typography.Text className="theme-text-muted text-sm">Phone:</Typography.Text>
                <Typography.Text className="theme-text-primary block text-lg">{c.resume.phone ?? '-'}</Typography.Text>
              </div>
            </div>
            
            {c.summary && (
              <Card 
                size="small" 
                title={
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="theme-text-primary font-medium">AI Summary</span>
                  </div>
                }
                className="theme-bg-glass backdrop-blur-sm theme-border-glass"
                headStyle={{ background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              >
                <Typography.Paragraph className="theme-text-secondary">{c.summary}</Typography.Paragraph>
              </Card>
            )}
            
            <Card 
              size="small" 
              title={
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                    <span className="theme-text-primary font-medium">Interview History</span>
                </div>
              }
              className="theme-bg-glass backdrop-blur-sm theme-border-glass"
              headStyle={{ background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
            >
              <div className="space-y-3">
                {c.questions.map((q, idx) => {
                  const ans = c.answers.find((a) => a.questionId === q.id);
                  return (
                    <div key={q.id} className="p-3 theme-bg-glass rounded-lg theme-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">❓</span>
                        <Typography.Title level={5} className="theme-text-primary mb-0">
                          Q{idx + 1} ({q.difficulty})
                        </Typography.Title>
                      </div>
                      <Typography.Paragraph className="theme-text-secondary mb-2 font-medium">
                        {q.text}
                      </Typography.Paragraph>
                      <Typography.Paragraph className="theme-text-muted mb-2">
                        <strong>Answer:</strong> {ans?.answer ?? '(no answer)'}
                      </Typography.Paragraph>
                      <Space>
                        <Tag color="blue">Score: {ans?.score ?? 0}/10</Tag>
                        <Tag color="green">Time: {ans?.timeTakenSeconds ?? 0}s</Tag>
                        {ans?.autoSubmitted && <Tag color="red">Auto-submitted</Tag>}
                      </Space>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}


