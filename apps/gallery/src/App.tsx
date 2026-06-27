import { getTheme, type ResolvedTheme, type ThemeId, themeBundle } from "@hue-theme/tokens";
import { useMemo, useState } from "react";
import { contrastRatio } from "./color";

const NAVIGATION = ["Overview", "Tokens", "Syntax", "Components", "Accessibility"];
const FEATURED_TOKENS = [
  ["surface.canvas", "Background", "Nền chủ đạo"],
  ["text.primary", "Text", "Chữ chính"],
  ["accent.primary", "Accent", "Ngọc sông Hương"],
  ["border.subtle", "Border", "Ranh giới"],
] as const;
const PALETTE_GROUPS = [
  ["Surface", ["surface.canvas", "surface.raised", "surface.selected"]],
  ["Text", ["text.primary", "text.secondary", "text.accent"]],
  ["Accent", ["accent.primary", "accent.secondary"]],
  ["Status", ["status.success", "status.warning", "status.error", "status.info"]],
  ["Syntax", ["syntax.keyword", "syntax.string", "syntax.number", "syntax.function"]],
] as const;
const AUDIT_TOKENS = [
  ["text.primary", 4.5],
  ["text.secondary", 4.5],
  ["accent.primary", 4.5],
  ["border.subtle", 3],
] as const;

function GateMark() {
  return (
    <svg aria-hidden="true" className="gate-mark" viewBox="0 0 40 48" fill="none">
      <path d="M4 10h32M8 4v40M32 4v40M14 14v30M26 14v30M14 23h12M3 44h34" />
      <path d="M6 10 20 2l14 8" />
    </svg>
  );
}

function Header({
  activeTheme,
  onThemeChange,
}: {
  activeTheme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}) {
  return (
    <header className="site-header">
      <a className="brand" href="#overview" aria-label="Hue Theme home">
        <GateMark />
        <span>Hue Theme</span>
      </a>
      <nav aria-label="Primary navigation">
        {NAVIGATION.map((item, index) => (
          <a key={item} className={index === 0 ? "active" : ""} href={`#${item.toLowerCase()}`}>
            {item}
          </a>
        ))}
      </nav>
      <fieldset className="mood-switch">
        <legend className="sr-only">Chọn mood</legend>
        {themeBundle.themes
          .slice()
          .reverse()
          .map((theme) => (
            <button
              aria-pressed={theme.id === activeTheme}
              className={theme.id === activeTheme ? "selected" : ""}
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              type="button"
            >
              <span aria-hidden="true" className={`mood-icon mood-icon-${theme.id}`} />
              {theme.label}
            </button>
          ))}
      </fieldset>
    </header>
  );
}

