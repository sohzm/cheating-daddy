const React = require('react');
const { createElement: h } = React;

function MainView({ status, response, onSendMessage }) {
  const [message, setMessage] = React.useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return h('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(0,0,0,0.8)',
      color: '#e5e5e7',
    }
  }, [
    h('div', {
      key: 'status',
      style: {
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontSize: '13px',
        fontWeight: 500,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }
    }, [
      h('span', { key: 'label' }, 'Cheating Daddy'),
      h('span', { 
        key: 'status-text',
        style: {
          color: status === 'Live' ? '#34c759' : '#ff9500',
          fontSize: '12px',
        }
      }, `● ${status}`)
    ]),
    
    h('div', {
      key: 'response',
      style: {
        flex: 1,
        overflow: 'auto',
        padding: '16px',
      }
    }, response ? h('div', {
      style: {
        background: 'rgba(255,255,255,0.05)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
      },
      dangerouslySetInnerHTML: { __html: window.marked?.parse(response) || response }
    }) : h('div', { 
      style: { 
        opacity: 0.5,
        textAlign: 'center',
        marginTop: '40px',
      }
    }, 'AI responses will appear here...')),
    
    h('div', {
      key: 'input',
      style: {
        padding: '12px',
        background: 'rgba(0,0,0,0.9)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '8px',
      }
    }, [
      h('input', {
        key: 'text',
        type: 'text',
        placeholder: 'Ask a question... (Ctrl+Enter for screenshot)',
        value: message,
        onChange: (e) => setMessage(e.target.value),
        onKeyPress: (e) => e.key === 'Enter' && handleSend(),
        style: {
          flex: 1,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '14px',
          outline: 'none',
        }
      }),
      h('button', {
        key: 'send',
        onClick: handleSend,
        disabled: !message.trim(),
        style: {
          padding: '10px 20px',
          background: message.trim() ? '#007aff' : 'rgba(255,255,255,0.2)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: message.trim() ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: 500,
        }
      }, 'Send')
    ])
  ]);
}

module.exports = MainView;
