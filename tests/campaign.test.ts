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
  const proposal={character,item:item.id,name:"Brasa",formula,intention:"Iluminar um passo",
    image_url:"https://example.com/brasa.gif",category:"Técnica",proposed_cost:"20",proposed_damage:"2d6"};
  await assert.rejects(run("player","submit",{...proposal,image_url:"javascript:alert(1)"}),/URL HTTPS/);
  await assert.rejects(run("player","submit",{...proposal,proposed_cost:"-1"}),/Valor numérico/);
  const pending=await run("player","submit",{...proposal,status:"approved"});
  const spell=pending.id;
  const privateResult={mestre:{observacao:"Alerta privado"},imersiva:{manifestacao:"Rascunho da IA"}};
  db.put("ai_analyses",pending.review!,{review_id:pending.review,result:privateResult});
  assert.deepEqual((await player.from("ai_analyses").eq("id",pending.review!)).data,[]);
  assert.deepEqual((await database({id:"master",master:true},db).from("ai_analyses").single()).data?.result,privateResult);
  assert.equal((await player.from("spell_reviews").eq("id",pending.review!).single()).data?.immersive,undefined);
  await assert.rejects(run("player","submit",{...proposal,id:spell}),/revisão/);
  await assert.rejects(run("player","review",{id:spell,decision:"approved"}),/reservada/);
  const {id:advanced}=await run("master","tier",{name:"Elevado",rank:"1",limits:"Campanha",max_range:"100",max_duration:"10",max_cost:"20"});
  const approval={id:spell,review_id:pending.review!,decision:"approved",tier:initialTier.id,effect:"Ilumina um passo",
    limitations:"Escuridão comum",range:"2",duration:"1",cost:"1",cooldown:"Uma rodada",damage:"1d4",
    immersive_name:"Luz da Brasa",manifestation:"O carvão se acende.",immersive_description:"A luz morna ilumina um passo.",consequence:"Não publicar na aprovação."};
  await assert.rejects(run("master","review",{...approval,tier:advanced}),/Tier acima/);
  await assert.rejects(run("master","review",{...approval,range:"999"}),/limites/);
  await run("master","review",approval);
  assert.equal((await player.from("spells").eq("id",spell).single()).data?.status,"approved");
  const savedSpell=(await player.from("spells").eq("id",spell).single()).data;
  const approved=(await player.from("spell_reviews").eq("id",pending.review!).single()).data;
  assert.equal(savedSpell?.formula,formula);
  assert.equal(savedSpell?.image_url,proposal.image_url);
  assert.equal(savedSpell?.category,proposal.category);
  assert.equal(savedSpell?.proposal.cost,20);
  assert.equal(approved?.cost,1);
  assert.equal(approved?.damage,"1d4");
  assert.equal(approved?.effect,approval.effect);
  assert.equal(approved?.consequence,"");
  assert.deepEqual(approved?.immersive,{
    name:approval.immersive_name,manifestation:approval.manifestation,description:approval.immersive_description,
  });
  assert.doesNotMatch(JSON.stringify(approved),/Alerta privado|Rascunho da IA/);
  assert.deepEqual((await player.from("ai_analyses")).data,[]);
  assert.deepEqual((await stranger.from("spell_reviews").eq("spell_id",spell)).data,[]);

  const masteryRequest=await run("player","submit",{...proposal,kind:"mastery",parent:spell,formula:"Da brasa, faz-se o clarão."},true);
  const mastery=masteryRequest.id;
  await run("master","manual",{id:mastery});
  await run("master","review",{...approval,id:mastery,review_id:masteryRequest.review!,range:"999",damage:"99d6",cooldown:"Nenhuma",immersive_description:"Outro efeito"});
  const masteryApproval=await db.get("spell_reviews",masteryRequest.review!);
  assert.equal(masteryApproval?.range_m,2);
  assert.equal(masteryApproval?.damage,"1d4");
  assert.equal(masteryApproval?.cooldown,"Uma rodada");
  assert.equal(masteryApproval?.immersive.description,approval.immersive_description);

  const first=await run("player","submit",{...proposal,kind:"revision",parent:spell});
  const revision=first.id;
  await run("master","review",{id:revision,review_id:first.review!,decision:"changes",feedback:"Explique a origem da luz."});
  const second=await run("player","submit",{...proposal,id:revision,formula:"No carvão floresce o clarão,\nContra o escuro se estende a mão."});
  await assert.rejects(run("master","review",{id:revision,review_id:first.review!,decision:"rejected",feedback:"Teste"}),/mudou/);
  await run("master","review",{id:revision,review_id:second.review!,decision:"rejected",feedback:"A fonte já se apagou.",consequence:"A cinza esfria entre seus dedos."});
  assert.equal((await player.from("spell_reviews").eq("id",second.review!).single()).data?.immersive,undefined);
  assert.equal((await player.from("spell_reviews").eq("id",second.review!).single()).data?.consequence,"A cinza esfria entre seus dedos.");
  assert.deepEqual(await db.list("spell_versions"),[]);

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
