export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ResumeFields {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: number;
}

export interface Question {
  id: string;
  text: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
}

export interface AnswerRecord {
  questionId: string;
  answer: string;
  timeTakenSeconds: number;
  autoSubmitted: boolean;
  score: number; // 0-10 per question
}

export interface Candidate {
  id: string;
  resume: ResumeFields;
  createdAt: number;
  updatedAt: number;
  status: 'collecting_info' | 'in_progress' | 'completed' | 'paused';
  messages: ChatMessage[];
  questions: Question[];
  answers: AnswerRecord[];
  currentQuestionIndex: number; // -1 before starting
  currentQuestionStartTs?: number;
  remainingSeconds?: number; // for resume
  finalScore?: number; // 0-60 (6 * 10)
  summary?: string;
}

export interface AppStateSnapshot {
  activeCandidateId?: string;
  candidates: Record<string, Candidate>;
}

