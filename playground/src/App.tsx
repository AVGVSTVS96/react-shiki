import Demo from './Demo.mdx';

function App() {
  return (
    <main className="min-h-screen px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <article className="prose prose-invert prose-lg">
          <Demo />
        </article>
        <footer className="mt-16 pt-8 border-t border-white/[0.08] text-sm text-white/40">
          <div className="flex items-center justify-between">
            <span>
              Made by{' '}
              <a
                href="https://github.com/avgvstvs96"
                className="text-white/60 hover:text-white transition-colors"
              >
                @avgvstvs96
              </a>
            </span>
            <a
              href="https://github.com/avgvstvs96/react-shiki"
              className="text-white/60 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default App;
