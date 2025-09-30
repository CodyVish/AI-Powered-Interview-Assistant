import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Flex, Input, Modal, Progress, Typography, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useAppStore } from '../stores/useAppStore';
import { extractTextFromDocx, extractTextFromPdf, parseResumeFields } from '../utils/resume';

const { Dragger } = Upload;

export default function IntervieweePage() {
  const { activeCandidateId, candidates, createCandidateFromResume, upsertResumeFields, startInterview, submitAnswer, nextQuestion, finalizeCandidate, resetAll, appendMessage } = useAppStore();
  const candidate = activeCandidateId ? candidates[activeCandidateId] : undefined;
  const [answer, setAnswer] = useState('');
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState<number | undefined>(candidate?.remainingSeconds);
  const [infoInput, setInfoInput] = useState('');

  useEffect(() => {
    const unfinished = Object.values(candidates).find((c) => c.status === 'paused' || (c.status === 'in_progress' && c.currentQuestionIndex >= 0));
    if (unfinished) setWelcomeVisible(true);
  }, []);

  useEffect(() => {
    if (!candidate || candidate.status !== 'in_progress') return;
    const q = candidate.questions[candidate.currentQuestionIndex];
    const start = candidate.currentQuestionStartTs ?? Date.now();
    const baseRemaining = candidate.remainingSeconds ?? q.timeLimitSeconds;
    const computeRemaining = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, baseRemaining - elapsed);
      setRemaining(left);
      if (left === 0) {
        const taken = baseRemaining;
        submitAnswer(candidate.id, answer, true, taken);
        if (candidate.currentQuestionIndex + 1 >= candidate.questions.length) {
          finalizeCandidate(candidate.id);
        } else {
          nextQuestion(candidate.id);
          setAnswer('');
        }
      }
    };
    computeRemaining();
    timerRef.current = window.setInterval(computeRemaining, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [candidate?.id, candidate?.status, candidate?.currentQuestionIndex]);

  const beforeUpload = async (file: File) => {
    // Create candidate immediately so UI shows missing fields even if parsing fails
    const newId = createCandidateFromResume({});
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let text = '';
      if (ext === 'pdf') text = await extractTextFromPdf(file);
      else if (ext === 'docx') text = await extractTextFromDocx(file);
      else throw new Error('Invalid file. Only PDF or DOCX supported.');
      const fields = parseResumeFields(text);
      upsertResumeFields(newId, fields);
      message.success('Resume parsed. Please confirm missing fields.');
    } catch (e: any) {
      message.warning('Could not auto-extract details. Please fill Name, Email, Phone.');
    }
    return false;
  };

  const missing = useMemo(() => {
    const c = candidate;
    if (!c) return ['name', 'email', 'phone'].slice();
    return ['name', 'email', 'phone'].filter((k) => !(c.resume as any)[k]);
  }, [candidate?.resume]);

  const canStart = missing.length === 0 && !!candidate && candidate.status === 'collecting_info';

  function handleStart() {
    if (!candidate) return;
    startInterview(candidate.id);
  }

  // Conversational missing-fields collection
  const currentMissingField = missing[0];

  function validateAndSaveField() {
    if (!candidate || !currentMissingField) return;
    const val = infoInput.trim();
    if (!val) return;
    const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const PHONE_REGEX = /(\+\d{1,3}[- ]?)?\d{10,12}/;
    if (currentMissingField === 'email' && !EMAIL_REGEX.test(val)) {
      message.error('Please enter a valid email');
      return;
    }
    if (currentMissingField === 'phone' && !PHONE_REGEX.test(val)) {
      message.error('Please enter a valid phone number');
      return;
    }
    appendMessage(candidate.id, { role: 'user', content: val });
    upsertResumeFields(candidate.id, { [currentMissingField]: val } as any);
    setInfoInput('');
    const remainingAfter = ['name','email','phone'].filter((k) => k !== currentMissingField && !((candidate.resume as any)[k]));
    if (remainingAfter.length === 0) {
      appendMessage(candidate.id, { role: 'assistant', content: 'Thanks! All details received. Click Start Interview when ready.' });
    } else {
      const nextField = remainingAfter[0];
      const prompt = nextField === 'name' ? 'Please provide your full name.' : nextField === 'email' ? 'Please provide your email address.' : 'Please provide your phone number.';
      appendMessage(candidate.id, { role: 'assistant', content: prompt });
    }
  }

  function handleSubmit() {
    if (!candidate) return;
    const q = candidate.questions[candidate.currentQuestionIndex];
    const taken = (q.timeLimitSeconds - (remaining ?? q.timeLimitSeconds));
    submitAnswer(candidate.id, answer, false, taken);
    if (candidate.currentQuestionIndex + 1 >= candidate.questions.length) {
      finalizeCandidate(candidate.id);
    } else {
      nextQuestion(candidate.id);
      setAnswer('');
    }
  }

  return (
    <div className="p-4">
      <Card 
        title={
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <span className="theme-text-primary text-xl font-semibold">Interview Session</span>
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
        {!candidate && (
          <div className="text-center py-8">
            <div className="mb-4">
              <InboxOutlined className="text-5xl text-blue-400 mb-3" />
              <h3 className="text-xl font-semibold theme-text-primary mb-2">Upload Your Resume</h3>
              <p className="theme-text-secondary">Get started by uploading your resume in PDF or DOCX format</p>
            </div>
            <Dragger 
              multiple={false} 
              beforeUpload={beforeUpload} 
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="max-w-md mx-auto"
            >
              <p className="ant-upload-drag-icon text-4xl"><InboxOutlined /></p>
              <p className="ant-upload-text text-lg">Click or drag resume to upload (PDF/DOCX)</p>
            </Dragger>
          </div>
        )}

        {candidate && candidate.status === 'collecting_info' && (
          <Flex vertical gap={6}>
            <Card 
              size="small" 
              title={
                <div className="flex items-center gap-2">
                  <span className="text-lg">💬</span>
                    <span className="theme-text-primary font-medium">Chat Session</span>
                </div>
              }
              className="theme-bg-glass backdrop-blur-sm theme-border-glass"
              headStyle={{ background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
            >
              <div className="chat-scroll max-h-48 overflow-y-auto theme-bg-glass rounded-lg p-3">
                {candidate.messages.map((m) => (
                  <div key={m.id} className="mb-3 p-3 rounded-lg theme-bg-glass">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-blue-300">
                        {m.role === 'assistant' ? '🤖 Assistant' : m.role === 'user' ? '👤 You' : '⚙️ System'}
                      </span>
                    </div>
                    <p className="theme-text-secondary text-sm">{m.content}</p>
                  </div>
                ))}
              </div>
            </Card>
            
            {!candidate.messages.length && (
              <Button 
                type="primary" 
                size="middle"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0"
                onClick={() => {
                  const prompt = currentMissingField === 'name' ? 'Please provide your full name.' : currentMissingField === 'email' ? 'Please provide your email address.' : 'Please provide your phone number.';
                  appendMessage(candidate.id, { role: 'assistant', content: prompt });
                }}
              >
                🚀 Begin Conversation
              </Button>
            )}
            
            {currentMissingField && (
              <div className="space-y-3">
                <Input 
                  placeholder={`Enter your ${currentMissingField}`} 
                  value={infoInput} 
                  onChange={(e) => setInfoInput(e.target.value)} 
                  onPressEnter={validateAndSaveField}
                  size="middle"
                  className="w-full"
                  style={{
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Button 
                  type="primary" 
                  size="middle"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0"
                  onClick={validateAndSaveField}
                >
                  📤 Send
                </Button>
              </div>
            )}
            
            <Button 
              type="primary" 
              size="middle"
              disabled={!canStart} 
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 border-0 disabled:opacity-50"
            >
              🎯 Start Interview
            </Button>
          </Flex>
        )}

        {candidate && candidate.status === 'in_progress' && candidate.currentQuestionIndex >= 0 && (
          <Flex vertical gap={6}>
            <Card 
              size="small" 
              title={
                <div className="flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <span className="text-white font-medium">Interview Chat</span>
                </div>
              }
              className="theme-bg-glass backdrop-blur-sm theme-border-glass"
              headStyle={{ background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
            >
              <div className="chat-scroll max-h-48 overflow-y-auto theme-bg-glass rounded-lg p-3">
                {candidate.messages.map((m) => (
                  <div key={m.id} className="mb-3 p-3 rounded-lg theme-bg-glass">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-blue-300">
                        {m.role === 'assistant' ? '🤖 Assistant' : m.role === 'user' ? '👤 You' : '⚙️ System'}
                      </span>
                    </div>
                    <p className="theme-text-secondary text-sm">{m.content}</p>
                  </div>
                ))}
              </div>
            </Card>
            
            <div className="theme-bg-glass rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="theme-text-secondary text-lg font-medium">
                  Question {candidate.currentQuestionIndex + 1} / {candidate.questions.length}
                </span>
                <span className="theme-text-muted text-sm">
                  Time left: <span className="font-bold theme-text-primary">{remaining}s</span>
                </span>
              </div>
              
              <Typography.Title level={4} className="theme-text-primary mb-3">
                {candidate.questions[candidate.currentQuestionIndex].text}
              </Typography.Title>
              
              <Progress 
                percent={Math.round(((candidate.questions[candidate.currentQuestionIndex].timeLimitSeconds - (remaining ?? 0)) / candidate.questions[candidate.currentQuestionIndex].timeLimitSeconds) * 100)} 
                showInfo 
                strokeColor={{
                  '0%': '#3b82f6',
                  '100%': '#10b981',
                }}
                className="mb-3"
              />
              
              <Input.TextArea 
                autoSize={{ minRows: 4 }} 
                value={answer} 
                onChange={(e) => setAnswer(e.target.value)} 
                placeholder="Type your answer here..."
                className="mb-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white'
                }}
              />
              
              <Button 
                type="primary" 
                size="middle"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0"
                onClick={handleSubmit}
              >
                📝 Submit Answer
              </Button>
            </div>
          </Flex>
        )}

        {candidate && candidate.status === 'completed' && (
          <div className="text-center py-6">
            <div className="mb-4">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-2xl font-bold theme-text-primary mb-2">Interview Completed!</h3>
              <p className="theme-text-secondary">Great job! Switch to the Interviewer tab to view your detailed results and AI analysis.</p>
            </div>
            <Button 
              type="primary" 
              size="middle"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0"
              onClick={resetAll}
            >
              🔄 Start New Interview
            </Button>
          </div>
        )}
      </Card>

      <Modal 
        open={welcomeVisible} 
        onCancel={() => setWelcomeVisible(false)} 
        onOk={() => setWelcomeVisible(false)} 
        title="Welcome Back"
        className="glass-modal"
      >
        <Typography.Paragraph className="theme-text-secondary">
          You have an unfinished session. Your progress and timers are restored.
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}


