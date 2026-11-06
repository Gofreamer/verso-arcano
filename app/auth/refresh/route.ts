import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accessCookie, refreshCookie, refreshIdentity, cookieOptions } from "@/lib/firebase/identity";

export async function GET(request:Request) {
  const store=await cookies();
  const token=store.get(refreshCookie)?.value;
  const result=process.env.FIREBASE_API_KEY && token ? await refreshIdentity(token).catch(()=>null) : null;
  const response=NextResponse.redirect(new URL(result?"/campanha":"/",request.url));
  response.headers.set("Cache-Control","private, no-store");
  if(result) {
    response.cookies.set(accessCookie,result.id_token,{...cookieOptions,maxAge:Math.max(1,Number(result.expires_in)-60)});
    response.cookies.set(refreshCookie,result.refresh_token,{...cookieOptions,maxAge:7*24*60*60});
  } else {
    response.cookies.delete(accessCookie);
    response.cookies.delete(refreshCookie);
  }
  return response;
}
