// Popup Entry Point
import '../styles/tailwind.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PopupWithAuth } from './PopupWithAuth';

const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupWithAuth />);
}
