import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid/non-secure';
import type { AppStateSnapshot, Candidate, ChatMessage, Question, ResumeFields, Difficulty } from '../types';
import { generateQuestionsAI, scoreAnswerAI } from '../utils/ai';

// retained for backward compatibility if needed

async function generateQuestions(name?: string): Promise<Question[]> {
  return await generateQuestionsAI(name);
}

function scoreAnswer(answer: string, difficulty: Difficulty): number {
  if (!answer || answer.trim().length < 10) return 2;
  const lengthScore = Math.min(6, Math.floor(answer.trim().length / 60));
  const diffBonus = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 1 : 0;
  return Math.min(10, 2 + lengthScore + diffBonus);
}

type Store = AppStateSnapshot & {
  createCandidateFromResume: (fields: ResumeFields) => string;
  appendMessage: (candidateId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setActiveCandidate: (candidateId: string | undefined) => void;
  startInterview: (candidateId: string) => void;
  submitAnswer: (candidateId: string, answer: string, autoSubmitted: boolean, timeTakenSeconds: number) => void;
  nextQuestion: (candidateId: string) => void;
  finalizeCandidate: (candidateId: string) => void;
  upsertResumeFields: (candidateId: string, fields: ResumeFields) => void;
  pauseSession: (candidateId: string, remainingSeconds: number) => void;
  resetAll: () => void;
};

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      activeCandidateId: undefined,
      candidates: {},

      createCandidateFromResume: (fields) => {
        const id = nanoid();
        const now = Date.now();
        const candidate: Candidate = {
          id,
          resume: fields,
          createdAt: now,
          updatedAt: now,
          status: 'collecting_info',
          messages: [],
          questions: [],
          answers: [],
          currentQuestionIndex: -1,
        };
        set((s) => ({ candidates: { ...s.candidates, [id]: candidate }, activeCandidateId: id }));
        return id;
      },

      appendMessage: (candidateId, message) => {
        set((s) => {
          const c = s.candidates[candidateId];
          if (!c) return s;
          const next: Candidate = {
            ...c,
            updatedAt: Date.now(),
            messages: [...c.messages, { id: nanoid(), timestamp: Date.now(), ...message }],
          };
          return { candidates: { ...s.candidates, [candidateId]: next } };
        });
      },

      setActiveCandidate: (candidateId) => set({ activeCandidateId: candidateId }),

      startInterview: (candidateId) => {
        (async () => {
          const s = get();
          const c = s.candidates[candidateId];
          if (!c) return;
          const qs = await generateQuestions(c.resume.name);
          set(() => {
            const introMsg: ChatMessage = { id: nanoid(), role: 'assistant', content: 'Starting interview. You will get 6 questions with timers. Good luck!', timestamp: Date.now() };
            const qMsg: ChatMessage = { id: nanoid(), role: 'assistant', content: qs[0].text, timestamp: Date.now() };
            const next: Candidate = {
              ...c,
              status: 'in_progress',
              questions: qs,
              currentQuestionIndex: 0,
              currentQuestionStartTs: Date.now(),
              remainingSeconds: qs[0].timeLimitSeconds,
              messages: [...c.messages, introMsg, qMsg],
              updatedAt: Date.now(),
            };
            return { candidates: { ...s.candidates, [candidateId]: next } } as any;
          });
        })();
      },

      submitAnswer: (candidateId, answer, autoSubmitted, timeTakenSeconds) => {
        set((s) => {
          const c = s.candidates[candidateId];
          if (!c) return s;
          const q = c.questions[c.currentQuestionIndex];
          // initial heuristic; will be refined asynchronously via AI if available
          let score = scoreAnswer(answer, q.difficulty);
          const answers = [
            ...c.answers,
            {
              questionId: q.id,
              answer,
              timeTakenSeconds,
              autoSubmitted,
              score,
            },
          ];
          const userMsg: ChatMessage = { id: nanoid(), role: 'user', content: answer && answer.trim().length ? answer : '(no answer)', timestamp: Date.now() };
          const ackMsg: ChatMessage = { id: nanoid(), role: 'assistant', content: 'Answer received.', timestamp: Date.now() };
          const next: Candidate = { ...c, answers, messages: [...c.messages, userMsg, ackMsg], updatedAt: Date.now() };
          return { candidates: { ...s.candidates, [candidateId]: next } };
        });
        // Asynchronously refine score using AI without blocking UI
        (async () => {
          const s2 = get();
          const cand = s2.candidates[candidateId];
          if (!cand) return;
          const q = cand.questions[cand.currentQuestionIndex];
          const aiScore = await scoreAnswerAI(answer, q.difficulty);
          set((s3) => {
            const c3 = s3.candidates[candidateId];
            if (!c3) return s3;
            const updatedAnswers = c3.answers.map((a) => a.questionId === q.id ? { ...a, score: aiScore } : a);
            const judgeMsg: ChatMessage = { id: nanoid(), role: 'assistant', content: `Judged: ${aiScore}/10`, timestamp: Date.now() };
            return { candidates: { ...s3.candidates, [candidateId]: { ...c3, answers: updatedAnswers, messages: [...c3.messages, judgeMsg], updatedAt: Date.now() } } };
          });
        })();
      },

      nextQuestion: (candidateId) => {
        set((s) => {
          const c = s.candidates[candidateId];
          if (!c) return s;
          const nextIndex = c.currentQuestionIndex + 1;
          if (nextIndex >= c.questions.length) return s;
          const qMsg: ChatMessage = { id: nanoid(), role: 'assistant', content: c.questions[nextIndex].text, timestamp: Date.now() };
          const next: Candidate = {
            ...c,
            currentQuestionIndex: nextIndex,
            currentQuestionStartTs: Date.now(),
            remainingSeconds: c.questions[nextIndex].timeLimitSeconds,
            messages: [...c.messages, qMsg],
            updatedAt: Date.now(),
          };
          return { candidates: { ...s.candidates, [candidateId]: next } };
        });
      },

      finalizeCandidate: (candidateId) => {
        set((s) => {
          const c = s.candidates[candidateId];
          if (!c) return s;
          const finalScore = c.answers.reduce((acc, a) => acc + a.score, 0);
          const summary = `Candidate ${c.resume.name ?? 'Unknown'} scored ${finalScore}/60. Strengths: ${finalScore > 40 ? 'Solid fundamentals' : 'Basic understanding'}. Areas to improve: ${finalScore < 30 ? 'Depth in system design and performance' : 'Advanced topics'}.`;
          const next: Candidate = { ...c, status: 'completed', finalScore, summary, updatedAt: Date.now() };
          return { candidates: { ...s.candidates, [candidateId]: next } };
        });
      },

      upsertResumeFields: (candidateId, fields) => {
        set((s) => {
          const c = s.candidates[candidateId];
          if (!c) return s;
          const next: Candidate = { ...c, resume: { ...c.resume, ...fields }, updatedAt: Date.now() };
          return { candidates: { ...s.candidates, [candidateId]: next } };
        });
      },

      pauseSession: (candidateId, remainingSeconds) => {
        set((s) => {
          const c = s.candidates[candidateId];
          if (!c) return s;
          const next: Candidate = { ...c, status: 'paused', remainingSeconds, updatedAt: Date.now() };
          return { candidates: { ...s.candidates, [candidateId]: next } };
        });
      },

      resetAll: () => set({ activeCandidateId: undefined, candidates: {} }),
    }),
    {
      name: 'crispi-state',
      version: 1,
      partialize: (s) => ({ activeCandidateId: s.activeCandidateId, candidates: s.candidates }),
    }
  )
);


