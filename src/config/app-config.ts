import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "OpenAI Scientist",
  shortName: "OpenAI Scientist",
  tagline: "From a research idea to a validated, evidence-based scientific report.",
  // The brand guidelines ask for this wherever the name appears in a footer or an About page.
  independence: "Independent project. Not affiliated with OpenAI.",
  version: packageJson.version,
  copyright: `© ${currentYear}, OpenAI Scientist.`,
  meta: {
    title: "OpenAI Scientist",
    description: "From a research idea to a validated, evidence-based scientific report.",
  },
};
