import React, { useState } from "react";
export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("idle");
  const start = () => {
    if (window.electronAPI?.sendMessage) {
      window.electronAPI.sendMessage("start-session", { apiKey });
    }
    setStatus("running");
  };
  const stop = () => setStatus("stopped");
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Cheating Daddy (React)</h1>
      <div style={{ marginTop: 12 }}>
        <label>
          API Key:
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={start}>Start</button>
        <button onClick={stop} style={{ marginLeft: 8 }}>
          Stop
        </button>
      </div>
      <p style={{ marginTop: 16 }}>
        <strong>Status:</strong> {status}
      </p>
    </div>
  );
}