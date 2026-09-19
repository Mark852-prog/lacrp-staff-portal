// Fill in real Discord role IDs here.
// To get a role ID: enable Developer Mode (User Settings -> Advanced),
// then right-click a role in Server Settings -> Roles -> Copy Role ID.

module.exports = {
  // Listed HIGHEST rank first. The first match found on a member's role
  // list is used as their displayed rank label.
  ranks: [
    { id: "1535664627621429258", label: "Founder" },
    { id: "1535664901199237267", label: "Director" },
    { id: "1535664831489900615", label: "Senior High Rank" },
    { id: "1535666571429548112", label: "High Rank" },
    { id: "1535669374051160226", label: "Supervisory Team" },
    { id: "1535668008545030194", label: "Internal Affairs" },
    { id: "1535668246433497200", label: "Administrator" },
    { id: "1535668682942972004", label: "Senior Moderator" },
    { id: "1535668714689527878", label: "Moderator" },
    { id: "1536351376605454397", label: "Trial Moderator" },
    { id: "1535668859414118450", label: "Intern" },
  ],

  // Anyone holding ANY of these role IDs gets access to the Admin
  // review panel (pending quiz submissions, answer key, verdicts).
  adminRoleIds: [
    "1535664627621429258",
    "1535664901199237267",
    "1535668246433497200",
    "1535664831489900615",
    "1535666571429548112",
    "1535669374051160226",
    "1535668008545030194"
  ],

  // Senior High Rank tier. Sits ABOVE adminRoleIds.
  seniorRoleIds: [
    "1535664831489900615",
    "1535666571429548112",
    "1535669374051160226",
  ],

  // Anyone holding ANY of these role IDs is allowed to open and submit
  // the quiz. Everyone else gets a "not assigned to you" message instead
  // of the quiz, even if they can log in fine.
  // Admins (adminRoleIds above) can ALSO always open the quiz, so they
  // can preview/test it, remove that behavior in roles.js if you don't
  // want that.
  traineeRoleIds: [
    "1535668859414118450",
  ],
};