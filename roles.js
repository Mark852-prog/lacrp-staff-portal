const { ranks, adminRoleIds, seniorRoleIds, traineeRoleIds } = require("./roles.config");

function resolveRank(roleIds) {
  const match = ranks.find((r) => roleIds.includes(r.id));
  return match ? match.label : "Staff";
}

function isSenior(roleIds) {
  return roleIds.some((id) => seniorRoleIds.includes(id));
}

// Senior High Rank automatically counts as Admin too, a senior shouldn't
// lose access to the regular review queue.
function isAdmin(roleIds) {
  return roleIds.some((id) => adminRoleIds.includes(id)) || isSenior(roleIds);
}

// Admins can always open the quiz too (handy for previewing/testing it).
// Remove the `|| isAdmin(roleIds)` below if you want it strictly
// Intern-only with no exceptions.
function isTrainee(roleIds) {
  return roleIds.some((id) => traineeRoleIds.includes(id)) || isAdmin(roleIds);
}

module.exports = { resolveRank, isAdmin, isSenior, isTrainee };
