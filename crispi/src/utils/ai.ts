import type { Difficulty, Question } from '../types';

const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY as string | undefined;

const DIFFICULTY_TIME: Record<Difficulty, number> = {
  easy: 20,
  medium: 60,
  hard: 120,
};

async function openAiChat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
      }),
    });
    const json = await resp.json();
    return json?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function generateQuestionsAI(candidateName?: string): Promise<Question[]> {
  const system = { role: 'system' as const, content: 'You generate concise technical interview questions.' };
  const user = { role: 'user' as const, content: `Create 6 full-stack (React/Node) questions: 2 easy, 2 medium, 2 hard. Output as JSON array of {text, difficulty} with difficulty in [easy, medium, hard]. Keep questions short. Candidate: ${candidateName ?? 'N/A'}.` };
  const content = await openAiChat([system, user]);
  if (content) {
    try {
      const arr = JSON.parse(content) as Array<{ text: string; difficulty: Difficulty }>;
      return arr.slice(0, 6).map((q) => ({ id: crypto.randomUUID(), text: q.text, difficulty: q.difficulty, timeLimitSeconds: DIFFICULTY_TIME[q.difficulty] }));
    } catch {
      // fallthrough to heuristic
    }
  }
  // Heuristic fallback
  const fallback: Array<{ text: string; difficulty: Difficulty }> = [
    { text: 'What is the virtual DOM and why is it useful in React?', difficulty: 'easy' },
    { text: 'Explain state vs props with a simple example.', difficulty: 'easy' },
    { text: 'Design a REST API for tasks in Node/Express. What routes?', difficulty: 'medium' },
    { text: 'How do you handle performance issues in large React lists?', difficulty: 'medium' },
    { text: 'Describe Node.js event loop: macrotasks vs microtasks with examples.', difficulty: 'hard' },
    { text: 'How would you implement JWT auth with refresh tokens and RBAC?', difficulty: 'hard' },
  ];
  return fallback.map((q) => ({ id: crypto.randomUUID(), text: q.text, difficulty: q.difficulty, timeLimitSeconds: DIFFICULTY_TIME[q.difficulty] }));
}

export async function scoreAnswerAI(answer: string, difficulty: Difficulty): Promise<number> {
  const system = { role: 'system' as const, content: 'Score answers from 0-10 considering correctness, clarity, and depth. Respond ONLY with a number.' };
  const user = { role: 'user' as const, content: `Difficulty: ${difficulty}. Answer: ${answer}` };
  const content = await openAiChat([system, user]);
  if (content) {
    const match = content.match(/\d+(?:\.\d+)?/);
    if (match) {
      const n = Math.max(0, Math.min(10, Number(match[0])));
      if (!Number.isNaN(n)) return n;
    }
  }
  // Fallback heuristic
  if (!answer || answer.trim().length < 10) return 2;
  const lengthScore = Math.min(6, Math.floor(answer.trim().length / 60));
  const diffBonus = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 1 : 0;
  return Math.min(10, 2 + lengthScore + diffBonus);
}


