# Renderer coverage

What the studio draws itself, what it runs for real, and what it does not do.

## Built-in cards — implemented natively

| Card | Notes |
|---|---|
| `tile` | Icon colour by domain and state, `vertical`, `hide_state`, `state_content`, `show_entity_picture`, and the feature row |
| `entities` | Rows, `show_header_toggle`, `divider` / `section` / `weblink` / `button` rows, `secondary_info` |
| `glance` | `columns`, `show_name` / `show_state` / `show_icon` |
| `button` | `show_name` / `show_state` / `show_icon`, state colouring |
| `entity` | Compact name + big value |
| `light` | Brightness dial, uses the bulb's own `rgb_color` |
| `thermostat` | Target dial, current temperature, `hvac_action`, HVAC mode row |
| `humidifier` | Target humidity dial |
| `alarm-panel` | State colour, arm buttons, keypad |
| `area` | Pulls the area's sensors and controls from the registries |
| `weather-forecast` | Current conditions, attributes, 5-day forecast row |
| `sensor` | Value plus optional `graph: line` sparkline |
| `gauge` | Arc with `min` / `max` / `severity` |
| `history-graph` | One line per entity over `hours_to_show` |
| `statistic` · `statistics-graph` | Value / bar series |
| `energy-*` | Consumed / solar / returned summary with a bar series |
| `media-control` | Artwork gradient, title, progress, transport row, volume |
| `markdown` | Headings, lists, emphasis, code, links; `states('…')` resolved |
| `picture` · `picture-entity` · `picture-glance` · `picture-elements` | Image with footer / overlay elements |
| `iframe` | Labelled placeholder — external pages are not loaded in a preview |
| `map` | Pins per tracked entity |
| `todo-list` · `shopping-list` · `calendar` · `logbook` | Representative content |
| `heading` | `heading_style`, icon, trailing badges |
| `grid` · `horizontal-stack` · `vertical-stack` | Nested, with `columns` / `square` |
| `conditional` | Evaluates `state` / `state_not`; a false condition dims rather than hides, so you can see it |
| `entity-filter` | Applies `state_filter` and defers to the inner card |

## Tile features — implemented

`light-brightness`, `light-color-temp`, `cover-open-close`, `cover-position`,
`cover-tilt-position`, `target-temperature`, `climate-hvac-modes`,
`climate-preset-modes`, `fan-speed`, `fan-preset-modes`,
`humidifier-target-humidity`, `humidifier-modes`, `toggle`, `lock-commands`,
`lock-open-door`, `vacuum-commands`, `media-player-volume-slider`,
`media-player-playback`, `select-options`, `alarm-modes`, `numeric-input`,
`update-actions`, `counter-actions`, `water-heater-operation-modes`.

An unrecognised feature renders as a labelled strip rather than disappearing.

## Views

`masonry` (with HA's running-size column distribution), `sections` (12-column
grid, `max_columns`, `column_span`, per-card `grid_options`), `panel`,
`sidebar`. Badges render above every view type.

## HACS bundles — executed for real

Mushroom, Bubble Card, button-card, mini-graph-card, apexcharts-card,
auto-entities, layout-card, card-mod. These are the authors' own builds, pinned
to a version, proxied through `/api/hacs/[slug]`.

The studio registers minimal `ha-card`, `ha-icon`, `ha-state-icon`,
`ha-svg-icon` and `ha-ripple` elements because those bundles compose them and
the real frontend normally provides them.

## Known limits

- **Jinja templates are not evaluated.** No backend exists to evaluate them.
  `markdown` resolves simple `states('…')` and elides the rest.
- **History is synthetic**, generated deterministically per entity so that
  screenshots are stable.
- **`auto-entities` reports its filter, not its output**, in the gallery's card
  inventory, because the inventory is static analysis.
- **Interactions are inert.** Sliders and buttons show state; they never send a
  command, by design.
- **Custom cards outside the bundled registry** fall back to a labelled
  placeholder. Fetching them from a connected instance would require
  authenticating to it for static assets from the browser.
