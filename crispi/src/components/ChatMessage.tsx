import { Typography } from 'antd';

export default function ChatMessage({ role, content }: { role: 'assistant' | 'user' | 'system'; content: string }) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ring-1 ${
        isUser ? 'bg-brand text-white ring-brand-dark' : isAssistant ? 'bg-slate-50 text-slate-800 ring-slate-200' : 'bg-amber-50 text-amber-900 ring-amber-200'
      }`}>
        <Typography.Text className={`block text-xs opacity-70 ${isUser ? 'text-white' : 'text-slate-600'}`}>
          {isAssistant ? 'Assistant' : isUser ? 'You' : 'System'}
        </Typography.Text>
        <Typography.Paragraph style={{ marginBottom: 0 }}>{content}</Typography.Paragraph>
      </div>
    </div>
  );
}








