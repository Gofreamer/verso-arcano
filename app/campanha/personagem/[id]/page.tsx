import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, UserRound } from "lucide-react";
import { BasicForm } from "@/components/sheet";
import { Cmd, Empty, Field, Heading, Panel, Select, Status, localDate } from "@/components/ui";
import { read, session } from "@/lib/auth";
import { Grimoire } from "./grimoire";

const sections = [
  ["visao","Visão geral"],["atributos","Atributos"],["inventario","Inventário"],
  ["canalizadores","Canalizadores"],["juramento","Juramento"],["grimorio","Grimório"],["progressao","Progressão"],
];

export default async function Character({ params, searchParams }: {
  params: Promise<{id:string}>; searchParams: Promise<{aba?:string}>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { aba = "visao" } = await searchParams;
  const { db, master } = await session();
  const [sheetResult, tiersResult] = await Promise.all([
    db.from("characters").select("*").eq("id",id).maybeSingle(), db.from("tiers").select("*").order("rank"),
  ]);
  if (sheetResult.error) throw new Error("Falha ao consultar ficha");
  const sheet = sheetResult.data;
  if (!sheet) notFound();
  const tiers = read(tiersResult);
  const cap = tiers.find(tier => tier.id === sheet.max_tier);
  const itemRows = ["inventario","canalizadores","juramento","grimorio"].includes(aba)
    ? read(await db.from("items").select("*").eq("character_id",id).order("name")) : [];
  const itemOptions = itemRows.filter(item => item.quantity > 0);
  const bonds = ["canalizadores","grimorio"].includes(aba)
    ? read(await db.from("bonds").select("*").eq("character_id",id).order("created_at",{ascending:false})) : [];
  const oathRows = aba === "juramento"
    ? read(await db.from("oaths").select("*").eq("character_id",id).order("created_at",{ascending:false})) : [];
  const oathNotes = aba === "juramento" && master && oathRows.length
    ? read(await db.from("audit").select("target_id,details").eq("action","oath_decide").in("target_id",oathRows.map(oath => oath.id))) : [];
  const defs = aba === "atributos" ? read(await db.from("attribute_defs").select("*").order("name")) : [];
  const attributes = aba === "atributos" ? read(await db.from("attributes").select("*").eq("character_id",id)) : [];
  const settings = ["grimorio","progressao"].includes(aba) ? read<{require_bond:boolean;min_verses:number;progression:string}>(await db.from("settings").select("*").single()) : null;
  const character = {character:id};
  const itemName = (itemId: string) => itemRows.find(item => item.id === itemId)?.name ?? "Objeto registrado";

  return <>
    <Link className="header-link" href="/campanha"><ArrowLeft size={15}/> Personagens</Link>
    <div className="sheet-heading">
      {sheet.avatar ? <img className="portrait" src={sheet.avatar} alt="" referrerPolicy="no-referrer"/> : <span className="portrait"><UserRound size={34}/></span>}
      <Heading label="FICHA DE PERSONAGEM" title={sheet.name}><p>{[sheet.species,sheet.origin].filter(Boolean).join(" · ") || "Identidade em construção"}</p></Heading>
    </div>
    <div className="quick"><span>Nível <b>{sheet.level}</b></span><span>Energia <b>{sheet.energy}</b></span><span>Limite <b>{cap?.name}</b></span><Status state={sheet.state}/></div>
    <nav className="tabs" aria-label="Seções da ficha">{sections.map(([key,label]) =>
      <Link key={key} aria-current={key === aba ? "page" : undefined} href={"?aba=" + key}>{label}</Link>)}</nav>
    {aba === "visao" && <Panel title="Identidade e história"><BasicForm sheet={sheet}/></Panel>}
    {aba === "atributos" && <Panel title="Atributos da campanha">
      {defs.length ? defs.map(def => {
        const value = attributes.find(entry => entry.definition_id === def.id)?.value ?? def.baseline;
        return <div className="record" key={def.id}><h3>{def.name} <span className="badge">{value}</span></h3>
          <p>Faixa: {def.minimum} a {def.maximum}</p>
          {master && <Cmd name="attribute" values={{...character,id:def.id}} submit="Atualizar atributo">
            <Field name="value" label="Valor" type="number" value={value} min={def.minimum} required/>
          </Cmd>}</div>;
      }) : <Empty>O mestre ainda não definiu os atributos da campanha.</Empty>}
    </Panel>}
    {aba === "inventario" && <Panel title="Inventário">
      {!itemRows.length && <Empty>Nenhum objeto na ficha.</Empty>}
      {itemRows.map(item => <div className="record" key={item.id}>
        <h3>{item.name} <span className="badge">× {item.quantity}</span></h3><p>{item.category}</p>
        <p className="verbatim">{item.description}</p>
        {master && <details><summary>Editar objeto</summary><ItemForm character={id} item={item}/></details>}
      </div>)}
      {master && <details><summary>Adicionar objeto</summary><ItemForm character={id}/></details>}
    </Panel>}
    {aba === "canalizadores" && <Panel title="Canalizadores mágicos">
      {!bonds.length && <Empty>Nenhum vínculo registrado. Um juramento confirmado registra o primeiro canalizador.</Empty>}
      {bonds.map(bond => <div className="record" key={bond.id}>
        <h3>{itemName(bond.item_id)} <Status state={bond.status}/></h3>
        <p>Vinculado em {localDate(bond.created_at)}{bond.ended_at && " · Encerrado em " + localDate(bond.ended_at)}</p>
        {master && bond.status === "active" && <details><summary>Encerrar vínculo por destruição</summary>
          <p>O objeto terá sua quantidade ajustada para zero.</p>
          <Cmd name="bond_end" values={{...character,id:bond.id}} submit="Registrar destruição"/>
        </details>}
      </div>)}
    </Panel>}
    {aba === "juramento" && <Panel title="Juramento e ritual">
      {!oathRows.length && <Empty>Nenhum ritual registrado.</Empty>}
      {oathRows.map(oath => <div className="record" key={oath.id}>
        <h3>{itemName(oath.item_id)} <Status state={oath.status}/></h3><p>{localDate(oath.ritual_date)}</p>
        <blockquote>{oath.formula}</blockquote>
        {master && oathNotes.find(note => note.target_id === oath.id)?.details?.notes && <p className="verbatim">Nota privada: {oathNotes.find(note => note.target_id === oath.id)?.details.notes}</p>}
        {master && oath.status === "pending" && <Cmd name="oath_decide" values={{...character,id:oath.id}} submit="Registrar decisão do ritual">
          <Select name="decision" label="Decisão" blank="Selecione" options={[{id:"confirmed",name:"Confirmar rito e vincular objeto"},{id:"declined",name:"Encerrar sem confirmar"}]}/>
          <Field name="notes" label="Observações privadas do mestre" max={4000} area/>
        </Cmd>}
      </div>)}
      {!oathRows.some(oath => oath.status === "pending") && <details open={!oathRows.length}><summary>Registrar juramento</summary>
        <p>Escolha um objeto existente ou descreva um novo. O mestre confirma o rito.</p>
        <Cmd name="oath" values={character} submit="Enviar juramento">
          <Field name="formula" label="Texto do juramento" max={6000} area required/>
          <div className="fields"><Field name="ritual_date" label="Data do ritual" type="date" required/>
            <Select name="item" label="Objeto existente" options={itemOptions} blank="Propor um novo objeto"/></div>
          <div className="fields"><Field name="object" label="Nome do novo objeto"/><Field name="category" label="Categoria do novo objeto"/></div>
        </Cmd>
      </details>}
    </Panel>}
    {aba === "grimorio" && settings && <Grimoire character={id} tiers={tiers} cap={cap} items={itemRows} bonds={bonds} requireBond={settings.require_bond} minVerses={settings.min_verses}/>}
    {aba === "progressao" && settings && <Panel title="Progressão e recursos">
      <p>Nível {sheet.level} · {sheet.xp} XP · {sheet.energy} de energia</p>
      {sheet.progression && <p className="verbatim">{sheet.progression}</p>}
      {settings.progression && <p className="verbatim">Regras da campanha: {settings.progression}</p>}
      {master && <Cmd name="progress" values={character} submit="Salvar progressão">
        <div className="fields">
          <Field name="level" label="Nível" type="number" min={1} value={sheet.level} required/>
          <Field name="xp" label="Experiência" type="number" min={0} value={sheet.xp} required/>
          <Field name="energy" label="Energia" type="number" min={0} value={sheet.energy} required/>
          <Field name="state" label="Estado" value={sheet.state} max={100} required/>
          <Select name="max_tier" label="Tier máximo" options={tiers} value={sheet.max_tier}/>
        </div>
        <Field name="progression" label="Registro de progressão" value={sheet.progression} max={8000} area/>
      </Cmd>}
    </Panel>}
  </>;
}

function ItemForm({character,item}: {character:string;item?:{id:string;name:string;category:string;quantity:number;description:string}}) {
  return <Cmd name="item" values={{character,id:item?.id ?? ""}} submit="Salvar objeto">
    <div className="fields"><Field name="name" label="Nome do objeto" value={item?.name} required/>
      <Field name="category" label="Categoria" value={item?.category} required/>
      <Field name="quantity" label="Quantidade" value={item?.quantity ?? 1} type="number" min={0} required/></div>
    <Field name="description" label="Descrição" value={item?.description} max={3000} area/>
  </Cmd>;
}
