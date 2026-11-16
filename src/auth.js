// auth.js: sign up, sign in and sign out for citizens (Supabase Auth, email + password).
import { sb } from './supabase';

// Turns Supabase's messages into short sentences a citizen can act on
function friendly(message = '') {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password. If you have no account yet, tap "Create an account".';
  if (/already registered|already been registered/i.test(message)) return 'This email already has an account. Sign in instead.';
  if (/password should be at least|weak password/i.test(message)) return 'Choose a stronger password (at least 6 characters).';
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/network|fetch|timeout/i.test(message)) return 'No internet. Connect and try again.';
  return message || 'Something went wrong. Please try again.';
}

// Creates an account and signs in. The name is kept on the account so the SOS form can fill it in.
export async function signUp(email, password, fullName) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) throw new Error(friendly(error.message));
  // If the project asks for email confirmation there is no session yet
  if (!data.session) throw new Error('Check your email to confirm your account, then sign in.');
  return data.user;
}

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendly(error.message));
  return data.user;
}

export const signOut = () => sb.auth.signOut();