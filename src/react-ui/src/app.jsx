import React, { useEffect, useState } from "react";

export default function App() {
  const [config, setConfig] = useState({});
  const [stealth, setStealth] = useState("");

  useEffect(() => {
    window.electronAPI?.invoke("get-config").then((res) => {
      if (res.success) {
        setConfig(res.config);
        setStealth(res.config.stealthLevel);
      }
    });
  }, []);

  const handleStealthChange = async (level) => {
    const res = await window.electronAPI?.invoke("set-stealth-level", level);
    if (res.success) setStealth(res.config.stealthLevel);
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>🧠 Cheating Daddy — React Edition</h1>
      <p>Frontend migrated from Lit → React.</p>

      <h3>Current Config</h3>
      <pre>{JSON.stringify(config, null, 2)}</pre>

      <div style={{ marginTop: 20 }}>
        <h3>Stealth Level: {stealth}</h3>
        {["visible", "balanced", "ultra"].map((lvl) => (
          <button
            key={lvl}
            style={{
              margin: "5px",
              padding: "8px 16px",
              background: stealth === lvl ? "#4caf50" : "#ccc",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
            onClick={() => handleStealthChange(lvl)}
          >
            {lvl}
          </button>
        ))}
      </div>
    </div>
  );
}
