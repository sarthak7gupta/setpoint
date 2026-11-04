import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  /* Avoid dvh/vh — Safari iOS chrome show/hide makes those jump. */
  html {
    margin: 0;
    height: 100%;
    background-color: var(--bg-deep, #0a0610);
    --font-ui: 'DM Sans', system-ui, sans-serif;
    --font-display: 'Bebas Neue', sans-serif;
  }

  body {
    margin: 0;
    min-height: 100%;
    min-height: -webkit-fill-available;
    font-family: var(--font-ui);
    background-color: var(--bg-deep, #0a0610);
    color: var(--text, #f4f7ef);
    -webkit-font-smoothing: antialiased;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }

  /*
    Fixed inset box (no vh/dvh). Pins to the layout viewport edges so
    accordion growth and Safari toolbar animation don't reflow the gradient.
  */
  body::before {
    content: '';
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: var(--bg-deep, #0a0610);
    background-image:
      var(--hero-glow),
      linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.22) 100%),
      var(--gradient),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 48px,
        var(--court-stripe, rgba(255,255,255,0.02)) 48px,
        var(--court-stripe, rgba(255,255,255,0.02)) 49px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 72px,
        rgba(255,255,255,0.02) 72px,
        rgba(255,255,255,0.02) 73px
      );
    background-repeat: no-repeat;
    background-position: center top;
    background-size: cover, cover, cover, auto, auto;
    pointer-events: none;
    z-index: 0;
    /* Keep layer stable on iOS scroll/composite */
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }

  /* Classic uses a quiet tonal ground; tournament color stays on controls. */
  html[data-style='classic'] body::before {
    background-image: var(--gradient);
  }

  #root {
    position: relative;
    z-index: 1;
    min-height: 100%;
    min-height: -webkit-fill-available;
  }

  h1, h2, h3, .display {
    font-family: var(--font-display);
    letter-spacing: 0.04em;
    font-weight: 400;
    margin: 0;
  }
  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }
  a { color: var(--accent-soft); }

  :focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
  }
`
