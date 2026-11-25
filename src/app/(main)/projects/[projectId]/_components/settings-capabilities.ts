/** What the Platform applies, as the settings response reports it: `<section>.<field>` to its capability. */
export type Capabilities = Record<string, { supported: boolean; reason_code: string | null }>;

/** Tabs that hold only project settings. Other tabs (General, Members, Integrations and so on) have more than that. */
const SETTINGS_ONLY_TABS: Record<string, string> = {
  runs: "runs",
  models: "models",
  literature: "literature",
  review: "review",
  data: "data",
};

/** A field is shown only when the Platform says it applies it. A field the response does not list is not shown. */
export function fieldSupported(capabilities: Capabilities, section: string, field: string) {
  return capabilities[`${section}.${field}`]?.supported === true;
}

export function sectionHasSupported(capabilities: Capabilities, section: string) {
  return Object.entries(capabilities).some(
    ([key, capability]) => key.startsWith(`${section}.`) && capability.supported,
  );
}

/** A tab made only of settings is hidden while none of its fields is applied. */
export function tabVisible(capabilities: Capabilities, tab: string) {
  const section = SETTINGS_ONLY_TABS[tab];
  return section === undefined || sectionHasSupported(capabilities, section);
}

/** The tab to open: the requested one if it is shown, otherwise the first. */
export function openTab(capabilities: Capabilities, requested: string | null, tabs: readonly string[]) {
  const shown = tabs.filter((tab) => tabVisible(capabilities, tab));
  return shown.find((tab) => tab === requested) ?? shown[0];
}
