import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // You can remove StrictMode to ignore certain warnings during development
  <App />
);

// Optional: Measure performance in your app
reportWebVitals();
