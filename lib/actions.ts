"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { session } from "./auth";
import { analyze, hasAnalysis, writeConsequence } from "./analysis";
import { configured } from "./firebase/config";
import { applyCommand, CampaignError } from "./firebase/workflow";
import {
  accessCookie, refreshCookie, firebaseAuth, cookieOptions,
  type FirebaseCredentials, type FirebaseUser,
} from "./firebase/identity";

export type FormState = {ok:boolean;message:string} | null;
const credentials=z.object({email:z.email().max(254),password:z.string().min(8).max(72)});

export async function authenticate(mode:"login"|"register",_:FormState,form:FormData):Promise<FormState> {
  if(!configured()) return {ok:false,message:"Configure o Firebase conforme o README."};
  const input=credentials.safeParse({email:String(form.get("email") ?? "").trim(),password:form.get("password")});
  if(!input.success) return {ok:false,message:"Informe um e-mail válido e uma senha de 8 a 72 caracteres."};
  let token:FirebaseCredentials;
  try {
    token=await firebaseAuth<FirebaseCredentials>(mode==="register"?"signUp":"signInWithPassword",
      {...input.data,returnSecureToken:true});
    const {users}=await firebaseAuth<{users?:FirebaseUser[]}>("lookup",{idToken:token.idToken});
    if(!users?.[0]?.emailVerified) {
      await firebaseAuth("sendOobCode",{requestType:"VERIFY_EMAIL",idToken:token.idToken});
      return {ok:true,message:"Enviamos um link de confirmação ao seu e-mail. Confirme o cadastro e entre."};
    }
  } catch {
    return {ok:false,message:"Falha na autenticação. Confira os dados e tente novamente."};
  }
  const store=await cookies();
  store.set(accessCookie,token.idToken,{...cookieOptions,maxAge:Math.max(1,Number(token.expiresIn)-60)});
  store.set(refreshCookie,token.refreshToken,{...cookieOptions,maxAge:7*24*60*60});
  redirect("/campanha");
}

export async function signOut() {
  const store=await cookies();
  store.delete(accessCookie);
  store.delete(refreshCookie);
  redirect("/");
}

export async function previewConsequence(spellId:string,reviewId:string,direction:string) {
  const {db,master}=await session();
  if (!master) return {error:"Ação reservada ao mestre."};
  const input=z.object({spellId:z.uuid(),reviewId:z.uuid(),direction:z.string().trim().min(1).max(2000)})
    .safeParse({spellId,reviewId,direction});
  if (!input.success) return {error:"Descreva a consequência em até 2.000 caracteres."};
  const {data:spell}=await db.from("spells").select("name,formula,intention,description,status,review_id").eq("id",spellId).maybeSingle();
  if (!spell || spell.status!=="review" || spell.review_id!==reviewId) return {error:"A solicitação não está em revisão."};
  try {
    const {name,formula,intention,description}=spell;
    return {text:await writeConsequence({name,formula,intention,description},input.data.direction)};
  } catch {
    return {error:"A IA não gerou a prévia. Tente de novo ou escreva o texto final."};
  }
}

export async function command(action:string,_:FormState,form:FormData):Promise<FormState> {
  const {db,id}=await session();
  const fields=[...form].filter((entry):entry is [string,string]=>!entry[0].startsWith("$ACTION_") && typeof entry[1]==="string");
  if(fields.length>30 || fields.some(([name,value])=>name.length>50 || value.length>10000))
    return {ok:false,message:"O texto ultrapassa o limite permitido."};
  const input=Object.fromEntries(fields);
  const useAi=action==="submit" && hasAnalysis();
  let data;
  try {
    data=await applyCommand(id,action,input,useAi);
  } catch(error) {
    return {ok:false,message:error instanceof CampaignError ? error.message : "Registro indisponível. Confira os campos e tente novamente."};
  }
  let message="Registro atualizado.";
  if(action==="submit") {
    const completed=useAi && await analyze(db,data.id,data.review!,data.character!).catch(()=>false);
    message=completed?"Análise registrada. Aguardando decisão do mestre."
      :useAi?"Encantamento enviado. Se a análise ficar indisponível, o mestre pode abrir a revisão manual."
      :"Encantamento enviado para revisão manual.";
  }
  revalidatePath("/campanha","layout");
  revalidatePath("/regras");
  if(action==="character") redirect("/campanha/personagem/"+data.id);
  return {ok:true,message};
}
