// Entry point: login, session and role router.
// After sign-in it finds the role and loads ONE of the two role files:
//   super_admin    -> ./super-admin-dashboard.js
//   anything else  -> ./barangay-dashboard.js
// Each role file exports start(me) and stop().
import { sb } from "./api.js";
import { $ } from "./Shared.js";

let current = null; // the role file that is running right now
let runId = 0; // so an older show() cannot overwrite a newer one

async function show() {
  const run = ++runId;

  const {
    data: { session },
  } = await sb.auth.getSession();

  $("#login").hidden = !!session;
  $("#dash").hidden = !session;

  // Close whatever role screen was open (sign out, or signing in as someone else)
  await current?.stop();
  current = null;
  if (!session) return;

  const { data: me } = await sb
    .from("admins")
    .select("role, barangay_id, barangays(name)")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (run !== runId) return;

  if (!me) {
    $("#who").textContent = "Not set up as an admin yet";
    $("#app").innerHTML = "<p>This account has no admin role.</p>";
    return;
  }

  const isSuper = me.role === "super_admin";
  $("#who").textContent = isSuper ? "All barangays dashboard" : `${me.barangays?.name} dashboard`;

  const role = await import(isSuper ? "./super-admin-dashboard.js" : "./barangay-dashboard.js");
  if (run !== runId) return;

  current = role;
  await role.start(me);
}

async function signIn() {
  const { error } = await sb.auth.signInWithPassword({
    email: $("#em").value,
    password: $("#pw").value,
  });
  $("#err").textContent = error ? error.message : "";
  if (!error) show();
}

async function signOut() {
  await sb.auth.signOut();
  show();
}

$("#go").onclick = signIn;
$("#out").onclick = signOut;

show();