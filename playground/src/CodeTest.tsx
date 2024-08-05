import ShikiHighlighter from 'react-shiki';
import React from 'react';
import './App.css';

export const HighlightCodeBlocks = React.memo(() => {
  function AyuDark() {
    const code = `
function AyuDark() {
  return (
    <ShikiHighlighter language="jsx" theme="ayu-dark">
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
          textAlign: 'left',
        }}
      >
        {code.trim()}
      </ShikiHighlighter>
    );
  }

  function CatppuccinMocha() {
    const code = `
function CatpuccinMocha() {
  return (
    <ShikiHighlighter language="jsx" theme="catppuccin-mocha">
      {code.trim()}
    </ShikiHighlighter>
  );
}
  `;
    return (
      <ShikiHighlighter
        language="jsx"
        theme="catppuccin-mocha"
        style={{
          textAlign: 'left',
        }}
      >
        {code.trim()}
      </ShikiHighlighter>
    );
  }

  function Houston() {
    const code = `
function Houston() {
  return (
    <ShikiHighlighter
      language="jsx"
      theme="houston"
      showLanguage={false}
      addDefaultStyles={true}
      as="div"
      style={{
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
          textAlign: 'left',
        }}
      >
        {code.trim()}
      </ShikiHighlighter>
    );
  }

  return (
    <div style={{ textAlign: 'left', maxWidth: '65ch' }}>
      <h3>Usage</h3>
      <AyuDark />
      <p style={{ marginTop: '1.5rem' }}>
        The ShikiHighlighter is imported in your project and used as a
        component, with code to be highlighted passed as children.
      </p>
      <p style={{ marginBottom: '1.5rem' }}>
        Shiki handles dynamically imports only the languages and themes
        used on the page.
      </p>
      <CatppuccinMocha />
      <p style={{ marginTop: '1.5rem', marginBottom: '-0.5rem' }}>
        The component accepts several props in addition to language and
        theme:
      </p>
      <ul style={{ marginBottom: '1.5rem' }}>
        <li>
          <code>showLanguage: boolean</code> - Shows the language name in
          the top right corner of the code block.
        </li>
        <li>
          <code>style: object</code> - Style object to be passed to the
          component.
        </li>
        <li>
          <code>as: string</code> - The component to be rendered. Defaults
          to 'pre'.
        </li>
        <li>
          <code>className: string</code> - Class name to be passed to the
          component.
        </li>
      </ul>
      <Houston />
    </div>
  );
});
