import Demo from './Demo.mdx';

function App() {
  return (
    <main className="flex flex-col min-w-screen dark">
      <div className="flex flex-col prose dark:prose-invert self-center mt-10 md:max-w-3xl">
        <Demo />
        <footer className="text-sm dark:text-slate-300 mt-10 mb-8 self-end">
          Made with ❤ by Bassim -{' '}
          <a href="https://github.com/avgvstvs96">@avgvstvs96</a>
        </footer>
      </div>
    </main>
  );
}

export default App;
