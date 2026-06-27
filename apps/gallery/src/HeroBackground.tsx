import type { ThemeId } from "@hue-theme/tokens";
import { useEffect, useRef } from "react";
import type { ShaderMaterial, Texture, WebGLRenderer } from "three";

const HERO_BACKGROUNDS: Record<ThemeId, string> = {
  mua: "/images/hero-mua.webp",
  huong: "/images/hero-huong.webp",
  cung: "/images/hero-cung.webp",
};

const THEME_INDEX: Record<ThemeId, number> = {
  mua: 0,
  huong: 1,
  cung: 2,
};

const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uTextureSize;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uTheme;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  vec2 coverUv(vec2 uv) {
    float screenAspect = uResolution.x / uResolution.y;
    float textureAspect = uTextureSize.x / uTextureSize.y;
    vec2 scale = screenAspect < textureAspect
      ? vec2(screenAspect / textureAspect, 1.0)
      : vec2(1.0, textureAspect / screenAspect);
    return (uv - 0.5) * scale + 0.5;
  }

  float rain(vec2 uv) {
    vec2 grid = vec2(uv.x * 92.0, uv.y * 16.0);
    vec2 cell = floor(grid);
    vec2 local = fract(grid);
    float speed = 1.2 + hash(vec2(cell.x, 2.0)) * 1.8;
    float drop = fract(local.y + uTime * speed + hash(cell.xx));
    float line = smoothstep(0.045, 0.0, abs(local.x - hash(cell.yx)));
    return line * smoothstep(0.8, 0.15, drop) * smoothstep(0.0, 0.28, uv.y);
  }

  void main() {
    vec2 uv = coverUv(vUv);
    vec2 pointer = (uPointer - 0.5) * 2.0;
    float depth = smoothstep(0.05, 0.95, vUv.y);

    if (uTheme < 0.5) {
      float wave = sin(uv.y * 42.0 + uTime * 0.42) * 0.0018;
      uv.x += wave * depth + pointer.x * 0.006 * depth;
      uv.y += pointer.y * 0.003 * depth;
    } else if (uTheme < 1.5) {
      float current = sin(uv.x * 11.0 - uTime * 0.24) * 0.004;
      current += sin(uv.y * 27.0 + uTime * 0.17) * 0.002;
      uv.x += current * depth + pointer.x * 0.007 * depth;
      uv.y += cos(uv.x * 14.0 + uTime * 0.2) * 0.002 * depth;
    } else {
      vec2 architecturalParallax = pointer * vec2(0.006, 0.003) * depth;
      uv += architecturalParallax;
    }

    vec3 color = texture2D(uTexture, clamp(uv, 0.001, 0.999)).rgb;

    if (uTheme < 0.5) {
      color += vec3(0.28, 0.43, 0.38) * rain(vUv) * 0.16;
    } else if (uTheme < 1.5) {
      float pulse = sin((vUv.x + vUv.y * 0.16) * 18.0 - uTime * 0.36);
      color += vec3(0.18, 0.38, 0.31) * smoothstep(0.82, 1.0, pulse) * depth * 0.035;
    } else {
      float axis = smoothstep(0.995, 1.0, cos((vUv.x + pointer.x * 0.006) * 50.265));
      color += vec3(0.42, 0.28, 0.09) * axis * depth * 0.035;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

type BackgroundController = {
  dispose: () => void;
  setTheme: (themeId: ThemeId) => Promise<void>;
};

export function HeroBackground({ activeTheme }: { activeTheme: ThemeId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<BackgroundController | null>(null);
  const initialThemeRef = useRef(activeTheme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!document.createElement("canvas").getContext("webgl2")) return;

    let cancelled = false;
    let renderer: WebGLRenderer | undefined;
    let material: ShaderMaterial | undefined;
    let activeTexture: Texture | undefined;
    let frame = 0;
    let visible = true;
    let documentVisible = !document.hidden;
    let currentTheme = initialThemeRef.current;
    const pointerTarget = { x: 0.5, y: 0.5 };
    const pointer = { x: 0.5, y: 0.5 };
    const container = canvas.parentElement;

    const initialize = async () => {
      const THREE = await import("./threeRuntime");
      if (cancelled || !container) return;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        canvas,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      const geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uPointer: { value: new THREE.Vector2(0.5, 0.5) },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uTexture: { value: null },
          uTextureSize: { value: new THREE.Vector2(1, 1) },
          uTheme: { value: THEME_INDEX[currentTheme] },
          uTime: { value: 0 },
        },
        vertexShader: VERTEX_SHADER,
      });
      scene.add(new THREE.Mesh(geometry, material));

      const textureLoader = new THREE.TextureLoader();
      const resize = () => {
        if (!renderer || !material || !container) return;
        const { width, height } = container.getBoundingClientRect();
        renderer.setSize(width, height, false);
        material.uniforms.uResolution.value.set(width, height);
      };

      const setTheme = async (themeId: ThemeId) => {
        currentTheme = themeId;
        canvas.classList.remove("ready");
        delete canvas.dataset.renderedTheme;
        const texture = await textureLoader.loadAsync(HERO_BACKGROUNDS[themeId]);
        if (cancelled || !material || currentTheme !== themeId) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        const image = texture.image as { naturalHeight?: number; naturalWidth?: number };
        activeTexture?.dispose();
        activeTexture = texture;
        material.uniforms.uTexture.value = texture;
        material.uniforms.uTextureSize.value.set(image.naturalWidth ?? 1, image.naturalHeight ?? 1);
        material.uniforms.uTheme.value = THEME_INDEX[themeId];
        canvas.dataset.renderedTheme = themeId;
        canvas.classList.add("ready");
      };

      const clock = new THREE.Clock();
      const render = () => {
        frame = window.requestAnimationFrame(render);
        if (!renderer || !material || !visible || !documentVisible || !activeTexture) return;

        pointer.x += (pointerTarget.x - pointer.x) * 0.045;
        pointer.y += (pointerTarget.y - pointer.y) * 0.045;
        material.uniforms.uPointer.value.set(pointer.x, pointer.y);
        material.uniforms.uTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
      };

      const resizeObserver = new ResizeObserver(resize);
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      const handlePointerMove = (event: PointerEvent) => {
        const bounds = container.getBoundingClientRect();
        pointerTarget.x = (event.clientX - bounds.left) / bounds.width;
        pointerTarget.y = 1 - (event.clientY - bounds.top) / bounds.height;
      };
      const handleVisibilityChange = () => {
        documentVisible = !document.hidden;
      };

      resizeObserver.observe(container);
      intersectionObserver.observe(container);
      container.addEventListener("pointermove", handlePointerMove, { passive: true });
      document.addEventListener("visibilitychange", handleVisibilityChange);
      resize();
      render();

      controllerRef.current = {
        setTheme,
        dispose: () => {
          window.cancelAnimationFrame(frame);
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          container.removeEventListener("pointermove", handlePointerMove);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          activeTexture?.dispose();
          geometry.dispose();
          material?.dispose();
          renderer?.dispose();
          canvas.classList.remove("ready");
          delete canvas.dataset.renderedTheme;
        },
      };
      await setTheme(currentTheme);
    };

    void initialize();

    return () => {
      cancelled = true;
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    void controllerRef.current?.setTheme(activeTheme);
  }, [activeTheme]);

  return (
    <div aria-hidden="true" className="hero-background">
      {(Object.entries(HERO_BACKGROUNDS) as [ThemeId, string][]).map(([themeId, src]) => (
        <img
          alt=""
          className={themeId === activeTheme ? "active" : ""}
          decoding="async"
          fetchPriority={themeId === "mua" ? "high" : "low"}
          key={themeId}
          src={src}
        />
      ))}
      <canvas ref={canvasRef} />
      <div className="hero-atmosphere" />
    </div>
  );
}
