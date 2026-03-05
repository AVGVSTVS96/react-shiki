import Demo from './Demo.mdx';
import { useState } from 'react';
import StreamingBenchmarkPage from './pages/StreamingBenchmarkPage';

function App() {
  const [view, setView] = useState<'demo' | 'streaming'>('demo');
  const maxWidthClass = view === 'streaming' ? 'max-w-[1800px]' : 'max-w-6xl';

  return (
    <main className="dark flex min-h-screen w-full flex-col items-center text-slate-100">
      <div className={`mx-auto w-full px-4 pt-8 ${maxWidthClass}`}>
        <nav className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setView('demo');
            }}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              view === 'demo'
                ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                : 'border-slate-600/70 bg-slate-700/30 text-slate-200'
            }`}
          >
            Demo
          </button>
          <button
            type="button"
            onClick={() => {
              setView('streaming');
            }}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              view === 'streaming'
                ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                : 'border-slate-600/70 bg-slate-700/30 text-slate-200'
            }`}
          >
            Streaming Chat Lab
          </button>
        </nav>

        {view === 'demo' ? (
          <div className="prose mx-auto mt-4 dark:prose-invert md:max-w-3xl">
            <Demo />
            <footer className="mb-8 mt-10 text-right text-sm dark:text-slate-300">
              Made with ❤ by Bassim -{' '}
              <a href="https://github.com/avgvstvs96">@avgvstvs96</a>
            </footer>
          </div>
        ) : (
          <>
            <StreamingBenchmarkPage />
            <footer className="mb-8 mt-6 text-right text-sm text-slate-300">
              Made with ❤ by Bassim -{' '}
              <a href="https://github.com/avgvstvs96">@avgvstvs96</a>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

export default App;
