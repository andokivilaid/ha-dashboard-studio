import type { Metadata } from "next";
import { ShieldCheck, TriangleAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Connect your Home Assistant",
  description:
    "How to point HA Dashboard Studio at a real instance, read-only, including the CORS configuration it needs.",
};

const CORS_SNIPPET = `# configuration.yaml
http:
  use_x_forwarded_for: true          # only if you run behind a reverse proxy
  trusted_proxies:
    - 172.16.0.0/12                  # your proxy's subnet
  cors_allowed_origins:
    - https://ha-dashboard-studio.vercel.app
    - http://localhost:3177          # when running the studio locally`;

export default function ConnectDocsPage() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 sm:px-6">
      <h1 className="text-[1.75rem] font-semibold tracking-tight">Connect your Home Assistant</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
        The builder can read a real instance so you see your own entities and your own existing
        dashboards. The connection is made from your browser directly to your instance — the studio
        server is not in the path and never sees your token.
      </p>

      <div
        className="hs-card mt-6 flex gap-3 p-4"
        style={{ borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))" }}
      >
        <ShieldCheck size={18} aria-hidden style={{ color: "var(--ok)", flexShrink: 0, marginTop: 2 }} />
        <div className="text-[13.5px] leading-relaxed">
          <strong>Read-only, enforced in code.</strong> The websocket client holds an allow-list of
          commands — states, registries, config, themes and <code>lovelace/config</code>. Anything
          else, including every <code>call_service</code>, throws a{" "}
          <code>ReadOnlyViolation</code> before it reaches the socket. Nothing is ever saved back to
          your instance.
        </div>
      </div>

      <Step n={1} title="Create a long-lived access token">
        <p>
          In Home Assistant open your profile (bottom-left avatar) → <strong>Security</strong> →{" "}
          <strong>Long-lived access tokens</strong> → <strong>Create token</strong>. Copy it
          immediately; HA shows it once.
        </p>
      </Step>

      <Step n={2} title="Allow this origin (CORS)">
        <p>
          A browser will refuse the connection unless your instance lists the studio&apos;s origin.
          Add it under <code>http:</code> in <code>configuration.yaml</code>, then restart Home
          Assistant.
        </p>
        <pre
          className="hs-card mt-3 overflow-x-auto p-4 text-[12.5px] leading-[1.6]"
          style={{ fontFamily: "var(--font-mono)", background: "var(--surface-2)" }}
        >
          {CORS_SNIPPET}
        </pre>
        <p className="mt-3">
          If you already have an <code>http:</code> block, merge the <code>cors_allowed_origins</code>{" "}
          key into it rather than adding a second one.
        </p>
      </Step>

      <Step n={3} title="Make the instance reachable over HTTPS">
        <p>
          The studio is served over HTTPS, and browsers block mixed content: a page on{" "}
          <code>https://</code> cannot open a <code>ws://</code> socket. Either expose your instance
          over HTTPS (Nabu Casa, a reverse proxy with a certificate, or Tailscale with HTTPS), or run
          the studio locally with <code>pnpm dev</code> and connect to{" "}
          <code>http://homeassistant.local:8123</code> from <code>http://localhost:3177</code>.
        </p>
      </Step>

      <Step n={4} title="Connect">
        <p>
          Open the builder, press the data-source button in the toolbar, paste the URL and token.
          Once connected you can import any of your existing dashboards with the{" "}
          <strong>Import your dashboard…</strong> menu — it is copied into the editor, never written
          back.
        </p>
      </Step>

      <h2 className="mt-10 text-[1.15rem] font-semibold">Troubleshooting</h2>
      <div className="mt-3 space-y-3">
        <Trouble title="“Could not connect” with nothing else">
          Almost always CORS. Open the browser console: a blocked request logs an
          <code> Access-Control-Allow-Origin</code> error. Check that the origin you added matches
          exactly, including the scheme and any port, with no trailing slash.
        </Trouble>
        <Trouble title="“Mixed Content” in the console">
          You are on an HTTPS page trying to reach an HTTP instance. Use the local dev server, or put
          your instance behind HTTPS.
        </Trouble>
        <Trouble title="Connects, then immediately drops">
          The token was rejected. Tokens are bound to the user who created them — if you deleted that
          user or revoked the token, make a new one.
        </Trouble>
        <Trouble title="My dashboard imports but renders oddly">
          The studio implements the built-in cards and a set of popular HACS cards. Anything else
          falls back to a labelled placeholder rather than failing. Custom cards you install from
          HACS that are not in the bundled registry cannot be fetched from your instance, because
          that would require authenticating to your instance from the browser for static assets.
        </Trouble>
      </div>

      <h2 className="mt-10 text-[1.15rem] font-semibold">What is read, in order</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
        After the websocket authenticates, the studio asks for the registries first — so that
        names, areas, floors and labels resolve before anything is drawn — then the dashboard
        layer.
      </p>
      <ol className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
        <li>
          <strong className="text-[var(--ink)]">1. Registries.</strong>{" "}
          <code>config/area_registry/list</code>, <code>config/floor_registry/list</code>,{" "}
          <code>config/device_registry/list</code>, <code>config/entity_registry/list</code>,{" "}
          <code>config/label_registry/list</code> — these give grouping and the names you chose,
          rather than ours guessed from entity ids.
        </li>
        <li>
          <strong className="text-[var(--ink)]">2. State.</strong> <code>get_states</code>,{" "}
          <code>get_config</code>, <code>auth/current_user</code>,{" "}
          <code>frontend/get_themes</code>, plus a <code>subscribe_entities</code> stream so the
          preview keeps up.
        </li>
        <li>
          <strong className="text-[var(--ink)]">3. Dashboards.</strong>{" "}
          <code>lovelace/dashboards/list</code> and <code>lovelace/config</code>. The latter
          returns the config together with a hash; the studio keeps the hash so it can tell you
          the copy in the editor was taken at a point in time.
        </li>
        <li>
          <strong className="text-[var(--ink)]">4. Resources.</strong>{" "}
          <code>lovelace/resources</code> lists the HACS modules your instance has registered.
          The builder uses it twice: to tell you which custom cards in a dashboard you actually
          have, and to stop the AI generating a card you would have to install first.
        </li>
      </ol>

      <div
        className="hs-card mt-6 flex gap-3 p-4"
        style={{ borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))" }}
      >
        <ShieldCheck size={18} aria-hidden style={{ color: "var(--ok)", flexShrink: 0, marginTop: 2 }} />
        <div className="text-[13.5px] leading-relaxed">
          <strong>Nothing is written, by any route.</strong> Not a service call, not a{" "}
          <code>lovelace/config/save</code>, and never a direct edit of{" "}
          <code>.storage/lovelace</code> — the studio has no filesystem access to your instance at
          all, and the websocket allow-list refuses every write command before it is sent. An
          imported dashboard is a copy in your browser; exporting it and pasting it in yourself is
          the only way it reaches your instance.
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2.5 text-[1.05rem] font-semibold">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold"
          style={{ background: "var(--brand)", color: "#04121b" }}
        >
          {n}
        </span>
        {title}
      </h2>
      <div className="hs-prose mt-2 text-[13.5px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Trouble({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="hs-card p-4">
      <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
        <TriangleAlert size={14} aria-hidden style={{ color: "var(--accent)" }} />
        {title}
      </h3>
      <p className="hs-prose mt-1 text-[13px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
