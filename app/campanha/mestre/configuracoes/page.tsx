import { SkillDefinitionForm as SkillForm } from "@/components/master-editors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Cmd, Empty, Field, Heading, Panel, Select } from "@/components/ui";
import { read, session } from "@/lib/auth";
import { campaignCharacters } from "@/lib/campaign-characters";

export default async function Settings() {
  const { db, master, id } = await session();
  if (!master) notFound();
  const results = await Promise.all([
    db.from("tiers").select("*").order("rank"), db.from("settings").select("*").single(),
    db.from("attribute_defs").select("*").order("name"), db.from("lore").select("*").order("updated_at",{ascending:false}),
    db.from("profiles").select("id,role").order("created_at"),
    campaignCharacters(),
  ]);
  const tiers = read(results[0]);
  const settings = read(results[1]);
  const skills = read(results[2]);
  const lore = read(results[3]);
  const users = read(results[4]);
  const recipients = results[5];
  return <>
    <Link className="header-link" href="/campanha/mestre"><ArrowLeft size={15}/> Sala do mestre</Link>
    <Heading label="REGRAS E ACESSO" title="Configurações"/>
    <nav className="tabs" aria-label="Configurações">{["Tiers","Progressão","Perícias","Conhecimento","Permissões"].map((label,i) =>
      <a key={label} href={"#config-" + i}>{label}</a>)}</nav>
    <Panel id="config-0" title="Tiers e limites mágicos">
      <p>Números de ordem maiores permitem tiers mais altos. Cada ordem é única. Limites narrativos são visíveis aos jogadores.</p>
      {tiers.map(tier => <details key={tier.id}><summary>{tier.name} · Ordem {tier.rank}</summary><TierForm tier={tier}/></details>)}
      <details><summary>Criar tier</summary><TierForm/></details>
    </Panel>
    <Panel id="config-1" title="Progressão e regras iniciais">
      <Cmd name="settings" submit="Salvar regras">
        <div className="fields"><Select name="starter_tier" label="Tier de novas fichas" options={tiers} value={settings.starter_tier}/>
          <Field name="min_verses" label="Mínimo de versos para fórmula integral (2–20)" type="number" min={2} value={settings.min_verses} required/></div>
        <label className="check"><input type="checkbox" name="require_bond" value="true" defaultChecked={settings.require_bond}/> Exigir vínculo ativo para encantamentos</label>
        <Field name="progression" label="Regras públicas de progressão" value={settings.progression} max={8000} area/>
      </Cmd>
    </Panel>
    <Panel id="config-2" title="Catálogo de perícias">
      <p>Crie modelos de perícia e atribua cada um ao personagem escolhido. Edite os valores e detalhes individuais na ficha.</p>
      {!skills.length && <Empty>Nenhuma perícia cadastrada.</Empty>}
      {skills.map(skill => <details key={skill.id}><summary>{skill.name}</summary><SkillForm skill={skill}/>
        {recipients.length>0 && <details><summary>Dar perícia</summary>
          <Cmd name="attribute" values={{id:skill.id}} submit="Dar perícia">
            <Select name="character" label="Personagem" options={recipients} blank="Selecione"/>
            <Field name="value" label="Valor inicial nesta ficha (opcional)" type="number"/>
          </Cmd>
        </details>}
      </details>)}
      <details><summary>Criar perícia</summary><SkillForm/></details>
    </Panel>
    <Panel id="config-3" title="Conhecimento do mundo">
      <p>Registros privados só ficam disponíveis aos mestres. Marque como público quando chegar o momento de revelar.</p>
      {lore.map(entry => <details key={entry.id}><summary>{entry.title} · {entry.published ? "Público" : "Privado"}</summary><LoreForm entry={entry}/></details>)}
      <details><summary>Novo registro</summary><LoreForm/></details>
    </Panel>
    <Panel id="config-4" title="Permissões administrativas">
      <p>Confira o identificador da conta no painel de autenticação do Firebase antes de promover um jogador.</p>
      {users.filter(user => user.id !== id && user.id !== process.env.FIREBASE_INITIAL_MASTER_UID).map(user => <details key={user.id}><summary>{user.id} · {user.role === "master" ? "Mestre" : "Jogador"}</summary>
        <Cmd name="role" values={{id:user.id}} submit="Salvar permissão">
          <Select name="role" label="Função" value={user.role} options={[{id:"player",name:"Jogador"},{id:"master",name:"Mestre"}]}/>
        </Cmd></details>)}
      {users.length < 2 && <Empty>As outras contas aparecerão após o cadastro.</Empty>}
    </Panel>
  </>;
}

function TierForm({tier}: {tier?:{id:string;name:string;rank:number;limits:string;max_range:number;max_duration:number;max_cost:number}}) {
  return <Cmd name="tier" values={{id:tier?.id ?? ""}} submit="Salvar tier">
    <div className="fields"><Field name="name" label="Nome" value={tier?.name} max={80} required/>
      <Field name="rank" label="Ordem" value={tier?.rank} type="number" min={0} required/>
      <Field name="max_range" label="Alcance máximo (m)" value={tier?.max_range} type="number" min={0} required/>
      <Field name="max_duration" label="Duração máxima (turnos)" value={tier?.max_duration} type="number" min={0} required/>
      <Field name="max_cost" label="Custo máximo (energia)" value={tier?.max_cost} type="number" min={0} required/></div>
    <Field name="limits" label="Limites narrativos públicos" value={tier?.limits} max={4000} area required/>
  </Cmd>;
}

function LoreForm({entry}: {entry?:{id:string;title:string;body:string;published:boolean}}) {
  return <Cmd name="lore" values={{id:entry?.id ?? ""}} submit="Salvar registro">
    <Field name="title" label="Título" value={entry?.title} required/>
    <Field name="body" label="Conteúdo" value={entry?.body} max={10000} area required/>
    <label className="check"><input type="checkbox" name="published" value="true" defaultChecked={entry?.published}/> Publicar nas regras do mundo</label>
  </Cmd>;
}

