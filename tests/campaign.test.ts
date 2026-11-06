import assert from "node:assert/strict";
import test from "node:test";
import { database, initialTier } from "../lib/firebase/data";
import type { Document, Writer } from "../lib/firebase/firestore";
import { campaignCommand } from "../lib/firebase/workflow";

test("campanha: aprovações, isolamento, juramentos, histórico e maestria", async () => {
  const tables=new Map<string,Map<string,Document>>();
  const table=(key:string)=>{
    if(!tables.has(key)) tables.set(key,new Map());
    return tables.get(key)!;
  };
  const db:Writer={
    async get(collection,id){return table(collection).get(id) ?? null;},
    async list(collection,filter) {
      return [...table(collection).values()].filter(row=>!filter || row[filter.field]===filter.value);
    },
    put(collection,id,value){table(collection).set(id,structuredClone({...value,id}));},
  };
  for(const uid of ["player","stranger","master"]) db.put("profiles",uid,{role:uid==="master"?"master":"player"});
  const run=(actor:string,action:string,input:Record<string,string>,ai=false)=>campaignCommand(db,actor,action,input,ai);
  const player=database({id:"player",master:false},db);
  const stranger=database({id:"stranger",master:false},db);
  const {id:character}=await run("player","character",{name:"Iara",level:"99",owner_id:"stranger"});
  assert.equal((await db.get("characters",character))?.level,1);
  assert.equal((await stranger.from("characters").eq("id",character).maybeSingle()).data,null);
  await assert.rejects(run("stranger","character",{id:character,name:"Falso"}),/indisponível/);
  await assert.rejects(run("player","progress",{character,level:"99"}),/reservada/);
  await assert.rejects(run("player","attribute_def",{name:"Furtividade"}),/reservada/);
  const skill=await run("master","attribute_def",{
    name:"Furtividade",minimum:"0",maximum:"5",baseline:"1",description:"Mover-se sem chamar atenção.",
  });
  await assert.rejects(run("player","attribute",{character,id:skill.id,value:"5"}),/reservada/);
  await run("master","attribute",{character,id:skill.id,value:"3"});
  assert.equal((await player.from("attributes").eq("character_id",character).single()).data?.value,3);
  assert.equal((await player.from("attribute_defs").eq("id",skill.id).single()).data?.description,"Mover-se sem chamar atenção.");
  await assert.rejects(run("player","role",{id:"player",role:"master"}),/reservada/);
  const {id:oath}=await run("player","oath",{character,formula:"Juro guardar a chama",ritual_date:"2026-11-06",object:"Lâmina",category:"Espada"});
  const [item]=await db.list("items");
  assert.equal(item.quantity,0);
  await assert.rejects(run("stranger","oath",{id:oath,character}),/novo registro/);
  assert.equal((await stranger.from("oaths").select("*")).data?.length,0);
  await run("master","oath_decide",{character,id:oath,decision:"confirmed",notes:"Somente mestre"});
  assert.equal((await db.get("items",item.id))?.quantity,1);
  assert.deepEqual((await player.from("audit")).data,[]);

  const formula="Da brasa guardo o clarão,\nDa noite desfaço o grilhão.";
  const proposal={character,item:item.id,name:"Brasa",formula,intention:"Iluminar um passo"};
  const {id:spell}=await run("player","spell_save",{...proposal,status:"approved"});
  const pending=await run("player","submit",{id:spell});
  await assert.rejects(run("player","spell_save",{...proposal,id:spell}),/revisão/);
  await assert.rejects(run("player","review",{id:spell,decision:"approved"}),/reservada/);
  const {id:advanced}=await run("master","tier",{name:"Elevado",rank:"1",limits:"Campanha",max_range:"100",max_duration:"10",max_cost:"20"});
  const approval={id:spell,review_id:pending.review!,decision:"approved",tier:initialTier.id,effect:"Ilumina um passo",
    limitations:"Escuridão comum",range:"2",duration:"1",cost:"1"};
  await assert.rejects(run("master","review",{...approval,tier:advanced}),/Tier acima/);
  await assert.rejects(run("master","review",{...approval,range:"999"}),/limites/);
  await run("master","review",approval);
  assert.equal((await player.from("spells").eq("id",spell).single()).data?.status,"approved");
  const approved=(await player.from("spell_versions").eq("kind","approved").single()).data;
  assert.equal(approved?.snapshot.formula,formula);
  assert.equal(approved?.snapshot.approval.effect,approval.effect);
  assert.deepEqual((await stranger.from("spell_versions").eq("spell_id",spell)).data,[]);

  const {id:mastery}=await run("player","spell_save",{...proposal,kind:"mastery",parent:spell,formula:"Da brasa, faz-se o clarão."});
  const masteryRequest=await run("player","submit",{id:mastery},true);
  await run("master","manual",{id:mastery});
  await run("master","review",{...approval,id:mastery,review_id:masteryRequest.review!,range:"999"});
  assert.equal((await db.get("spell_reviews",masteryRequest.review!))?.range_m,2);

  const {id:revision}=await run("player","spell_save",{...proposal,kind:"revision",parent:spell});
  const first=await run("player","submit",{id:revision});
  await run("master","review",{id:revision,review_id:first.review!,decision:"changes",feedback:"Explique a origem da luz."});
  await run("player","spell_save",{...proposal,id:revision,formula:"No carvão floresce o clarão,\nContra o escuro se estende a mão."});
  const second=await run("player","submit",{id:revision});
  await assert.rejects(run("master","review",{id:revision,review_id:first.review!,decision:"rejected",feedback:"Teste"}),/mudou/);
  await run("master","review",{id:revision,review_id:second.review!,decision:"rejected",feedback:"A fonte já se apagou."});
  assert.equal((await player.from("spell_versions").eq("spell_id",revision)).data?.length,2);

  const [bond]=await db.list("bonds");
  await run("master","bond_end",{character,id:bond.id});
  assert.equal((await db.get("items",item.id))?.quantity,0);
  const {id:lore}=await run("master","lore",{title:"Segredo",body:"Somente mestre"});
  const publicArchive=database(undefined,db);
  assert.deepEqual((await publicArchive.from("lore")).data,[]);
  await run("master","lore",{id:lore,title:"Revelação",body:"Publicado",published:"true"});
  assert.equal((await publicArchive.from("lore").single()).data?.title,"Revelação");
  assert.deepEqual((await publicArchive.from("spells")).data,[]);
});
