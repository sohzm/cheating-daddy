const React = require('react');
const { createElement: h } = React;

function OnboardingView({ onComplete }) {
  const [apiKey, setApiKey] = React.useState(
    localStorage.getItem('apiKey') || ''
  );

  const handleSubmit = () => {
    if (apiKey.trim()) {
      localStorage.setItem('apiKey', apiKey.trim());
      onComplete();
    }
  };

  return h('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      background: 'rgba(0,0,0,0.9)',
      color: '#e5e5e7',
    }
  }, [
    h('h2', { key: 'title', style: { marginBottom: '20px', fontSize: '24px' }}, 
      'Welcome to Cheating Daddy'
    ),
    h('p', { key: 'subtitle', style: { marginBottom: '30px', opacity: 0.7 }},
      'Enter your Gemini API key to get started'
    ),
    h('input', {
      key: 'input',
      type: 'password',
      placeholder: 'Gemini API Key',
      value: apiKey,
      onChange: (e) => setApiKey(e.target.value),
      onKeyPress: (e) => e.key === 'Enter' && handleSubmit(),
      style: {
        width: '300px',
        padding: '12px',
        marginBottom: '16px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
      }
    }),
    h('button', {
      key: 'btn',
      onClick: handleSubmit,
      disabled: !apiKey.trim(),
      style: {
        padding: '12px 32px',
        background: apiKey.trim() ? '#007aff' : 'rgba(255,255,255,0.2)',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
        fontSize: '14px',
        fontWeight: 500,
      }
    }, 'Continue')
  ]);
}

module.exports = OnboardingView;
