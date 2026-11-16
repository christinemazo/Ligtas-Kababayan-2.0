// auth.js: account registration, authentication, password recovery and sign out for citizens (Supabase Auth, email + password).
import { sb } from './supabase';

// Supabase error pattern -> clear message shown to the user. The first match wins.
const FRIENDLY = [
  [/invalid login credentials/i, 'Incorrect email or password. If you do not have an account, select "Create an account".'],
  [/already registered|already been registered/i, 'An account with this email address already exists. Please sign in.'],
  [/different from the old password/i, 'The new password must be different from the current password.'],
  [/password should be at least|weak password/i, 'The password does not meet the requirements. Use at least 6 characters.'],
  [/rate limit|only request this after/i, 'Too many attempts. Wait a few minutes before trying again.'],
  [/token.*(expired|invalid)|expired|otp/i, 'The verification code is incorrect or has expired. Request a new code.'],
  [/network|fetch|timeout/i, 'No internet connection. Connect to a network and try again.'],
];

const friendly = (message = '') =>
  FRIENDLY.find(([pattern]) => pattern.test(message))?.[1] || message || 'An unexpected error occurred. Please try again.';

// Every Supabase call below uses this: if there is an error, throw it with a friendly message.
function check(error) {
  if (error) throw new Error(friendly(error.message));
}

// Registers an account and signs in. The full name is stored on the account to pre-fill the SOS form.
export async function signUp(email, password, fullName) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  check(error);
  // If the project asks for email confirmation there is no session yet
  if (!data.session) throw new Error('A confirmation email has been sent. Confirm your email address, then sign in.');
  return data.user;
}

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  check(error);
  return data.user;
}

export const signOut = () => sb.auth.signOut();

// ----- Password recovery (3 steps, no web link required) -----

// Step 1: email a one-time code. Supabase answers the same whether or not the email has an account,
// so nobody can use this to find out who is registered.
export async function sendResetCode(email) {
  check((await sb.auth.resetPasswordForEmail(email)).error);
}

// Step 2: check the code. If it is right, Supabase signs the person in for the next step.
export async function verifyResetCode(email, code) {
  check((await sb.auth.verifyOtp({ email, token: code, type: 'recovery' })).error);
}

// Step 3: save the new password on the signed-in account.
export async function setNewPassword(password) {
  check((await sb.auth.updateUser({ password })).error);
}