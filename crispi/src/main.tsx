import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAppStore } from './stores/useAppStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Pause on unload to preserve remaining time precisely
window.addEventListener('beforeunload', () => {
  const { activeCandidateId, candidates, pauseSession } = useAppStore.getState() as any;
  if (!activeCandidateId) return;
  const c = candidates[activeCandidateId];
  if (!c || c.status !== 'in_progress') return;
  if (typeof c.currentQuestionStartTs !== 'number') return;
  const q = c.questions[c.currentQuestionIndex];
  const elapsed = Math.floor((Date.now() - c.currentQuestionStartTs) / 1000);
  const remaining = Math.max(0, (c.remainingSeconds ?? q.timeLimitSeconds) - elapsed);
  pauseSession(c.id, remaining);
});
