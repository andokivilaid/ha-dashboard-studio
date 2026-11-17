/**
 * Minimal stand-ins for the Home Assistant frontend elements that HACS cards
 * reach for.
 *
 * Mushroom, Bubble Card and friends are self-contained bundles — except that
 * they compose `<ha-card>`, `<ha-icon>`, `<ha-state-icon>` and `<ha-ripple>`,
 * which the real frontend registers globally. Without them the browser treats
 * those tags as unknown inline elements: the card renders, but with no card
 * chrome and no icons. These shims register just enough to make third-party
 * cards look right, reading the same CSS custom properties the real elements
 * do.
 *
 * Everything here renders into the light DOM on purpose: the MDI webfont rules
 * are document-scoped, so a shadow root would show empty boxes.
 */

import { stateIcon } from "@ha-studio/lovelace";
import { normalizeIconName } from "./Icon";

type AnyRecord = Record<string, unknown>;

/**
 * Maps `mdi:lightbulb` to the glyph itself.
 *
 * The webfont's `.mdi-x::before { content: "\F0335" }` rules live in the
 * document stylesheet, and CSS does not cross shadow boundaries — so an icon
 * the shims render *inside a HACS card's shadow root* would be blank. Parsing
 * the codepoints out of that same (already cached) stylesheet once lets the
 * shims set the character directly, which works in any tree scope.
 */
const MDI_FONT = '"Material Design Icons"';
let codepoints: Map<string, string> | null = null;
let codepointsPromise: Promise<Map<string, string>> | null = null;

export function mdiStylesheetUrl(): string {
  return "/mdi/materialdesignicons.min.css";
}

