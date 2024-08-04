import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import ShikiHighlighter from 'react-shiki';
import './App.css';

function AyuDarkCodeBlock() {
  const code = `
function AyuDarkCodeBlock() {
  return (
    <ShikiHighlighter
      language="jsx"
      theme="ayu-dark"
      style={{
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
      }}
    >
      {code}
    </ShikiHighlighter>
  );
}
  `;

  return (
    <ShikiHighlighter
      language="jsx"
      theme="ayu-dark"
      style={{
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
      }}
    >
      {code}
    </ShikiHighlighter>
  );
}

function CatppuccinMochaCodeBlock() {
  const code = `
function CatpuccinMochaCodeBlock() {
  return (
    <ShikiHighlighter
      language="jsx"
      theme="ayu-dark"
      showLanguage={false}
      style={{
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
      }}
    >
      {code}
    </ShikiHighlighter>
  );
}
  `;

  return (
    <ShikiHighlighter
      language="jsx"
      theme="catppuccin-mocha"
      showLanguage={false}
      style={{
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
      }}
    >
      {code}
    </ShikiHighlighter>
  );
}
function HoustonCodeBlock() {
  const code = `
function HoustonCodeBlock() {
  return (
    <ShikiHighlighter
      language="jsx"
      theme="ayu-dark"
      showLanguage={false}
      style={{
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
      }}
    >
      {code}
    </ShikiHighlighter>
  );
}
  `;

  return (
    <ShikiHighlighter
      language="jsx"
      theme="houston"
      showLanguage={false}
      style={{
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
      }}
    >
      {code}
    </ShikiHighlighter>
  );
}

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>react-shiki testing</h1>
      <h2>Syntax highlighter component for react using shiki</h2>
      <AyuDarkCodeBlock />
      <CatppuccinMochaCodeBlock />
      <HoustonCodeBlock />
      <div className="card">
        <button
          type="button"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
