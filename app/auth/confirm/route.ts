import { firebaseAuth } from "@/lib/firebase/identity";
import { NextResponse } from "next/server";

export async function GET(request:Request) {
  const url=new URL(request.url);
  const code=url.searchParams.get("oobCode");
  if(code && url.searchParams.get("mode")==="verifyEmail") {
    try {
      await firebaseAuth("update",{oobCode:code});
      return NextResponse.redirect(new URL("/?confirmacao=ok",url));
    } catch { /* Exibe a falha no portal. */ }
  }
  return NextResponse.redirect(new URL("/?confirmacao=invalida",url));
}
