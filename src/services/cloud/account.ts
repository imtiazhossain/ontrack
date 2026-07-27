import { getSupabaseClient } from './supabase';

export class CloudAccountError extends Error {}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new CloudAccountError('Cloud sync is not configured for this build.');
  }
  return client;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await requireClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new CloudAccountError(error.message);
  return data.user;
}

export async function createAccountWithEmail(email: string, password: string) {
  const { data, error } = await requireClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new CloudAccountError(error.message);
  return data.user;
}

export async function signOutCloudAccount() {
  const { error } = await requireClient().auth.signOut();
  if (error) throw new CloudAccountError(error.message);
}
