import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import './index.css';

ReactDOM.createRoot(
  document.querySelector('#root') ?? document.body
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
