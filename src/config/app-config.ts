import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "ResearchLab AI AI Research Experimentation Platform",
  shortName: "ResearchLab AI",
  version: packageJson.version,
  copyright: `© ${currentYear}, ResearchLab AI.`,
  meta: {
    title: "ResearchLab AI AI Research Experimentation Platform",
    description: "Administer users, projects, AI providers, experiments, usage, and platform operations.",
  },
};
