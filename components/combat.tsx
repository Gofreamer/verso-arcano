import Link from "next/link";
import { Droplets, Shield, Zap } from "lucide-react";
import { Cmd, Empty, Field, Panel, Status } from "@/components/ui";
import { SpellMedia } from "@/components/grimoire-index";
import { read, session } from "@/lib/auth";
import type { Document } from "@/lib/firebase/firestore";

export async function Combat({sheet}: {sheet:Document}) {
  const {db,master}=await session();
  const spells=read(await db.from("spells").select("*").eq("character_id",sheet.id).eq("status","approved").order("name"));
  const reviewIds=spells.flatMap(spell=>spell.review_id ? [spell.review_id] : []);
  const reviews=reviewIds.length ? read(await db.from("spell_reviews").select("*").in("id",reviewIds)) : [];
  const energy=sheet.energy ?? 0, mana=sheet.mana ?? 0;
  const revision=String(sheet.combat_revision ?? 0);
  return <div className="combat-layout">
    <div className="combat-resources">
      {[{label:"Energia",value:energy,maximum:sheet.energy_max,Icon:Zap,kind:"energy"},
        {label:"Mana",value:mana,maximum:sheet.mana_max,Icon:Droplets,kind:"mana"}].map(resource=>
        <section className={"panel combat-resource combat-"+resource.kind} key={resource.kind}>
          <h2><resource.Icon size={20}/>{resource.label}</h2>
          <p className="combat-counter"><b>{resource.value}</b><span> / {resource.maximum ?? "a definir"}</span></p>
          {resource.maximum>0 && <progress max={resource.maximum} value={Math.min(resource.value,resource.maximum)} aria-label={resource.label}/>}
          <p>{resource.kind==="energy" ? "Cada ação consome 1 de Energia." : "Habilidades consomem o custo em Mana registrado pelo mestre."}</p>
          {resource.kind==="energy" && (energy>0
            ? <Cmd name="combat_action" values={{character:sheet.id,revision}} submit="Realizar ação · −1 Energia"/>
            : <p className="notice">Sem Energia disponível.</p>)}
        </section>)}
    </div>
    <Panel title="Estado do personagem">
      <div className="combat-state"><Shield size={20}/><Status state={sheet.state}/></div>
      {sheet.combat_notes && <p className="verbatim">{sheet.combat_notes}</p>}
      {master && <details><summary>Ajustar recursos e estado</summary>
        <Cmd name="combat_resources" values={{character:sheet.id,revision}} submit="Salvar recursos e estado" collapseOnSuccess>
          <div className="fields">
            <Field name="energy" label="Energia atual" value={energy} type="number" min={0} required/>
            <Field name="energy_max" label="Energia máxima" value={sheet.energy_max ?? energy} type="number" min={0} required/>
            <Field name="mana" label="Mana atual" value={mana} type="number" min={0} required/>
            <Field name="mana_max" label="Mana máxima" value={sheet.mana_max ?? mana} type="number" min={0} required/>
          </div>
          <Field name="state" label="Estado atual" value={sheet.state} max={100} required/>
          <Field name="combat_notes" label="Condições e observações visíveis ao jogador" value={sheet.combat_notes} max={2000} area/>
        </Cmd>
      </details>}
    </Panel>
    <Panel title="Habilidades em combate">
      <p>Usar uma habilidade desconta seu custo em Mana e 1 de Energia na mesma ação.</p>
      {!spells.length && <Empty>Nenhuma habilidade aprovada nesta ficha.</Empty>}
      <div className="combat-abilities">{spells.map(spell=>{
        const approval=reviews.find(review=>review.id===spell.review_id && review.decision==="approved");
        if(!approval) return null;
        const name=approval.immersive?.name ?? spell.name;
        return <article className="combat-ability" key={spell.id}>
          <div className="combat-ability-heading"><SpellMedia url={spell.image_url} thumbnail/>
            <div><span className="eyebrow">{spell.category || "Encantamento"}</span><h3>{name}</h3>
              <p>{approval.cost} Mana · 1 Energia</p></div></div>
          {approval.cooldown && <p>Recarga · {approval.cooldown}</p>}
          {approval.damage && <p>Dano · {approval.damage}</p>}
          <details><summary>Ver efeito e condições</summary>
            <p className="verbatim">{approval.immersive?.description ?? approval.effect}</p>
            {approval.limitations && <p className="verbatim">{approval.limitations}</p>}
            <Link href={"?aba=grimorio#"+spell.id}>Abrir no Grimório</Link>
          </details>
          {energy>0 && mana>=approval.cost
            ? <Cmd name="combat_cast" values={{id:spell.id,review_id:approval.id,revision}} submit={"Usar · "+approval.cost+" Mana + 1 Energia"}/>
            : <p className="muted">{energy<1 ? "Energia insuficiente." : "Mana insuficiente."}</p>}
        </article>;
      })}</div>
    </Panel>
  </div>;
}
