type RoleUser = {
  approved?: boolean;
  departmentId?: string;
  roles?: readonly string[];
} | null | undefined;

export function isLeadershipUser(user: RoleUser) {
  return Boolean(
    user?.approved &&
      user.roles?.some((role) => ["core_team", "president", "admin"].includes(role))
  );
}

export function canSubmitDepartmentReport(user: RoleUser) {
  if (!user?.approved) return false;
  if (isLeadershipUser(user)) return true;
  return Boolean(user.departmentId && user.roles?.includes("department_head"));
}

export function canEditReportForDepartment(user: RoleUser, departmentId?: string) {
  if (!user?.approved || !departmentId) return false;
  if (isLeadershipUser(user)) return true;
  return Boolean(
    user.departmentId === departmentId && user.roles?.includes("department_head")
  );
}
