export function configured() {
  return Boolean(process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID
    && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}
