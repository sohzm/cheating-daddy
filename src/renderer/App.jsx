import React, { useEffect, useState, useCallback } from 'react';

function App({ appApi }) {
  const [currentView, setCurrentView] = useState('onboarding');
  const [layoutMode, setLayoutMode] = useState('normal');
  const [status, setStatus] = useState('idle');
  const [response, setResponse] = useState(null);

  const handleStart = useCallback(() => {
    setCurrentView('main');
    if (window.cheddar) {
      window.cheddar.initializeGemini();
      window.cheddar.startCapture(
        localStorage.getItem('screenshotInterval') || 5,
        localStorage.getItem('imageQuality') || 'medium'
      );
    }
  }, []);
  

  useEffect(() => {
    appApi.mountApi({
      setStatus,
      setResponse,
      getCurrentView: () => currentView,
      getLayoutMode: () => layoutMode,
      handleStart,
    });
  }, [appApi, currentView, layoutMode, handleStart]);

  // TEMP: minimal visible UI so you see something
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color: '#e5e5e7',
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        fontSize: '14px',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 600 }}>
        Cheating Daddy (React Shell)
      </div>
      <div style={{ marginBottom: '8px' }}>
        View: {currentView} | Status: {status}
      </div>
      <button
        onClick={handleStart}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: '#007aff',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Start Session
      </button>
      {response && (
        <pre
          style={{
            marginTop: '12px',
            maxHeight: '200px',
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '8px',
          }}
        >
          {response}
        </pre>
      )}
    </div>
  );
}

export default App;
