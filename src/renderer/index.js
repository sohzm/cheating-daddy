const React = require('react');
const { createRoot } = require('react-dom/client');
const { createElement: h } = React;

// Bridge object used by renderer.js
const appApi = {
  setStatus: () => {},
  setResponse: () => {},
  getCurrentView: () => 'onboarding',
  getLayoutMode: () => 'normal',
  handleStart: () => {},
  mountApi(api) {
    this.setStatus = api.setStatus;
    this.setResponse = api.setResponse;
    this.getCurrentView = api.getCurrentView;
    this.getLayoutMode = api.getLayoutMode;
    this.handleStart = api.handleStart;
  },
};
window.__CHEATING_APP_API__ = appApi;

// OnboardingView: API key setup
function OnboardingView({ onComplete }) {
  const [apiKey, setApiKey] = React.useState(localStorage.getItem('apiKey') || '');

  const handleSubmit = () => {
    if (apiKey.trim()) {
      localStorage.setItem('apiKey', apiKey.trim());
      onComplete();
    }
  };

  return h('div', {
    style: {
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', padding: '20px',
      background: 'rgba(0,0,0,0.9)', color: '#e5e5e7',
    }
  }, [
    h('h2', { key: 'title', style: { marginBottom: '20px', fontSize: '24px' }}, 'Welcome to Cheating Daddy'),
    h('p', { key: 'subtitle', style: { marginBottom: '30px', opacity: 0.7 }}, 'Enter your Gemini API key'),
    h('input', {
      key: 'input', type: 'password', placeholder: 'Gemini API Key', value: apiKey,
      onChange: (e) => setApiKey(e.target.value),
      onKeyPress: (e) => e.key === 'Enter' && handleSubmit(),
      style: {
        width: '300px', padding: '12px', marginBottom: '16px',
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none',
      }
    }),
    h('button', {
      key: 'btn', onClick: handleSubmit, disabled: !apiKey.trim(),
      style: {
        padding: '12px 32px', background: apiKey.trim() ? '#007aff' : 'rgba(255,255,255,0.2)',
        color: '#fff', border: 'none', borderRadius: '6px',
        cursor: apiKey.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500,
      }
    }, 'Continue')
  ]);
}

// Minimal MainView: shows last response + input
function MainView({ status, response, onSendMessage }) {
  const [message, setMessage] = React.useState('');

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      onSendMessage(message);
      setMessage('');
    }
  };

  return h('div', {
    style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.8)', color: '#e5e5e7' }
  }, [
    // Status bar
    h('div', {
      key: 'status',
      style: {
        padding: '12px 16px', background: 'rgba(0,0,0,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontSize: '13px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }
    }, [
      h('span', { key: 'label' }, 'Cheating Daddy'),
      h('span', { key: 'status-text', style: { color: status === 'Live' ? '#34c759' : '#ff9500', fontSize: '12px' }}, `● ${status}`)
    ]),

    // Last AI response
    h('div', {
      key: 'resp',
      style: {
        flex: 1,
        padding: '16px',
        overflow: 'auto',
      }
    }, [
      h('div', { key: 'user-label', style: { fontWeight: 600, marginBottom: '4px' }}, 'Last AI Response:'),
      h('pre', {
        key: 'resp-text',
        style: {
          whiteSpace: 'pre-wrap',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          minHeight: '40px',
        }
      }, response || '(no response yet)')
    ]),

    // Input area
    h('div', {
      key: 'input',
      style: { padding: '12px', background: 'rgba(0,0,0,0.9)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px' }
    }, [
      h('input', {
        key: 'text', type: 'text', placeholder: 'Ask a question...', value: message,
        onChange: (e) => setMessage(e.target.value),
        onKeyPress: (e) => e.key === 'Enter' && handleSend(),
        style: {
          flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none',
        }
      }),
      h('button', {
        key: 'send', onClick: handleSend, disabled: !message.trim(),
        style: {
          padding: '10px 20px', background: message.trim() ? '#007aff' : 'rgba(255,255,255,0.2)',
          color: '#fff', border: 'none', borderRadius: '6px',
          cursor: message.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500,
        }
      }, 'Send')
    ])
  ]);
}

// App: manages view, status, response
function App({ appApi }) {
  const [state, setState] = React.useState({
    currentView: localStorage.getItem('apiKey') ? 'main' : 'onboarding',
    status: 'Idle',
    response: '',
  });

  const handleStart = React.useCallback(() => {
    console.log('handleStart called - transitioning to main view');
    setState(s => ({ ...s, currentView: 'main' }));
    if (window.cheddar) {
      console.log('Starting Gemini from App.handleStart');
      window.cheddar.initializeGemini();
      window.cheddar.startCapture(
        localStorage.getItem('screenshotInterval') || 5,
        localStorage.getItem('imageQuality') || 'medium'
      );
    }
  }, []);

  React.useEffect(() => {
    appApi.mountApi({
      setStatus: text => {
        console.log('Status update (App):', text);
        setState(s => ({ ...s, status: text }));
      },
      setResponse: response => {
        console.log('Response update (App):', response);
        setState(s => ({ ...s, response }));
      },
      getCurrentView: () => state.currentView,
      getLayoutMode: () => 'normal',
      handleStart,
    });
  }, [appApi, state.currentView, handleStart]);

  // Auto-start Gemini if we land directly in main with API key
  React.useEffect(() => {
    if (state.currentView === 'main' && window.cheddar) {
      console.log('Auto-starting Gemini session (App) because API key exists');
      window.cheddar.initializeGemini();
      window.cheddar.startCapture(
        localStorage.getItem('screenshotInterval') || 5,
        localStorage.getItem('imageQuality') || 'medium'
      );
    }
  }, [state.currentView]);

  if (state.currentView === 'onboarding') {
    return h(OnboardingView, { onComplete: handleStart });
  }

  return h(MainView, {
    status: state.status,
    response: state.response,
    onSendMessage: text => {
      console.log('onSendMessage called with:', text);
      if (window.cheddar && window.cheddar.sendTextMessage) {
        window.cheddar.sendTextMessage(text);
      } else {
        console.error('cheddar.sendTextMessage not available');
      }
    }
  });
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(h(App, { appApi }));
