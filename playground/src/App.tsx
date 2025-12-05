import Demo from './Demo.mdx';

function App() {
  return (
    <div className="min-h-screen">
      {/* Header with bottom border */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white/90">react-shiki</span>
          <nav className="flex items-center gap-6">
            <a
              href="https://www.npmjs.com/package/react-shiki"
              className="text-sm text-white/50 hover:text-white/90 transition-colors"
            >
              npm
            </a>
            <a
              href="https://github.com/avgvstvs96/react-shiki"
              className="text-sm text-white/50 hover:text-white/90 transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          <Demo />
        </article>
      </main>

      {/* Footer with top border */}
      <footer className="border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-white/40">
          <span>
            Built by{' '}
            <a
              href="https://github.com/avgvstvs96"
              className="text-white/60 hover:text-white/90 transition-colors"
            >
              @avgvstvs96
            </a>
          </span>
          <span>Playground</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
