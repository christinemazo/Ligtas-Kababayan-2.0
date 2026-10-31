import { sb } from "./api.js";
import { $, esc } from "./shared.js";

const ROLES = {
  super_admin: () => import("./super/index.js"),
  barangay_admin: () => import("./barangay/index.js"),
};

let current = null; // the role folder that is running right now
let runId = 0; // so an older show() cannot overwrite a newer one

function showMessage(title, text) {
  $("#app").innerHTML = `
    <div class="login">
      <div class="card login-card">
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
        <button class="btn sec" id="out2" style="margin-top:10px">Sign out</button>
      </div>
    </div>`;
  $("#out2").onclick = signOut;
}

async function show() {
  const run = ++runId;

  const {
    data: { session },
  } = await sb.auth.getSession();

  $("#login").hidden = !!session;
  $("#app").hidden = !session;

  // Close whatever role dashboard was open (sign out, or signing in as someone else)
  await current?.stop();
  current = null;
  if (!session) return;

  const { data: me, error } = await sb
    .from("admins")
    .select("role, full_name, barangay_id, barangays(name)")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (run !== runId) return;

  if (error) return showMessage("Could not load your account", "Check your connection and sign in again.");
  const loadRole = ROLES[me?.role];
  if (!loadRole) return showMessage("Not set up as an admin yet", "This account has no admin role. Ask the project team to add it.");

  const role = await loadRole();
  if (run !== runId) return;

  current = role;
  await role.start({ me, user: session.user, signOut });
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
for (const id of ["#em", "#pw"]) {
  $(id).addEventListener("keydown", (e) => e.key === "Enter" && signIn());
}

show();
