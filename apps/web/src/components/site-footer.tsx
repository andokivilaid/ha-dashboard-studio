import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t mt-auto">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 text-[13px] sm:flex-row sm:items-center sm:px-6">
        <p className="text-muted">
          HA Dashboard Studio — MIT licensed. Not affiliated with the Home Assistant project.
        </p>
        <nav className="flex flex-wrap gap-4 sm:ml-auto" aria-label="Footer">
          <Link href="/sources" className="text-muted hover:underline">
            Sources &amp; licences
          </Link>
          <Link href="/docs/connect" className="text-muted hover:underline">
            Connect your HA
          </Link>
          <a
            href="https://github.com/andokivilaid/ha-dashboard-studio"
            className="text-muted hover:underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