async function loadCodepoints(): Promise<Map<string, string>> {
  if (codepoints) return codepoints;
  if (!codepointsPromise) {
    codepointsPromise = fetch(mdiStylesheetUrl())
      .then((r) => (r.ok ? r.text() : ""))
      .then((css) => {
        const map = new Map<string, string>();
        const re = /\.mdi-([a-z0-9-]+)::?before\s*\{\s*content\s*:\s*"\\([0-9a-fA-F]+)"/g;
        let match: RegExpExecArray | null;
        while ((match = re.exec(css))) {
          map.set(match[1], String.fromCodePoint(Number.parseInt(match[2], 16)));
        }
        codepoints = map;
        return map;
      })
      .catch(() => new Map<string, string>());
  }
  return codepointsPromise;
}

let installed = false;

/**
 * Registers the shims. Everything is declared inside the function because
 * `class X extends HTMLElement` is evaluated at module scope, and this module
 * is imported during server rendering where `HTMLElement` does not exist.
 */
export function installHaElementShims(): void {
  if (installed || typeof window === "undefined" || !("customElements" in window)) return;
  installed = true;

  /**
   * A constructor may only be registered once, so each tag gets its own
   * subclass. Registration is also best-effort: a bundle that already defined
   * the element must not abort the rest of the install.
   */
  function define(tag: string, ctor: CustomElementConstructor): void {
    if (customElements.get(tag)) return;
    try {
      customElements.define(tag, class extends ctor {});
    } catch {
      /* another bundle won the race */
    }
  }

  class HaCardShim extends HTMLElement {
    static observedAttributes = ["header", "outlined"];

    connectedCallback() {
      this.style.display = "block";
      this.style.background = "var(--ha-card-background, var(--card-background-color, #fff))";
      this.style.borderRadius = "var(--ha-card-border-radius, 12px)";
      this.style.border =
        "var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color))";
      this.style.boxShadow = "var(--ha-card-box-shadow, none)";
      this.style.color = "var(--primary-text-color)";
      this.style.position = "relative";
      this.style.overflow = "hidden";
      this.style.boxSizing = "border-box";
      this.renderHeader();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.renderHeader();
    }

    private renderHeader() {
      const header = this.getAttribute("header");
      const existing = this.querySelector(":scope > .ha-card-shim-header");
      if (!header) {
        existing?.remove();
        return;
      }
      const el = (existing as HTMLElement | null) ?? document.createElement("h1");
      el.className = "ha-card-shim-header";
      el.textContent = header;
      el.style.cssText =
        "margin:0;padding:12px 16px 8px;font-size:var(--ha-card-header-font-size,24px);font-weight:400;color:var(--ha-card-header-color,var(--primary-text-color));";
      if (!existing) this.prepend(el);
    }
  }

  /** Renders an `mdi:` name with the self-hosted webfont. */
  class HaIconShim extends HTMLElement {
    private _icon = "";

    static observedAttributes = ["icon"];

    set icon(value: string) {
      this._icon = value ?? "";
      this.update();
    }
    get icon(): string {
      return this._icon || this.getAttribute("icon") || "";
    }

    connectedCallback() {
      this.update();
    }

    attributeChangedCallback(_name: string, _old: string, value: string) {
      this._icon = value;
      this.update();
    }

    protected update() {
      const name = normalizeIconName(this.icon);
      this.style.display = "inline-flex";
      this.style.alignItems = "center";
      this.style.justifyContent = "center";
      this.style.width = "var(--mdc-icon-size, 24px)";
      this.style.height = "var(--mdc-icon-size, 24px)";
      this.style.lineHeight = "1";

      const span = (this.firstElementChild as HTMLElement | null) ?? document.createElement("span");
      span.style.cssText = `font-family:${MDI_FONT};font-size:var(--mdc-icon-size,24px);line-height:1;font-weight:normal;font-style:normal;-webkit-font-smoothing:antialiased;`;
      // The class still helps when the element happens to sit in the document.
      span.className = `mdi mdi-${name}`;
      if (!this.firstElementChild) this.appendChild(span);

      const glyph = codepoints?.get(name);
      if (glyph !== undefined) {
        span.textContent = glyph;
        return;
      }
      void loadCodepoints().then((map) => {
        const resolved = map.get(normalizeIconName(this.icon));
        if (resolved !== undefined) span.textContent = resolved;
      });
    }
  }

  /** `<ha-state-icon>` picks its glyph from the entity, like the real one. */
  class HaStateIconShim extends HaIconShim {
    private _stateObj: AnyRecord | undefined;

    set stateObj(value: AnyRecord | undefined) {
      this._stateObj = value;
      this.update();
    }
    get stateObj(): AnyRecord | undefined {
      return this._stateObj;
    }
    set hass(_value: unknown) {
      this.update();
    }

    /**
     * Both halves of the accessor pair must be redeclared: overriding only the
     * getter removes the inherited setter, and every Lit card assigns `.icon`.
     */
    override set icon(value: string) {
      super.icon = value;
    }

    override get icon(): string {
      const explicit = super.icon;
      if (explicit) return explicit;
      const obj = this._stateObj as { entity_id?: string } | undefined;
      if (!obj?.entity_id) return "mdi:bookmark";
      return stateIcon(obj as never, obj.entity_id);
    }
  }

  /** `<ha-svg-icon>` takes a raw path and draws it inline. */
  class HaSvgIconShim extends HTMLElement {
    private _path = "";

    set path(value: string) {
      this._path = value ?? "";
      this.render();
    }
    get path(): string {
      return this._path;
    }

    connectedCallback() {
      this.render();
    }

    private render() {
      this.style.display = "inline-flex";
      const size = "var(--mdc-icon-size, 24px)";
      this.innerHTML = this._path
        ? `<svg viewBox="0 0 24 24" style="width:${size};height:${size};fill:currentColor" aria-hidden="true"><path d="${this._path.replace(/"/g, "")}"/></svg>`
        : "";
    }
  }

  /** Interaction-only elements: present so layout is right, inert by design. */
  class InertShim extends HTMLElement {
    connectedCallback() {
      this.style.display = "contents";
    }
  }

  class HaRippleShim extends HTMLElement {
    connectedCallback() {
      this.style.display = "none";
    }
  }

  define("ha-card", HaCardShim);
  define("ha-icon", HaIconShim);
  define("ha-state-icon", HaStateIconShim);
  define("ha-svg-icon", HaSvgIconShim);
  define("ha-ripple", HaRippleShim);
  define("ha-tooltip", InertShim);
  define("ha-icon-button", InertShim);
  define("ha-outlined-icon-button", InertShim);
  define("ha-control-button", InertShim);
  define("ha-control-button-group", InertShim);
  define("ha-relative-time", InertShim);
}
