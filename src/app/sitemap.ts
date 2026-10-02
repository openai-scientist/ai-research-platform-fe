import type { MetadataRoute } from "next";

const SITE_URL = "https://studio-admin.arhamkhnz.com";

const PUBLIC_ROUTES = [
  "/admin",
  "/admin/users",
  "/admin/projects",
  "/admin/providers",
  "/admin/decision-providers",
  "/admin/usage",
  "/admin/system",
  "/admin/logs",
  "/admin/settings",
  "/dashboard/default",
  "/dashboard/crm",
  "/dashboard/finance",
  "/dashboard/analytics",
  "/dashboard/productivity",
  "/dashboard/ecommerce",
  "/dashboard/academy",
  "/dashboard/logistics",
  "/dashboard/infrastructure",
  "/dashboard/file-manager",
  "/dashboard/patient-monitoring",
  "/dashboard/calendar",
  "/dashboard/kanban",
  "/dashboard/tasks",
  "/dashboard/invoice",
  "/dashboard/profile",
  "/dashboard/users",
  "/dashboard/roles",
  "/auth/login",
  "/auth/register",
  "/chat",
  "/mail",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
  }));
}
