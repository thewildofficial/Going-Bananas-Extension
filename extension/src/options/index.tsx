// Options Entry Point
import '../styles/tailwind.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { OptionsWithAuth } from './OptionsWithAuth';

const container = document.getElementById('options-root');
if (container) {
  const root = createRoot(container);
  root.render(<OptionsWithAuth />);
}
