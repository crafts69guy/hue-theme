import {
  getTheme,
  type ResolvedTheme,
  type SemanticToken,
  type StatusToken,
  type ThemeId,
  themeBundle,
} from "@hue-theme/tokens";
import { useReducedMotion } from "motion/react";
import { useAnimate } from "motion/react-mini";
import { useEffect, useMemo, useState } from "react";
import { contrastRatio } from "./color";
import { HeroBackground } from "./HeroBackground";

const NAVIGATION = ["Overview", "Tokens", "Syntax", "Components", "Accessibility"];
const FEATURED_TOKENS = [
  ["surface.canvas", "Background", "Nền chủ đạo"],
  ["text.primary", "Text", "Chữ chính"],
  ["accent.primary", "Accent", "Ngọc sông Hương"],
  ["border.subtle", "Border", "Ranh giới"],
] as const;
// Exhaustive over the status contract: omitting a role here is a compile error.
// Display order follows the literal's insertion order.
const STATUS_PALETTE: Record<StatusToken, true> = {
  "status.success": true,
  "status.info": true,
  "status.notice": true,
  "status.warning": true,
  "status.error": true,
};
const PALETTE_GROUPS: ReadonlyArray<readonly [string, readonly SemanticToken[]]> = [
  ["Surface", ["surface.canvas", "surface.raised", "surface.selected"]],
  ["Text", ["text.primary", "text.secondary", "text.accent"]],
  ["Accent", ["accent.primary", "accent.secondary"]],
  ["Status", Object.keys(STATUS_PALETTE) as StatusToken[]],
  ["Syntax", ["syntax.keyword", "syntax.string", "syntax.number", "syntax.function"]],
];
const AUDIT_TOKENS = [
  ["text.primary", 4.5],
  ["text.secondary", 4.5],
  ["accent.primary", 4.5],
  ["border.subtle", 3],
] as const;

function GateMark() {
  return (
    <svg aria-hidden="true" className="gate-mark" viewBox="0 0 56 48" fill="none">
      <path
        className="gate-roof"
        d="M17 10 28 3l11 7M15 12h26M7 18l9-6h24l9 6M5 20h46M12 24h32"
        pathLength="1"
      />
      <path
        className="gate-frame"
        d="M10 20v8M16 13v15M22 12v16M28 12v16M34 12v16M40 13v15M46 20v8M8 28h40M6 31h44M6 31v12M50 31v12M4 43h48"
        pathLength="1"
      />
      <path
        className="gate-frame gate-openings"
        d="M10 43v-8h7v8M22 43v-7a6 6 0 0 1 12 0v7M39 43v-8h7v8M18.5 43v-6h2v6M35.5 43v-6h2v6"
        pathLength="1"
      />
      <path className="gate-detail" d="M18 17h4M25 17h6M34 17h4M18 24h4M25 24h6M34 24h4" />
    </svg>
  );
}

function Brand() {
  const shouldReduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();

  const playAnimation = () => {
    if (shouldReduceMotion) return;

    animate(
      scope.current,
      {
        transform: [
          "translateY(0) scale(1)",
          "translateY(-1.5px) scale(1.015)",
          "translateY(0) scale(1)",
        ],
      },
      { duration: 0.9, ease: "easeInOut" },
    );
    animate(
      ".gate-frame",
      { opacity: [0.4, 1, 1], strokeDashoffset: [1, 0, 0] },
      { duration: 1.05, ease: "easeInOut" },
    );
    animate(
      ".gate-roof",
      {
        filter: [
          "drop-shadow(0 0 0 currentColor)",
          "drop-shadow(0 0 4px currentColor)",
          "drop-shadow(0 0 0 currentColor)",
        ],
        opacity: [0.45, 1, 1],
        strokeDashoffset: [1, 0, 0],
      },
      { delay: 0.12, duration: 0.92, ease: "easeOut" },
    );
    animate(
      ".brand-label",
      { opacity: [0.72, 1], transform: ["translateX(-2px)", "translateX(0)"] },
      { delay: 0.16, duration: 0.55, ease: "easeOut" },
    );
  };

  return (
    <a
      aria-label="Hue Theme home"
      className="brand"
      href="#overview"
      onFocus={playAnimation}
      onMouseEnter={playAnimation}
      ref={scope}
    >
      <GateMark />
      <span className="brand-label">Hue Theme</span>
    </a>
  );
}

