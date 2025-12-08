import Demo from './Demo.mdx';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-neutral-900">react-shiki</span>
          <nav className="flex items-center gap-6">
            <a
              href="https://www.npmjs.com/package/react-shiki"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              npm
            </a>
            <a
              href="https://github.com/avgvstvs96/react-shiki"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <article className="prose prose-neutral max-w-none">
            <Demo />
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-sm text-neutral-400">
            Built by{' '}
            <a
              href="https://github.com/avgvstvs96"
              className="text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              @avgvstvs96
            </a>
          </span>
          <span className="text-xs font-mono text-neutral-400 tracking-wider">
            PLAYGROUND
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
