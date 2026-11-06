import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { configured } from "./firebase/config";
import { database, isMaster } from "./firebase/data";
import { firestore, transact } from "./firebase/firestore";
import { accessCookie, refreshCookie, firebaseAuth, IdentityError, type FirebaseUser } from "./firebase/identity";

export { database };

export const currentUser = cache(async () => {
  if (!configured()) return null;
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token) return null;
  try {
    const {users} = await firebaseAuth<{users?:FirebaseUser[]}>("lookup",{idToken:token});
    const user = users?.[0];
    return user?.emailVerified && !user.disabled ? user : null;
  } catch(error) {
    if (error instanceof IdentityError) return null;
    throw error;
  }
});

export const session = cache(async () => {
  const user = await currentUser();
  if (!user) {
    const store=await cookies();
    redirect(configured() && !store.has(accessCookie) && store.has(refreshCookie) ? "/auth/refresh" : "/");
  }
  const id = user.localId;
  let profile = await firestore.get("profiles",id);
  if (!profile) {
    profile = await transact(async db=>{
      const previous=await db.get("profiles",id);
      if(previous) return previous;
      const created={id,role:isMaster(id)?"master":"player",created_at:new Date().toISOString()};
      db.put("profiles",id,created);
      return created;
    });
  }
  const master = isMaster(id,profile);
  return {db:database({id,master}),id,master,email:user.email};
});

export function read<T>(result:{data:T|null;error:Error|null}):T {
  if(result.error || result.data===null) throw new Error("Falha ao consultar o arquivo da campanha.");
  return result.data;
}
