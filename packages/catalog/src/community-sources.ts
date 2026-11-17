/**
 * Places the catalogue is harvested from, or that are worth crediting even
 * when their content cannot be re-hosted. Shown on `/sources`.
 */
export interface CommunitySource {
  name: string;
  url: string;
  kind: "forum" | "reddit" | "list" | "docs" | "github";
  note: string;
  /** Whether the ingester pulls YAML from here automatically. */
  automated: boolean;
}

export const COMMUNITY_SOURCES: CommunitySource[] = [
  {
    name: "GitHub — topic:home-assistant-config",
    url: "https://github.com/topics/home-assistant-config",
    kind: "github",
    note: "Primary harvest. Repositories that publish a full HA configuration, including ui-lovelace.yaml.",
    automated: true,
  },
  {
    name: "GitHub — topic:lovelace-ui",
    url: "https://github.com/topics/lovelace-ui",
    kind: "github",
    note: "Dashboard-focused repositories, often a single polished dashboard plus screenshots.",
    automated: true,
  },
  {
    name: "GitHub code search — ui-lovelace.yaml",
    url: "https://github.com/search?q=filename%3Aui-lovelace.yaml&type=code",
    kind: "github",
    note: "Catches dashboards in repositories that carry no topics.",
    automated: true,
  },
  {
    name: "Home Assistant Community — Share your Lovelace",
    url: "https://community.home-assistant.io/t/share-your-lovelace/8081",
    kind: "forum",
    note: "The long-running showcase thread. Posts are prose plus screenshots, so entries from here are link-only; many posts point at a GitHub repo that the ingester then picks up.",
    automated: false,
  },
  {
    name: "Home Assistant Community — Lovelace & Frontend category",
    url: "https://community.home-assistant.io/c/configuration/dashboards/26",
    kind: "forum",
    note: "Dashboard design discussion and card releases.",
    automated: false,
  },
  {
    name: "r/homeassistant",
    url: "https://www.reddit.com/r/homeassistant/",
    kind: "reddit",
    note: "Dashboard screenshots are posted daily. Reddit content is not licensed for redistribution, so nothing is copied — only linked where the author also published a repo.",
    automated: false,
  },
  {
    name: "awesome-home-assistant",
    url: "https://github.com/frenck/awesome-home-assistant",
    kind: "list",
    note: "Curated index of HA projects; a useful seed list of configuration repositories and custom cards.",
    automated: false,
  },
  {
    name: "Home Assistant — Dashboard documentation",
    url: "https://www.home-assistant.io/dashboards/",
    kind: "docs",
    note: "Reference for card schemas, the sections view, badges and tile features. The studio renderer tracks this.",
    automated: false,
  },
  {
    name: "Mushroom",
    url: "https://github.com/piitaya/lovelace-mushroom",
    kind: "github",
    note: "Apache-2.0. Bundled in the renderer so Mushroom dashboards render for real.",
    automated: false,
  },
  {
    name: "Bubble Card",
    url: "https://github.com/Clooos/Bubble-Card",
    kind: "github",
    note: "MIT. Bundled in the renderer.",
    automated: false,
  },
];
