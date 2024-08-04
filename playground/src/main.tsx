import React from 'react';
// biome-ignore lint/style/useNamingConvention: React naming convention
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(
  document.getElementById('root') ?? document.body
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
