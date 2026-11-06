import "server-only";

// Firestore REST mantém a mesma implementação no Node local e no Worker.
export type Document = { id:string; [key:string]: any };
type Value = { nullValue:null } | { booleanValue:boolean } | { integerValue:string }
  | { doubleValue:number } | { stringValue:string }
  | { mapValue:{fields?:Record<string,Value>} } | { arrayValue:{values?:Value[]} };
type Encoded = {name:string; fields?:Record<string,Value>};
type Filter = {field:string; value:string | boolean | string[]};

function encode(value: unknown): Value {
  if (value === null || value === undefined) return {nullValue:null};
  if (typeof value === "boolean") return {booleanValue:value};
  if (typeof value === "number") return Number.isInteger(value) ? {integerValue:String(value)} : {doubleValue:value};
  if (typeof value === "string") return {stringValue:value};
  if (Array.isArray(value)) return {arrayValue:{values:value.map(encode)}};
  if (typeof value === "object") return {mapValue:{fields:fields(value)}};
  throw new Error("Valor incompatível com Firestore");
}

function fields(value: object) {
  return Object.fromEntries(Object.entries(value).map(([key,entry]) => [key,encode(entry)]));
}

function decode(value: Value): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decode);
  return decodeFields(value.mapValue.fields);
}

function decodeFields(record?: Record<string,Value>) {
  return Object.fromEntries(Object.entries(record ?? {}).map(([key, value]) => [key,decode(value)]));
}

function document({name, fields}: Encoded): Document {
  return {...decodeFields(fields), id:name.split("/").at(-1)!};
}

function base64(bytes: Uint8Array | string) {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  return btoa(String.fromCharCode(...data)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
}

let access: { token:string; expires:number; identity:string } | undefined;
async function authorization() {
  const identity = process.env.FIREBASE_CLIENT_EMAIL!;
  if (access?.identity === identity && Date.now() < access.expires) return access.token;
  const now = Math.floor(Date.now()/1000);
  const endpoint = "https://oauth2.googleapis.com/token";
  const jwt = base64(JSON.stringify({alg:"RS256",typ:"JWT"})) + "." + base64(JSON.stringify({
    iss:identity, aud:endpoint, scope:"https://www.googleapis.com/auth/datastore", iat:now, exp:now+3600,
  }));
  const pem = process.env.FIREBASE_PRIVATE_KEY!.replaceAll("\\n","\n").replace(/-----[^-]+-----|\s/g,"");
  const key = await crypto.subtle.importKey("pkcs8",Uint8Array.from(atob(pem), c=>c.charCodeAt(0)),
    {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const signed = await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(jwt));
  const response = await fetch(endpoint,{
    method:"POST",cache:"no-store",
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt+"."+base64(new Uint8Array(signed))}),
  });
  if (!response.ok) throw new Error("Credencial do Firestore recusada");
  const result = await response.json() as {access_token:string;expires_in:number};
  access = {token:result.access_token,expires:Date.now()+(result.expires_in-60)*1000,identity};
  return access.token;
}

export class FirestoreError extends Error {
  constructor(public status:string) { super("Operação do Firestore falhou: " + status); }
}

function root() {
  return "projects/" + process.env.FIREBASE_PROJECT_ID + "/databases/(default)/documents";
}

async function request<T>(suffix: string, body?: object, method?: string): Promise<T> {
  const response = await fetch("https://firestore.googleapis.com/v1/" + root() + suffix,{
    method: method ?? (body ? "POST" : "GET"), cache:"no-store",
    headers: {"Authorization":"Bearer " + await authorization(),"Content-Type":"application/json"},
    body:body && JSON.stringify(body),
  });
  if (!response.ok) {
    const result = await response.json().catch(()=>null) as {error?:{status?:string}} | null;
    throw new FirestoreError(result?.error?.status ?? String(response.status));
  }
  return response.json();
}

export interface Store {
  get(collection:string,id:string):Promise<Document | null>;
  list(collection:string,filter?:Filter):Promise<Document[]>;
}
export interface Writer extends Store {
  put(collection:string,id:string,value:object):void;
  delete(collection:string,id:string):void;
}

function safeId(value:string) {
  if (!value || value.includes("/") || value === "." || value === "..") throw new Error("Identificador inválido");
  return encodeURIComponent(value);
}

function store(transaction?:string): Store {
  return {
    async get(collection,id) {
      try {
        const suffix = "/" + collection + "/" + safeId(id) + (transaction ? "?transaction=" + encodeURIComponent(transaction) : "");
        return document(await request<Encoded>(suffix));
      } catch (error) {
        if (error instanceof FirestoreError && error.status === "NOT_FOUND") return null;
        throw error;
      }
    },
    async list(collection,filter) {
      const structuredQuery = {
        from:[{collectionId:collection}],
        ...(filter && {where:{fieldFilter:{
          field:{fieldPath:filter.field},op:Array.isArray(filter.value)?"IN":"EQUAL",value:encode(filter.value),
        }}}),
      };
      const results = await request<{document?:Encoded}[]>(":runQuery",{structuredQuery,transaction});
      return results.flatMap(row => row.document ? [document(row.document)] : []);
    },
  };
}

export const firestore = store();

export async function transact<T>(work:(db:Writer)=>Promise<T>):Promise<T> {
  for (let attempt=0;attempt<4;attempt++) {
    const {transaction} = await request<{transaction:string}>(":beginTransaction",{});
    const writes: ({update:Encoded} | {delete:string})[] = [];
    try {
      const result = await work({
        ...store(transaction),
        put(collection,id,value) {
          safeId(id);
          writes.push({update:{name:root()+"/"+collection+"/"+id,fields:fields(value)}});
        },
        delete(collection,id) {
          safeId(id);
          writes.push({delete:root()+"/"+collection+"/"+id});
        },
      });
      await request(":commit",{transaction,writes});
      return result;
    } catch (error) {
      await request(":rollback",{transaction}).catch(()=>{});
      if (!(error instanceof FirestoreError) || error.status !== "ABORTED" || attempt === 3) throw error;
      await new Promise(resolve=>setTimeout(resolve,25 * (attempt+1)));
    }
  }
  throw new Error("Transação indisponível");
}