function CungIcon({ active }: { active: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();

  useEffect(() => {
    if (!active || shouldReduceMotion) return;

    const controls = [
      animate(
        scope.current,
        { transform: ["translateY(0)", "translateY(-1.2px)", "translateY(0)"] },
        { duration: 2.8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY },
      ),
      animate(
        ".bridge-outline",
        { opacity: [0.45, 1, 1], strokeDashoffset: [1, 0, 0] },
        { duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY },
      ),
      animate(
        ".bridge-truss",
        { opacity: [0.25, 1, 1], strokeDashoffset: [1, 0, 0] },
        { delay: 0.28, duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY },
      ),
      animate(
        ".bridge-reflection",
        { opacity: [0.12, 0.7, 0.12], strokeDashoffset: [1, 0, -1] },
        { delay: 0.5, duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY },
      ),
      ...[0, 1, 2, 3, 4].map((index) =>
        animate(
          `.bridge-light-${index}`,
          { opacity: [0.18, 1, 0.18], transform: ["scale(0.75)", "scale(1.45)", "scale(0.75)"] },
          {
            delay: index * 0.12,
            duration: 1.45,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          },
        ),
      ),
    ];

    return () => {
      for (const control of controls) control.stop();
    };
  }, [active, animate, scope, shouldReduceMotion]);

  return (
    <svg aria-hidden="true" className="mood-icon mood-icon-cung" ref={scope} viewBox="0 0 36 32">
      <path
        className="bridge-outline"
        d="M3 12h30M6 16h24M8 8h20M10 5h16M7 3v26M11 6v23M25 6v23M29 3v26M3 29h30"
        pathLength="1"
      />
      <path className="bridge-truss" d="m7 10 4 6 7-4 7 4 4-6" pathLength="1" />
      <path className="bridge-reflection" d="M6 31c4-1.8 7.7 1.8 12 0s8 1.8 12 0" pathLength="1" />
      {[8, 13, 18, 23, 28].map((cx, index) => (
        <circle
          className={`bridge-light bridge-light-${index}`}
          cx={cx}
          cy="12"
          fill="currentColor"
          key={cx}
          r="0.7"
          stroke="none"
        />
      ))}
    </svg>
  );
}

function MoodIcon({ active, id }: { active: boolean; id: ThemeId }) {
  if (id === "mua") {
    return (
      <svg aria-hidden="true" className="mood-icon mood-icon-mua" viewBox="0 0 36 32">
        <path
          className="mood-icon-main"
          d="M10.1 19.2h15.5a6.3 6.3 0 0 0 .8-12.5A8.4 8.4 0 0 0 11 8.5h-.9a5.4 5.4 0 0 0 0 10.7Z"
        />
        <path className="rain-drop rain-drop-one" d="m10.5 23.1-2 4.1" />
        <path className="rain-drop rain-drop-two" d="m18.5 23.1-2 4.1" />
        <path className="rain-drop rain-drop-three" d="m26.5 23.1-2 4.1" />
      </svg>
    );
  }

  if (id === "huong") {
    return (
      <svg aria-hidden="true" className="mood-icon mood-icon-huong" viewBox="0 0 36 32">
        <path className="river-steam river-steam-one" d="M11 3.5c2.6 3.2-2.8 5.3-.2 8.5" />
        <path className="river-steam river-steam-two" d="M18 2.5c2.8 3.7-3 6.2-.1 9.7" />
        <path className="river-steam river-steam-three" d="M25 3.5c2.6 3.2-2.8 5.3-.2 8.5" />
        <path
          className="river-wave river-wave-one"
          d="M5 18.5c4.7-2.7 8.6 2.7 13.2 0s8.7 2.7 12.8 0"
        />
        <path
          className="river-wave river-wave-two"
          d="M5 24c4.7-2.7 8.6 2.7 13.2 0s8.7 2.7 12.8 0"
        />
        <path className="river-wave river-wave-three" d="M7 29c4-2 7.5 2 11.4 0s7.6 2 10.6 0" />
      </svg>
    );
  }

  return <CungIcon active={active} />;
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
      <Brand />
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
              <MoodIcon active={theme.id === activeTheme} id={theme.id} />
              <span className="mood-label">{theme.label}</span>
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

function Hero({ theme, themeId }: { theme: ResolvedTheme; themeId: ThemeId }) {
  return (
    <section className="hero" id="overview">
      <HeroBackground activeTheme={themeId} />
      <div className="hero-copy">
        <h1>
          1 chút <span className="hero-key hero-key-hue">Huế</span>,
          <br />1 chút <span className="hero-key hero-key-code">code</span>
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
        <Hero theme={theme} themeId={themeId} />
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
