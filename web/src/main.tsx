import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SharedBoard } from './components/SharedBoard';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root 요소를 찾을 수 없습니다.');

const shareId = new URLSearchParams(window.location.search).get('share');

createRoot(root).render(
  <StrictMode>{shareId ? <SharedBoard shareId={shareId} /> : <App />}</StrictMode>,
);
