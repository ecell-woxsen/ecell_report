type RoleUser = {
  approved?: boolean;
  departmentId?: string;
  roles?: readonly string[];
} | null | undefined;

const leadershipRoles = [
  "core_team",
  "president",
  "vice_president",
  "advisor",
  "admin",
];

const departmentReportRoles = ["department_head", "team_lead"];

export function isLeadershipUser(user: RoleUser) {
  return Boolean(
    user?.approved &&
      user.roles?.some((role) => leadershipRoles.includes(role))
  );
}

export function canSubmitDepartmentReport(user: RoleUser) {
  if (!user?.approved) return false;
  if (isLeadershipUser(user)) return true;
  return Boolean(
    user.departmentId &&
      user.roles?.some((role) => departmentReportRoles.includes(role))
  );
}

export function canEditReportForDepartment(user: RoleUser, departmentId?: string) {
  if (!user?.approved || !departmentId) return false;
  if (isLeadershipUser(user)) return true;
  return Boolean(
    user.departmentId === departmentId &&
      user.roles?.some((role) => departmentReportRoles.includes(role))
  );
}
