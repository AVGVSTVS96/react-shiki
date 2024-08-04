import ShikiHighlighter from 'react-shiki';
import './App.css';

export function HighlightCodeBlocks() {
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
      {code.trim()}

    </ShikiHighlighter>
  );
}
  `;
    return (
      <ShikiHighlighter
        language="jsx"
        theme="ayu-dark"
        as="div"
        style={{
          whiteSpace: 'pre-wrap',
          textAlign: 'left',
        }}
      >
        {code.trim()}
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
      {code.trim()}

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
        {code.trim()}
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
      {code.trim()}

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
        {code.trim()}
      </ShikiHighlighter>
    );
  }

  return (
    <div>
      <AyuDarkCodeBlock />
      <CatppuccinMochaCodeBlock />
      <HoustonCodeBlock />
    </div>
  );
}
