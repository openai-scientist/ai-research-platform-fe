import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "OpenAI Scientist",
  shortName: "OpenAI Scientist",
  tagline: "From a research idea to a validated, evidence-based scientific report.",
  // The brand guidelines ask for this wherever the name appears in a footer or an About page.
  independence: "Independent project. Not affiliated with OpenAI.",
  // Where people write about their account, their data or these terms.
  contactEmail: "support@beyond8.io.vn",
  version: packageJson.version,
  copyright: `© ${currentYear}, OpenAI Scientist.`,
  meta: {
    title: "OpenAI Scientist",
    description: "From a research idea to a validated, evidence-based scientific report.",
  },
};
