import React from 'react';
import ReactDOM from 'react-dom/client';
import AIAgentService from '../index';
import './styles/globals.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AIAgentService />
  </React.StrictMode>,
);
