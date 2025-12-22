import StreamingDemo from './StreamingDemo';

function App() {
  return (
    <main className="app dark">
      <div className="container">
        <header className="header">
          <h1>react-shiki</h1>
          <p>Performant client-side syntax highlighting for React</p>
        </header>

        <StreamingDemo />

        <footer className="footer">
          <a href="https://github.com/avgvstvs96/react-shiki">GitHub</a>
          <span className="separator">|</span>
          <a href="https://www.npmjs.com/package/react-shiki">npm</a>
        </footer>
      </div>
    </main>
  );
}

export default App;
