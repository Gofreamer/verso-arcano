import "server-only";
import { firestore, type Document, type Store } from "./firestore";
import type { CharacterCondition } from "../conditions";
import { pantheon, type Divinity } from "../pantheon";

export const initialTier = {
  id:"00000000-0000-4000-8000-000000000001", name:"Iniciação (provisório)", rank:0,
  limits:"Efeitos locais e pequenos. A escala final é definida pelo mestre.", max_range:5, max_duration:1, max_cost:3,
};
export const initialSettings = {id:"campaign",starter_tier:initialTier.id,progression:"",require_bond:false,min_verses:2};
export type Viewer = {id:string;master:boolean};

export async function tiers(db:Store) {
  const rows = await db.list("tiers");
  if (!rows.some(row => row.id === initialTier.id)) rows.push(initialTier);
  return rows;
}

export function isMaster(uid:string, profile?:Document|null) {
  return Boolean(uid && (uid === process.env.FIREBASE_INITIAL_MASTER_UID || profile?.role === "master"));
}

const playerCollections = new Set(["profiles","tiers","settings","attribute_defs","lore","pantheon"]);
const ownedCollections = new Set(["characters","attributes","items","oaths","bonds","spells","spell_versions","spell_reviews","conditions"]);
type Condition = {field:string; value:string | boolean | string[]};
type Result<T> = {data:T|null;error:Error|null;count:number|null};

type CollectionRows = {
  pantheon: Divinity;
  conditions: CharacterCondition;
  tiers: typeof initialTier;
  settings: typeof initialSettings;
  items: {id:string;name:string;category:string;quantity:number;description:string;image_url?:string|null;
    rarity?:string;weight?:number;tags?:string;slots?:string[];consumable?:boolean;equipped_slot?:string|null;carried?:boolean};
  item_catalog: {id:string;name:string;category:string;rarity:string;weight:number;description:string;consumable:boolean;stack_limit:number;image_url?:string};
  bonds: {id:string;item_id:string;status:string};
  attribute_defs: {id:string;name:string;minimum:number;maximum:number;baseline:number;category?:string;description?:string};
  lore: {id:string;title:string;body:string;published:boolean};
};
type Row<C extends string> = Document & (C extends keyof CollectionRows ? CollectionRows[C] : object);

class Query<R extends Document, T = R[]> implements PromiseLike<Result<T>> {
  private conditions:Condition[] = [];
  private field?:string;
  private ascending = true;
  private maximum?:number;
  private one = false;
  private optional = false;
  private countRows = false;
  private head = false;
  private columns = "*";
  constructor(private collection:string, private viewer:Viewer|undefined, private store:Store) {}
  select(columns = "*", options?:{count?:string;head?:boolean}) {
    this.columns=columns; this.countRows=!!options?.count; this.head=!!options?.head; return this;
  }
  eq(field:string,value:string|boolean) { this.conditions.push({field,value}); return this; }
  in(field:string,value:string[]) { this.conditions.push({field,value}); return this; }
  order(field:string,options?:{ascending?:boolean}) { this.field=field; this.ascending=options?.ascending!==false; return this; }
  limit(value:number) { this.maximum=value; return this; }
  single() { this.one=true; return this as unknown as Query<R,R>; }
  maybeSingle() { this.one=true; this.optional=true; return this as unknown as Query<R,R>; }

  private async records():Promise<Document[]> {
    const collection=this.collection;
    const viewer=this.viewer;
    if (!viewer && collection !== "lore") return [];
    if (!viewer?.master && !playerCollections.has(collection) && !ownedCollections.has(collection)) return [];
    if(collection==="pantheon") {
      const overrides=await this.store.list("pantheon");
      return pantheon.map(entry=>({...entry,...overrides.find(row=>row.id===entry.id)}))
        .filter(entry=>viewer?.master || entry.published);
    }
    if (collection==="profiles" && !viewer?.master) {
      const profile = viewer ? await this.store.get("profiles",viewer.id) : null;
      return profile ? [profile] : [];
    }
    if (collection==="attribute_defs" && !viewer?.master) {
      const entries=await this.store.list("attributes",{field:"owner_id",value:viewer!.id});
      const ids=[...new Set(entries.map(entry=>entry.definition_id as string))];
      const definitions=await Promise.all(ids.map(id=>this.store.get("attribute_defs",id)));
      return definitions.filter((entry):entry is Document=>Boolean(entry));
    }
    if (collection==="settings") return [await this.store.get("settings","campaign") ?? initialSettings];
    if (collection==="tiers") return tiers(this.store);
    const condition = collection==="lore" && !viewer?.master ? {field:"published",value:true}
      : viewer && !viewer.master && ownedCollections.has(collection) ? {field:"owner_id",value:viewer.id}
      : this.conditions.find(c=>!Array.isArray(c.value) && c.field!=="id");
    const id = this.conditions.find(c=>c.field==="id" && typeof c.value==="string")?.value;
    if (typeof id==="string") {
      const row=await this.store.get(collection,id);
      return row && (!condition || row[condition.field]===condition.value) ? [row] : [];
    }
    return this.store.list(collection,condition);
  }

  private async run():Promise<Result<T>> {
    try {
      let rows=(await this.records()).filter(row=>this.conditions.every(({field,value})=>
        Array.isArray(value) ? value.includes(row[field]) : row[field]===value));
      const field=this.field;
      if(field) rows.sort((a,b)=>(a[field]>b[field]?1:a[field]<b[field]?-1:0)*(this.ascending?1:-1));
      const count=this.countRows?rows.length:null;
      if(this.maximum!==undefined) rows=rows.slice(0,this.maximum);
      if(this.head) return {data:[] as T,error:null,count};
      // Relacionamentos usados somente no painel do mestre.
      if(this.viewer?.master && this.columns.includes("characters(name)")) {
        const characterIds=[...new Set(rows.map(row=>row.character_id as string))];
        const names=new Map(await Promise.all(characterIds.map(async id=>[id,await this.store.get("characters",id)] as const)));
        rows=await Promise.all(rows.map(async row=>({
          ...row, characters:{name:names.get(row.character_id)?.name},
          ...(this.columns.includes("items(name)") && {items:{name:(await this.store.get("items",row.item_id))?.name}}),
        })));
      }
      if(this.columns!=="*") {
        const keys=this.columns.split(",").map(column=>column.split("(")[0]);
        rows=rows.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])) as Document);
      }
      if(this.one && rows.length!==1 && !(this.optional && rows.length===0)) throw new Error("Registro indisponível");
      return {data:(this.one ? rows[0] ?? null : rows) as T,error:null,count};
    } catch(error) {
      return {data:null,error:error instanceof Error ? error : new Error("Falha de leitura"),count:null};
    }
  }
  then<A = Result<T>, B = never>(
    resolve?: ((value:Result<T>)=>A|PromiseLike<A>)|null,
    reject?: ((error:unknown)=>B|PromiseLike<B>)|null,
  ):PromiseLike<A|B> { return this.run().then(resolve,reject); }
}

export function database(viewer?:Viewer,store:Store=firestore) {
  return {from:<C extends string>(collection:C)=>new Query<Row<C>>(collection,viewer,store)};
}