function TokenTable({ theme }: { theme: ResolvedTheme }) {
  return (
    <div className="token-window" id="tokens">
      <div className="window-bar">
        <span>
          <i /> core.json
        </span>
        <span>Hue / {theme.label}</span>
      </div>
      <div className="token-table">
        {FEATURED_TOKENS.map(([name, category, note]) => (
          <div className="token-row" key={name}>
            <span className="token-swatch" style={{ background: theme.semantic[name] }} />
            <span>
              <strong>{name}</strong>
              <small>{theme.semantic[name]}</small>
            </span>
            <span className="token-category">{category}</span>
            <span className="token-note">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ theme }: { theme: ResolvedTheme }) {
  return (
    <section className="hero" id="overview">
      <div className="rain-lines" aria-hidden="true" />
      <div className="hero-copy">
        <h1>
          Mưa <span className="hero-key hero-key-hue">Huế</span> ngoài hiên,
          <br />
          sắc màu trong <span className="hero-key hero-key-code">code</span>.
        </h1>
        <p>
          Design tokens cho giao diện, mã nguồn
          <br />
          và những giờ làm việc thật dài.
        </p>
        <a className="primary-action" href="#tokens">
          <span aria-hidden="true">↗</span>
          Explore tokens
        </a>
      </div>
      <TokenTable theme={theme} />
      <div className="river-line" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}

function SemanticPalette({ theme }: { theme: ResolvedTheme }) {
  return (
    <section className="palette-section">
      <div className="section-heading">
        <h2>Semantic palette</h2>
        <span>{Object.keys(theme.semantic).length} resolved tokens</span>
      </div>
      <div className="palette-rail">
        {PALETTE_GROUPS.map(([label, tokens]) => (
          <div className="palette-group" key={label}>
            <span>{label}</span>
            <div>
              {tokens.map((token) => (
                <button
                  key={token}
                  style={{ background: theme.semantic[token] }}
                  title={`${token}: ${theme.semantic[token]}`}
                  type="button"
                >
                  <span className="sr-only">{token}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SyntaxSpecimen({ theme }: { theme: ResolvedTheme }) {
  const syntax = theme.semantic;
  return (
    <section className="syntax-panel" id="syntax">
      <div className="panel-heading">
        <h2 id="syntax-specimen-title">Syntax specimen</h2>
        <span>TypeScript⌄</span>
      </div>
      <pre>
        <code>
          <span className="line-number">1</span>
          <span style={{ color: syntax["syntax.keyword"] }}>import</span>
          {" { tokens } "}
          <span style={{ color: syntax["syntax.keyword"] }}>from</span>
          <span style={{ color: syntax["syntax.string"] }}> "@hue-theme/tokens"</span>;{"\n"}
          <span className="line-number">2</span>
          {"\n"}
          <span className="line-number">3</span>
          <span style={{ color: syntax["syntax.keyword"] }}>const</span>{" "}
          <span style={{ color: syntax["syntax.function"] }}>styles</span> = {"{"}
          {"\n"}
          <span className="line-number">4</span> background: tokens.surface.canvas,{"\n"}
          <span className="line-number">5</span> color: tokens.text.primary,{"\n"}
          <span className="line-number">6</span> border:{" "}
          <span style={{ color: syntax["syntax.string"] }}>"1px solid"</span>,{"\n"}
          <span className="line-number">7</span> radius:{" "}
          <span style={{ color: syntax["syntax.number"] }}>2</span>,{"\n"}
          <span className="line-number">8</span>
          {"};"}
          {"\n"}
          <span className="line-number">9</span>
          <span style={{ color: syntax["syntax.comment"] }}>
            {"// Primitive → semantic → adapter"}
          </span>
        </code>
      </pre>
    </section>
  );
}

function ContrastAudit({ theme }: { theme: ResolvedTheme }) {
  const rows = useMemo(() => {
    const background = theme.semantic["surface.canvas"];
    return AUDIT_TOKENS.map(([token, minimum]) => {
      const ratio = contrastRatio(theme.semantic[token], background);
      return { token, minimum, ratio, pass: ratio >= minimum };
    });
  }, [theme]);

  return (
    <section className="audit-panel" id="accessibility">
      <div className="panel-heading">
        <h2>Contrast audit</h2>
        <span>WCAG 2.2 AA</span>
      </div>
      <div className="audit-table">
        <div className="audit-head">
          <span>Token</span>
          <span>Preview</span>
          <span>Ratio</span>
          <span>Result</span>
        </div>
        {rows.map(({ token, minimum, ratio, pass }) => (
          <div className="audit-row" key={token}>
            <span>{token}</span>
            <span className="audit-preview" style={{ color: theme.semantic[token] }}>
              Aa
            </span>
            <span>
              {ratio.toFixed(2)}:1 <small>≥ {minimum}:1</small>
            </span>
            <strong className={pass ? "pass" : "fail"}>{pass ? "AA Pass" : "Fail"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterBand() {
  return (
    <footer className="footer-band" id="components">
      <div>
        <h2>One source.</h2>
        <p>Primitive → Semantic → Adapter</p>
      </div>
      <div>
        <h2>Planned platforms</h2>
        <p>LazyVim · Yaak · Inkdrop</p>
      </div>
      <div>
        <h2>Open foundation</h2>
        <p>DTCG 2025.10 · MIT</p>
      </div>
    </footer>
  );
}

export function App() {
  const [themeId, setThemeId] = useState<ThemeId>("mua");
  const theme = getTheme(themeId);

  return (
    <div className="app" data-hue-theme={themeId}>
      <Header activeTheme={themeId} onThemeChange={setThemeId} />
      <main>
        <Hero theme={theme} />
        <SemanticPalette theme={theme} />
        <div className="spec-grid">
          <SyntaxSpecimen theme={theme} />
          <ContrastAudit theme={theme} />
        </div>
      </main>
      <FooterBand />
    </div>
  );
}
