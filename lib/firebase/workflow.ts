import "server-only";
import { z } from "zod";
import { equipmentSlots, rarities } from "../inventory";
import { initialSettings, isMaster, tiers } from "./data";
import { transact, type Document, type Writer } from "./firestore";

export class CampaignError extends Error {}

const masterOnly = new Set(["tier","settings","lore","role","attribute_def","progress","attribute","catalog_create","catalog_edit","catalog_delete","catalog_grant","item_edit","item_delete","oath_decide","bond_end","review","manual","grant_spell"]);
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
function demand(condition:unknown,message:string):asserts condition {
  if(!condition) throw new CampaignError(message);
}

export async function applyCommand(actor:string,action:string,input:Record<string,string>,ai=false) {
  return transact(db=>campaignCommand(db,actor,action,input,ai));
}

export async function campaignCommand(db:Writer,actor:string,action:string,p:Record<string,string>,ai=false) {
  const profile=await db.get("profiles",actor);
  demand(profile,"Sessão necessária.");
  const master=isMaster(actor,profile);
  demand(master || !masterOnly.has(action),"Ação reservada ao mestre.");
  const lock=await db.get("settings","workflow_lock");
  db.put("settings","workflow_lock",{revision:(lock?.revision ?? 0)+1});

  const timestamp=now();
  const target=p.id || uuid();
  const item=p.item || null;
  let cid=p.character;
  let result: {id:string;character?:string;review?:string}={id:target};
  let decision:string|undefined;

  function text(key:string,max:number,required=false,preserve=false) {
    const raw=p[key] ?? "";
    const value=preserve?raw:raw.trim();
    demand(value.length<=max && (!required || value.trim().length>0),"Campo inválido ou incompleto.");
    return value;
  }
  function int(key:string,min=0,max=2147483647) {
    const raw=p[key];
    const value=Number(raw);
    demand(raw?.trim() && Number.isInteger(value) && value>=min && value<=max,"Valor numérico fora dos limites permitidos.");
    return value;
  }
  async function find(collection:string,id:string|undefined,message:string) {
    const row=id ? await db.get(collection,id) : null;
    demand(row,message);
    return row;
  }
  async function character() {
    const row=await find("characters",cid,"Personagem indisponível.");
    demand(master || row.owner_id===actor,"Personagem indisponível.");
    return row;
  }
  async function currentSpell() {
    const row=await find("spells",p.id,"Encantamento indisponível.");
    cid=row.character_id;
    await character();
    return row;
  }
  async function object(id:string|null) {
    const row=await find("items",id ?? undefined,"Objeto indisponível.");
    demand(row.character_id===cid,"Objeto indisponível.");
    return row;
  }
  async function tier(id?:string) {
    const found=(await tiers(db)).find(row=>row.id===id);
    demand(found,"Tier indisponível.");
    return found;
  }
  const settings=async ()=>await db.get("settings","campaign") ?? initialSettings;
  const scoped=(name:string)=>db.list(name,{field:"character_id",value:cid});
  const attach=(ch:Document)=>({character_id:cid,owner_id:ch.owner_id});
  const audit=(label:string,id:string,details:object)=>db.put("audit",uuid(),{
    actor_id:actor,action:label,target_id:id,details,created_at:timestamp,
  });
  function itemDetails() {
    const image_url=text("image_url",2000) || null;
    demand(!image_url || (image_url.startsWith("https://") && z.url().safeParse(image_url).success),"Informe uma URL HTTPS para a imagem.");
    const rarity=text("rarity",30,true), rawWeight=text("weight",16,true), weight=Number(rawWeight);
    demand(rarities.includes(rarity),"Selecione uma raridade válida.");
    demand(/^\d+(\.\d{1,3})?$/.test(rawWeight) && weight<=100000,"Informe um peso válido em kg.");
    return {name:text("name",120,true),category:text("category",120,true),rarity,weight,image_url,
      description:text("description",3000),tags:text("tags",300)};
  }

  switch(action) {
    case "character": {
      let avatar:string|null=text("avatar",500)||null;
      if(avatar) {
        const parsed=z.url().safeParse(avatar);
        demand(parsed.success && avatar.startsWith("https://"),"Informe uma URL HTTPS para o retrato.");
        avatar=parsed.data;
      }
      const data={
        name:text("name",100,true),avatar,age:p.age?int("age"):null,species:text("species",100),
        origin:text("origin",150),history:text("history",6000),personality:text("personality",3000),
        appearance:text("appearance",3000),updated_at:timestamp,
      };
      cid=target;
      if(p.id) db.put("characters",target,{...await character(),...data});
      else db.put("characters",target,{
        ...data,owner_id:actor,level:1,xp:0,energy:0,state:"Ativo",progression:"",
        max_tier:(await settings()).starter_tier,created_at:timestamp,
      });
      break;
    }
    case "tier": {
      const rank=int("rank");
      demand(!(await tiers(db)).some(row=>row.id!==target && row.rank===rank),"Já existe um tier com essa ordem.");
      db.put("tiers",target,{rank,name:text("name",80,true),limits:text("limits",4000,true),
        max_range:int("max_range"),max_duration:int("max_duration"),max_cost:int("max_cost")});
      break;
    }
    case "settings":
      await tier(p.starter_tier);
      db.put("settings","campaign",{starter_tier:p.starter_tier,progression:text("progression",8000),
        require_bond:p.require_bond==="true",min_verses:int("min_verses",2,20)});
      break;
    case "lore":
      db.put("lore",target,{title:text("title",120,true),body:text("body",10000,true),published:p.published==="true",updated_at:timestamp});
      break;
    case "role": {
      demand(target!==actor && target!==process.env.FIREBASE_INITIAL_MASTER_UID,"Essa função é protegida.");
      demand(["player","master"].includes(p.role),"Função inválida.");
      const user=await find("profiles",p.id,"Conta indisponível.");
      db.put("profiles",target,{...user,role:p.role});
      break;
    }
    case "attribute_def": {
      const name=text("name",80,true);
      const minimum=int("minimum",-2147483648),maximum=int("maximum",minimum),baseline=int("baseline",minimum,maximum);
      const [defs,values]=await Promise.all([db.list("attribute_defs"),db.list("attributes",{field:"definition_id",value:target})]);
      demand(!defs.some(row=>row.id!==target && row.name===name),"Já existe uma perícia com esse nome.");
      demand(values.every(row=>row.value>=minimum && row.value<=maximum),"Ajuste primeiro os valores fora da nova faixa.");
      db.put("attribute_defs",target,{name,minimum,maximum,baseline,description:text("description",1000)});
      break;
    }
    case "attribute": {
      const ch=await character();
      const def=await find("attribute_defs",p.id,"Perícia indisponível.");
      db.put("attributes",cid+"_"+def.id,{...attach(ch),definition_id:def.id,value:int("value",def.minimum,def.maximum)});
      break;
    }
    case "progress": {
      const ch=await character();
      await tier(p.max_tier);
      db.put("characters",cid,{...ch,max_tier:p.max_tier,level:int("level",1),xp:int("xp"),energy:int("energy"),
        state:text("state",100,true),progression:text("progression",8000),updated_at:timestamp});
      break;
    }
    case "catalog_create":
    case "catalog_edit": {
      const previous=action==="catalog_edit" ? await find("item_catalog",p.id,"Item do catálogo indisponível.") : null;
      const slots=p.equippable==="on" ? equipmentSlots.filter(slot=>p["slot_"+slot.id]==="on").map(slot=>slot.id) : [];
      demand(p.equippable!=="on" || slots.length,"Escolha pelo menos uma posição de equipamento.");
      const id=previous?.id ?? uuid();
      db.put("item_catalog",id,{
        ...itemDetails(),slots,
        consumable:p.consumable==="on",stack_limit:p.stackable==="on" ? int("stack_limit",2,100) : 1,
        created_at:previous?.created_at ?? timestamp,catalog_revision:uuid(),
      });
      result={id};
      break;
    }
    case "catalog_delete": {
      const entry=await find("item_catalog",p.id,"Item do catálogo indisponível.");
      const copies=await db.list("items",{field:"catalog_id",value:entry.id});
      demand(!copies.some(row=>row.quantity>0),"Retire as cópias dos inventários antes de excluir este item do catálogo.");
      db.delete("item_catalog",entry.id);
      break;
    }
    case "catalog_grant": {
      const ch=await character();
      const entry=await find("item_catalog",p.id,"Item do catálogo indisponível.");
      const quantity=int("quantity",1,100);
      const {id,created_at,...definition}=entry;
      const copies=await scoped("items");
      let remaining=quantity;
      for(const copy of copies.filter(row=>row.catalog_id===id && (row.catalog_revision ?? null)===(entry.catalog_revision ?? null)
        && !row.customized && row.quantity>0 && row.quantity<entry.stack_limit && !row.equipped_slot)) {
        const added=Math.min(remaining,entry.stack_limit-copy.quantity);
        db.put("items",copy.id,{...copy,quantity:copy.quantity+added});
        remaining-=added;
        if(!remaining) break;
      }
      while(remaining>0) {
        const amount=Math.min(remaining,entry.stack_limit);
        db.put("items",uuid(),{...attach(ch),...definition,catalog_id:id,quantity:amount,created_at:timestamp});
        remaining-=amount;
      }
      break;
    }
    case "item_edit":
    case "item_delete": {
      await character();
      const row=await object(target);
      demand(row.quantity>0,"Item indisponível.");
      if(action==="item_edit") {
        const quantity=int("quantity",1,row.equipped_slot ? 1 : row.stack_limit ?? Math.max(100,row.quantity));
        db.put("items",row.id,{...row,...itemDetails(),quantity,customized:true});
      } else {
        const [bonds,oaths,spells]=await Promise.all([scoped("bonds"),scoped("oaths"),scoped("spells")]);
        demand(!bonds.some(entry=>entry.item_id===row.id && entry.status==="active"),"Encerre o vínculo ativo na aba Canalização antes de excluir.");
        demand(!oaths.some(entry=>entry.item_id===row.id && entry.status==="pending"),"Resolva o juramento pendente antes de excluir.");
        const referenced=[...bonds,...oaths,...spells].some(entry=>entry.item_id===row.id);
        if(referenced) db.put("items",row.id,{...row,quantity:0,equipped_slot:null});
        else db.delete("items",row.id);
      }
      break;
    }
    case "item_equip":
    case "item_unequip":
    case "item_carry":
    case "item_consume": {
      await character();
      const row=await object(target);
      demand(row.quantity>0,"Item indisponível.");
      if(action==="item_consume") {
        demand(row.catalog_id && row.consumable===true,"Este item não é consumível.");
        if(row.quantity===1) db.delete("items",row.id);
        else db.put("items",row.id,{...row,quantity:row.quantity-1});
      } else if(action==="item_carry") {
        demand(!row.equipped_slot && ["yes","no"].includes(p.carry),"Desequipe o item antes de alterar a carga.");
        db.put("items",row.id,{...row,carried:p.carry==="yes"});
      } else if(action==="item_unequip") {
        demand(row.equipped_slot,"Este item não está equipado.");
        db.put("items",row.id,{...row,equipped_slot:null});
      } else {
        const slot=text("slot",30,true);
        demand(!row.equipped_slot && row.slots?.includes(slot),"Este item não pode ser equipado nessa posição.");
        demand(!(await scoped("items")).some(copy=>copy.quantity>0 && copy.equipped_slot===slot),"Essa posição já está ocupada.");
        if(row.quantity>1) {
          const {id,...copy}=row;
          db.put("items",uuid(),{...copy,quantity:row.quantity-1});
        }
        db.put("items",row.id,{...row,quantity:1,equipped_slot:slot,carried:true});
      }
      break;
    }
    case "oath": {
      demand(!p.id,"Crie um novo registro de juramento.");
      const ch=await character();
      const date=text("ritual_date",10,true);
      demand(z.iso.date().safeParse(date).success,"Informe a data do ritual.");
      const existing=await scoped("oaths");
      demand(!existing.some(row=>row.status==="pending"),"Já existe um juramento aguardando decisão.");
      const itemId=item ?? uuid();
      if(item) {
        const row=await object(item);
        demand(row.quantity>0 && !row.consumable,"Escolha um objeto disponível que possa servir de canalizador.");
      } else {
        db.put("items",itemId,{...attach(ch),name:text("object",120,true),category:text("category",120,true),quantity:0,description:""});
      }
      db.put("oaths",target,{...attach(ch),item_id:itemId,formula:text("formula",6000,true,true),
        ritual_date:date,proposed_item:!item,status:"pending",created_at:timestamp});
      break;
    }
    case "oath_decide": {
      const ch=await character();
      const oath=await find("oaths",p.id,"Juramento indisponível.");
      demand(oath.character_id===cid && oath.status==="pending","Juramento fora da fila.");
      decision=p.decision;
      demand(["confirmed","declined"].includes(decision),"Decisão inválida.");
      if(decision==="confirmed") {
        const [row,bonds]=await Promise.all([object(oath.item_id),scoped("bonds")]);
        demand(oath.proposed_item || row.quantity>0,"Objeto indisponível.");
        demand(!bonds.some(b=>b.item_id===row.id && b.status==="destroyed"),"O objeto foi destruído. Registre um novo objeto.");
        if(oath.proposed_item) db.put("items",row.id,{...row,quantity:Math.max(1,row.quantity)});
        for(const bond of bonds.filter(b=>b.status==="active")) {
          db.put("bonds",bond.id,{...bond,status:"replaced",ended_at:timestamp});
          audit("bond_replaced",bond.id,{character:cid,oath:target});
        }
        db.put("bonds",uuid(),{...attach(ch),oath_id:target,item_id:row.id,status:"active",created_at:timestamp});
      }
      db.put("oaths",target,{...oath,status:decision});
      break;
    }
    case "bond_end": {
      await character();
      const bond=await find("bonds",p.id,"Vínculo indisponível.");
      demand(bond.character_id===cid && bond.status==="active","Vínculo indisponível.");
      const row=await object(bond.item_id);
      db.put("bonds",target,{...bond,status:"destroyed",ended_at:timestamp});
      db.put("items",row.id,{...row,quantity:0,equipped_slot:null});
      break;
    }
    case "grant_spell": {
      const ch=await character();
      const id=uuid(), review=uuid();
      const scope={...attach(ch),created_at:timestamp};
      const image_url=text("image_url",2000);
      demand(!image_url || (image_url.startsWith("https://") && z.url().safeParse(image_url).success),"Informe uma URL HTTPS para a imagem ou GIF.");
      db.put("spells",id,{
        ...scope,kind:"grant",status:"approved",review_id:review,updated_at:timestamp,
        name:text("name",120,true),category:text("category",60,true),description:text("description",4000),
        image_url,formula:text("formula",6000,false,true),
      });
      db.put("spell_reviews",review,{
        ...scope,spell_id:id,decision:"approved",decided_at:timestamp,cost:int("cost"),
        cooldown:text("cooldown",160),duration_label:text("duration_label",160),damage:text("damage",160),
        effect:text("effect",4000,true),limitations:text("limitations",4000),
      });
      result={id,character:cid,review};
      decision="approved";
      break;
    }
    case "submit": {
      const previous=p.id ? await currentSpell() : null;
      const ch=await character();
      if(item) await object(item);
      const image_url=text("image_url",2000);
      demand(!image_url || (image_url.startsWith("https://") && z.url().safeParse(image_url).success),"Informe uma URL HTTPS para a imagem ou GIF.");
      const proposal={
        cost:p.proposed_cost ? int("proposed_cost") : null,
        duration:p.proposed_duration ? int("proposed_duration") : null,
        cooldown:text("proposed_cooldown",160),damage:text("proposed_damage",160),
        effect:text("proposed_effect",4000),limitations:text("proposed_limitations",4000),
      };
      const data={name:text("name",120,true),formula:text("formula",6000,true,true),intention:text("intention",4000,true),
        description:text("description",4000),category:text("category",60),image_url,proposal,item_id:item,updated_at:timestamp};
      if(previous) demand(["draft","changes"].includes(previous.status),"Crie uma revisão para alterar uma fórmula registrada.");
      const kind=previous?.kind ?? (p.kind || "original");
      let parent_id=null;
      if(kind!=="original") {
        demand(["mastery","revision"].includes(kind),"Tipo de fórmula inválido.");
        const parent=await find("spells",previous?.parent_id ?? p.parent,"Magia de referência indisponível.");
        demand(parent.character_id===cid && parent.status==="approved" && parent.kind!=="grant","Escolha um encantamento aprovado desta ficha.");
        parent_id=parent.id;
      }
      const spell={...attach(ch),...data,parent_id,kind,feedback:"",created_at:previous?.created_at ?? timestamp};
      const count=(formula:string)=>formula.split(/\r?\n/).filter(verse=>verse.trim()).length;
      const total=count(spell.formula);
      if(spell.kind==="mastery") {
        const parent=await find("spells",spell.parent_id ?? undefined,"Fórmula de referência indisponível.");
        demand(total>0 && total<count(parent.formula),"A fórmula de maestria precisa ter menos versos que a referência.");
      } else {
        const min=(await settings()).min_verses;
        demand(total>=min,"A fórmula precisa ter pelo menos "+min+" versos.");
      }
      const review=uuid();
      const scope={character_id:cid,owner_id:spell.owner_id,spell_id:target,created_at:timestamp};
      db.put("spell_reviews",review,{...scope,decision:"pending"});
      db.put("spells",target,{...spell,status:ai?"analysis":"review",review_id:review,updated_at:timestamp});
      result={id:target,character:cid,review};
      break;
    }
    case "manual": {
      const spell=await currentSpell();
      demand(spell.status==="analysis","A magia não aguarda análise.");
      db.put("spells",target,{...spell,status:"review",updated_at:timestamp});
      break;
    }
    case "review": {
      const spell=await currentSpell();
      demand(spell.status==="review","A magia não aguarda aprovação.");
      demand(p.review_id===spell.review_id,"A solicitação mudou. Reabra a ficha.");
      const review=await find("spell_reviews",p.review_id,"Solicitação indisponível.");
      demand(review.decision==="pending","A solicitação já foi decidida.");
      decision=p.decision;
      demand(["approved","changes","rejected"].includes(decision),"Decisão inválida.");
      const feedback=text("feedback",4000,decision!=="approved",true);
      let final:Record<string,unknown>={};
      let tierName:string|undefined;
      if(decision==="approved") {
        const ch=await character(), config=await settings();
        if(config.require_bond || spell.item_id) {
          const active=(await scoped("bonds")).filter(b=>b.status==="active" && (!spell.item_id || spell.item_id===b.item_id));
          const objects=await Promise.all(active.map(b=>object(b.item_id)));
          demand(objects.some(row=>row.quantity>0),"Confirme um vínculo ativo com o canalizador antes da aprovação.");
        }
        const cap=await tier(ch.max_tier);
        let inherited:Document|undefined;
        if(spell.kind==="mastery") {
          const parent=await find("spells",spell.parent_id,"Fórmula de referência indisponível.");
          inherited=await find("spell_reviews",parent.review_id,"Aprovação de referência indisponível.");
          demand(inherited.decision==="approved","Aprovação de referência indisponível.");
        }
        const chosen=await tier(inherited?.tier_id ?? p.tier);
        demand(chosen.rank<=cap.rank,"Tier acima do limite do personagem.");
        tierName=chosen.name;
        const range=Math.min(chosen.max_range,cap.max_range), duration=Math.min(chosen.max_duration,cap.max_duration);
        const cost=Math.min(chosen.max_cost,cap.max_cost);
        final={
          tier_id:chosen.id,effect:inherited?.effect ?? text("effect",4000,true),
          limitations:inherited?.limitations ?? text("limitations",4000,true),
          range_m:inherited?.range_m ?? int("range",0,range),duration_turns:inherited?.duration_turns ?? int("duration",0,duration),
          cost:inherited?.cost ?? int("cost",0,cost),
          cooldown:inherited ? inherited.cooldown ?? "" : text("cooldown",160),
          damage:inherited ? inherited.damage ?? "" : text("damage",160),
        };
        final.immersive=inherited?.immersive ?? {
          name:inherited ? spell.name : text("immersive_name",120) || spell.name,
          manifestation:inherited ? "" : text("manifestation",4000),
          description:(inherited ? "" : text("immersive_description",4000)) || final.effect,
        };
        demand(Number(final.range_m)<=range && Number(final.duration_turns)<=duration && Number(final.cost)<=cost,
          "A fórmula de referência excede os limites atuais.");
      }
      const consequence=decision==="rejected" ? text("consequence",4000) : "";
      const approved={...review,...final,decision,feedback,consequence,tier_name:tierName ?? null,decided_at:timestamp};
      const revised={...spell,status:decision,feedback,updated_at:timestamp};
      db.put("spell_reviews",review.id,approved);
      db.put("spells",target,revised);
      break;
    }
    default: throw new CampaignError("Comando inválido.");
  }
  if(masterOnly.has(action) || (master && action==="character") || ["oath","submit"].includes(action)) {
    audit(action,["grant_spell","catalog_create"].includes(action) ? result.id : p.id || (["progress","attribute"].includes(action)?cid:target),{
      character:cid,decision,notes:action==="oath_decide"?text("notes",4000):undefined,
    });
  }
  return result;
}

export async function completeAnalysis(spellId:string,reviewId:string,model:string,result:object|null) {
  return transact(async db=>{
    const spell=await db.get("spells",spellId);
    if(spell?.status!=="analysis" || spell.review_id!==reviewId) return false;
    if(result) db.put("ai_analyses",reviewId,{review_id:reviewId,model,result,created_at:now()});
    db.put("spells",spellId,{...spell,status:"review",updated_at:now()});
    return Boolean(result);
  });
}
