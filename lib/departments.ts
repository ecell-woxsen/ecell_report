type DepartmentLike = {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
};

export function normalizeDepartmentName(
  departmentOrName?: DepartmentLike | string | null,
  slug?: string | null
) {
  const name =
    typeof departmentOrName === "string"
      ? departmentOrName
      : departmentOrName?.name;
  const departmentSlug =
    slug ?? (typeof departmentOrName === "string" ? undefined : departmentOrName?.slug);

  if (departmentSlug === "outreach" || name === "Outreach") {
    return "Outreach and Partnerships";
  }

  if (
    departmentSlug === "documentation" ||
    departmentSlug === "pr" ||
    name === "PR & Partnerships"
  ) {
    return "Documentation";
  }

  return name || "Unassigned";
}

export function normalizeDepartmentDescription(department?: DepartmentLike | null) {
  const name = normalizeDepartmentName(department);

  if (name === "Outreach and Partnerships") {
    return "Founder outreach, sponsorships, and partnerships";
  }

  if (name === "Documentation") {
    return "Documentation, records, and public-facing updates";
  }

  return department?.description || "";
}
