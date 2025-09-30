# React + TypeScript + Vite

AI-Powered Interview Assistant (Crisp)
=====================================

A React + TypeScript app that simulates an AI-powered interview with two tabs: Interviewee (chat) and Interviewer (dashboard). It persists all data locally so you can pause/resume and recover progress after refresh.

Tech
- React + Vite + TypeScript
- Zustand (state + persistence)
- Ant Design (UI)
- pdfjs-dist + mammoth (resume parsing for PDF/DOCX)

Features
- Resume upload (PDF/DOCX) and extraction of Name/Email/Phone
- Missing fields prompt before interview starts
- Timed interview: 6 questions (2 easy, 2 medium, 2 hard)
- Auto-submit when time is up, per-question timers restored on refresh
- Scoring and final AI-style summary
- Interviewer dashboard with search/sort and detailed history
- Welcome Back modal for unfinished sessions

Getting Started
1. Install Node 22.12+ or 20.19+. Current Node 22.11.0 prints a warning with Vite.
2. Install deps:
```bash
npm install
```
3. Run dev server:
```bash
npm run dev
```
4. Build:
```bash
npm run build
```
