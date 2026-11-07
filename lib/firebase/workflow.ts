import "server-only";
import { z } from "zod";
import { equipmentSlots, rarities } from "../inventory";
import { conditionKinds } from "../conditions";
import { initialSettings, isMaster, tiers } from "./data";
import { transact, type Document, type Writer } from "./firestore";

export class CampaignError extends Error {}

const masterOnly = new Set(["tier","settings","lore","role","attribute_def","attribute_edit","attribute_remove","progress","combat_resources","character_tier","character_capacity","attribute","catalog_create","catalog_edit","catalog_delete","catalog_grant","item_edit","item_delete","oath_decide","bond_end","review","manual","grant_spell","spell_edit","condition_save","condition_end","condition_delete"]);
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
    demand(raw?.trim() && Number.isSafeInteger(value) && value>=min && value<=max,"Valor numérico fora dos limites permitidos.");
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
  const pendingAudit:Document[]=[];
  const audit=(label:string,id:string,details:object)=>{
    const entry={id:uuid(),actor_id:actor,action:label,target_id:id,details,created_at:timestamp};
    pendingAudit.push(entry);
    db.put("audit",entry.id,entry);
  };
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
    case "condition_save":
    case "condition_end":
    case "condition_delete": {
      const ch=await character();
      const previous=p.id ? await find("conditions",p.id,"Condição indisponível nesta ficha.") : null;
      if(previous) {
        demand(previous.character_id===cid,"Condição indisponível nesta ficha.");
        demand(int("revision")===previous.revision,"A condição mudou. Reabra a janela antes de editar.");
      }
      if(action==="condition_delete") {
        demand(previous,"Condição indisponível.");
        db.delete("conditions",previous.id);
      } else if(action==="condition_end") {
        demand(previous?.status==="active","Esta condição já foi encerrada.");
        db.put("conditions",previous.id,{...previous,status:"ended",ended_at:timestamp,
          revision:previous.revision+1,updated_at:timestamp});
      } else {
        demand(conditionKinds.some(kind=>kind.id===p.kind),"Selecione um tipo de condição válido.");
        db.put("conditions",target,{...previous,...attach(ch),kind:p.kind,name:text("name",100,true),
          effect:text("effect",1000,true),description:text("description",4000),source:text("source",160),
          duration:text("duration",160),status:previous?.status ?? "active",revision:(previous?.revision ?? 0)+1,
          created_at:previous?.created_at ?? timestamp,updated_at:timestamp});
      }
      break;
    }
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
        fears:text("fears",2000),phobias:text("phobias",2000),strengths:text("strengths",2000),updated_at:timestamp,
      };
      cid=target;
      if(p.id) {
        const {level,xp,appearance,...previous}=await character();
        db.put("characters",target,{...previous,...data});
      }
      else db.put("characters",target,{
        ...data,owner_id:actor,energy:0,mana:0,state:"Ativo",progression:"",
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
      const defs=await db.list("attribute_defs");
      demand(!defs.some(row=>row.id!==target && row.name===name),"Já existe uma perícia com esse nome.");
      db.put("attribute_defs",target,{name,minimum,maximum,baseline,category:text("category",80),description:text("description",1000)});
      break;
    }
    case "attribute": {
      const ch=await character();
      const def=await find("attribute_defs",p.id,"Perícia indisponível.");
      const id=cid+"_"+def.id;
      const existing=await db.get("attributes",id);
      const snapshot=existing?.snapshot ?? {name:def.name,minimum:def.minimum,maximum:def.maximum,
        category:def.category ?? "",description:def.description ?? ""};
      const value=p.value?.trim() ? int("value",snapshot.minimum,snapshot.maximum) : existing?.value ?? def.baseline;
      db.put("attributes",id,{...attach(ch),definition_id:def.id,snapshot,value});
      break;
    }
    case "attribute_edit":
    case "attribute_remove": {
      await character();
      const entry=await find("attributes",p.id,"Perícia indisponível nesta ficha.");
      demand(entry.character_id===cid,"Perícia indisponível nesta ficha.");
      if(action==="attribute_remove") db.delete("attributes",entry.id);
      else {
        const minimum=int("minimum",-2147483648), maximum=int("maximum",minimum);
        db.put("attributes",entry.id,{...entry,value:int("value",minimum,maximum),
          snapshot:{name:text("name",80,true),minimum,maximum,category:text("category",80),description:text("description",1000)}});
      }
      break;
    }
    case "combat_resources": {
      const ch=await character();
      demand(int("revision") === (ch.combat_revision ?? 0),"Os recursos mudaram. Confira os valores atuais e tente novamente.");
      const energy_max=int("energy_max"), mana_max=int("mana_max");
      db.put("characters",cid,{...ch,energy_max,mana_max,energy:int("energy",0,energy_max),
        mana:int("mana",0,mana_max),state:text("state",100,true),combat_notes:text("combat_notes",2000),
        combat_revision:(ch.combat_revision ?? 0)+1,updated_at:timestamp});
      if(ch.state!==text("state",100,true) || (ch.combat_notes ?? "")!==text("combat_notes",2000))
        audit("character_state",cid,{character:cid});
      break;
    }
    case "combat_action":
    case "combat_cast": {
      let spell:Document|undefined;
      if(action==="combat_cast") spell=await currentSpell();
      const ch=await character();
      demand(int("revision") === (ch.combat_revision ?? 0),"Os recursos mudaram. Confira os valores atuais e tente novamente.");
      demand(ch.energy>=1,"Energia insuficiente para realizar uma ação.");
      let manaCost=0;
      if(spell) {
        demand(spell.status==="approved" && spell.review_id===p.review_id,"Esta habilidade não está disponível. Reabra a ficha.");
        const approval=await find("spell_reviews",spell.review_id,"Aprovação indisponível.");
        demand(approval.decision==="approved","Esta habilidade não está aprovada.");
        manaCost=approval.cost;
        demand(Number.isSafeInteger(manaCost) && manaCost>=0 && (ch.mana ?? 0)>=manaCost,"Mana insuficiente para usar esta habilidade.");
        if(spell.kind!=="grant") {
          const cap=await tier(ch.max_tier),chosen=await tier(approval.tier_id);
          demand(chosen.rank<=cap.rank && approval.range_m<=Math.min(cap.max_range,chosen.max_range)
            && approval.duration_turns<=Math.min(cap.max_duration,chosen.max_duration)
            && manaCost<=Math.min(cap.max_cost,chosen.max_cost),"A magia excede os limites atuais do personagem.");
          if((await settings()).require_bond || spell.item_id) {
            const bonds=(await scoped("bonds")).filter(b=>b.status==="active" && (!spell!.item_id || b.item_id===spell!.item_id));
            const objects=await Promise.all(bonds.map(b=>object(b.item_id)));
            demand(objects.some(row=>row.quantity>0),"É necessário um canalizador vinculado disponível.");
          }
        }
      }
      db.put("characters",cid,{...ch,energy:ch.energy-1,mana:(ch.mana ?? 0)-manaCost,
        combat_revision:(ch.combat_revision ?? 0)+1,updated_at:timestamp});
      break;
    }
    case "character_capacity": {
      const ch=await character(), raw=text("carry_capacity",16,true), capacity=Number(raw);
      demand(/^\d+(\.\d{1,3})?$/.test(raw) && capacity>0 && capacity<=1000000,"Informe um limite maior que zero, em kg.");
      db.put("characters",cid,{...ch,carry_capacity:capacity,updated_at:timestamp});
      break;
    }
    case "character_tier": {
      const {level,xp,...ch}=await character();
      await tier(p.max_tier);
      db.put("characters",cid,{...ch,max_tier:p.max_tier,updated_at:timestamp});
      break;
    }
    case "progress": {
      const {level,xp,...ch}=await character();
      await tier(p.max_tier);
      db.put("characters",cid,{...ch,max_tier:p.max_tier,
        energy:p.energy!==undefined ? int("energy",0,ch.energy_max ?? 2147483647) : ch.energy,
        state:p.state!==undefined ? text("state",100,true) : ch.state,
        combat_revision:(ch.combat_revision ?? 0)+1,progression:text("progression",8000),updated_at:timestamp});
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
        consumable:p.consumable==="on",stack_limit:p.stackable==="on" ? Number.MAX_SAFE_INTEGER : 1,
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
      const quantity=int("quantity",1,Number.MAX_SAFE_INTEGER);
      const {id,created_at,...definition}=entry;
      const copies=await scoped("items");
      const copy=entry.stack_limit>1 ? copies.find(row=>row.catalog_id===id
        && (row.catalog_revision ?? null)===(entry.catalog_revision ?? null)
        && !row.customized && row.quantity>0 && !row.equipped_slot
        && Number.isSafeInteger(row.quantity+quantity)) : undefined;
      if(copy) db.put("items",copy.id,{...copy,quantity:copy.quantity+quantity});
      else db.put("items",uuid(),{...attach(ch),...definition,catalog_id:id,quantity,created_at:timestamp});
      break;
    }
    case "item_edit":
    case "item_delete": {
      await character();
      const row=await object(target);
      demand(row.quantity>0,"Item indisponível.");
      if(action==="item_edit") {
        const quantity=int("quantity",1,row.equipped_slot ? 1 : Number.MAX_SAFE_INTEGER);
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
      db.put("oath_notes",target,{notes:text("notes",4000),updated_at:timestamp});
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
    case "spell_edit": {
      const spell=await currentSpell();
      demand(spell.status==="approved" && spell.review_id===p.review_id,"A habilidade mudou. Reabra a ficha.");
      const review=await find("spell_reviews",spell.review_id,"Aprovação indisponível.");
      demand(review.decision==="approved","A habilidade não está aprovada.");
      const image_url=text("image_url",2000);
      demand(!image_url || (image_url.startsWith("https://") && z.url().safeParse(image_url).success),"Informe uma URL HTTPS para a imagem ou GIF.");
      const name=text("name",120,true), effect=text("effect",4000,true);
      const final:Document={...review,cost:int("cost"),cooldown:text("cooldown",160),damage:text("damage",160),
        effect,limitations:text("limitations",4000),updated_at:timestamp};
      if(spell.kind==="grant") {
        final.duration_label=text("duration_label",160);
      } else {
        const ch=await character(), cap=await tier(ch.max_tier), chosen=await tier(p.tier);
        demand(chosen.rank<=cap.rank,"Tier acima do limite do personagem.");
        final.tier_id=chosen.id;
        final.tier_name=chosen.name;
        final.range_m=int("range",0,Math.min(chosen.max_range,cap.max_range));
        final.duration_turns=int("duration",0,Math.min(chosen.max_duration,cap.max_duration));
        demand(final.cost<=Math.min(chosen.max_cost,cap.max_cost),"Custo acima do limite do personagem.");
        final.immersive={name,manifestation:text("manifestation",4000),description:text("immersive_description",4000) || effect};
      }
      db.put("spells",spell.id,{...spell,name,description:text("description",4000),image_url,category:text("category",60),
        ...(spell.kind==="grant" && {formula:text("formula",6000,false,true)}),updated_at:timestamp});
      db.put("spell_reviews",review.id,final);
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
  if((masterOnly.has(action) && action!=="combat_resources") || (master && action==="character") || ["oath","submit"].includes(action)) {
    audit(action,["grant_spell","catalog_create"].includes(action) ? result.id : p.id || (["progress","attribute"].includes(action)?cid:target),{
      character:cid,decision,notes:action==="oath_decide"?text("notes",4000):undefined,
    });
  }
  if(pendingAudit.length) {
    const existing=await db.list("audit");
    const pendingIds=new Set(pendingAudit.map(entry=>entry.id));
    const records=[...pendingAudit,...existing.filter(entry=>!pendingIds.has(entry.id))]
      .sort((a,b)=>b.created_at.localeCompare(a.created_at));
    const removed=records.slice(25);
    const ritualIds=[...new Set(removed.filter(entry=>entry.action==="oath_decide" && entry.details?.notes)
      .map(entry=>entry.target_id as string))];
    for(const ritual of ritualIds) {
      if(!await db.get("oath_notes",ritual)) {
        const latest=records.find(entry=>entry.action==="oath_decide" && entry.target_id===ritual && entry.details?.notes);
        if(latest) db.put("oath_notes",ritual,{notes:latest.details.notes,updated_at:latest.created_at});
      }
    }
    for(const entry of removed) db.delete("audit",entry.id);
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
