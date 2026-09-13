const { ranks, adminRoleIds, traineeRoleIds } = require("./roles.config");

function resolveRank(roleIds) {
  const match = ranks.find((r) => roleIds.includes(r.id));
  return match ? match.label : "Staff";
}

function isAdmin(roleIds) {
  return roleIds.some((id) => adminRoleIds.includes(id));
}

// Admins can always open the quiz too (handy for previewing/testing it).
// Remove the `|| isAdmin(roleIds)` below if you want it strictly
// Intern-only with no exceptions.
function isTrainee(roleIds) {
  return roleIds.some((id) => traineeRoleIds.includes(id)) || isAdmin(roleIds);
}

module.exports = { resolveRank, isAdmin, isTrainee };
