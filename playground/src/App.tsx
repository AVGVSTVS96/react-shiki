// import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import shikiLogo from './assets/shikiLogo.svg';
import { HighlightCodeBlocks } from './CodeTest';

function App() {
  // const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vitejs.dev">
          <img src={viteLogo} className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://react.dev">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://shiki.style/">
          <img src={shikiLogo} className="logo shiki" alt="Shiki logo" />
        </a>
      </div>
      <h1>
        🎨{' '}
        <a href="https://github.com/avgvstvs96/react-shiki">
          react-shiki
        </a>
      </h1>{' '}
      <h2>
        Syntax highlighter component for react using{' '}
        <a href="https://shiki.matsu.io/">Shiki</a>
      </h2>
      <HighlightCodeBlocks />
      <div style={{ marginBlock: '10rem' }} />
      <footer style={{ opacity: '55%', fontSize: '14px' }}>
        Made Bassim Shahidy from New York, USA
      </footer>
      {/* <div className="card">
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
      </p> */}
    </>
  );
}

export default App;
