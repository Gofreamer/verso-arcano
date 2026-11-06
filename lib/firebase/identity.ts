import "server-only";

export const accessCookie = "arcane_firebase_access";
export const refreshCookie = "arcane_firebase_refresh";
export const cookieOptions = {
  httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production",
};

export class IdentityError extends Error {}

export async function firebaseAuth<T>(action: string, input: object): Promise<T> {
  const endpoint = new URL("https://identitytoolkit.googleapis.com/v1/accounts:" + action);
  endpoint.searchParams.set("key", process.env.FIREBASE_API_KEY!);
  const response = await fetch(endpoint, {
    method: "POST", cache:"no-store", headers: {"Content-Type":"application/json", "X-Firebase-Locale":"pt-BR"},
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    if (response.status >= 500) throw new Error("Autenticação indisponível");
    throw new IdentityError("Solicitação de autenticação recusada");
  }
  return response.json();
}

export type FirebaseUser = {localId:string; email:string; emailVerified:boolean; disabled?:boolean};
export type FirebaseCredentials = {idToken:string; refreshToken:string; expiresIn:string};
export type FirebaseRefresh = {id_token:string; refresh_token:string; expires_in:string};

export async function refreshIdentity(token: string): Promise<FirebaseRefresh | null> {
  const endpoint = new URL("https://securetoken.googleapis.com/v1/token");
  endpoint.searchParams.set("key", process.env.FIREBASE_API_KEY!);
  const response = await fetch(endpoint, {
    method:"POST", cache:"no-store",
    body: new URLSearchParams({ grant_type:"refresh_token", refresh_token:token }),
  });
  return response.ok ? response.json() : null;
}
