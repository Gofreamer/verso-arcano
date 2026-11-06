import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ScrollText, Settings2, Sparkles, UsersRound } from "lucide-react";
import { Empty, Heading, Panel, Status, localDate } from "@/components/ui";
import { read, session } from "@/lib/auth";
import { ItemCatalog } from "@/components/item-catalog";
import { campaignCharacters } from "@/lib/campaign-characters";

const actions: Record<string,string> = {
  character:"Ficha atualizada", tier:"Tier configurado", settings:"Regras ajustadas", lore:"Arquivo do mundo atualizado",
  role:"Permissão alterada", attribute_def:"Perícia configurada", progress:"Progressão registrada", attribute:"Perícia atualizada",
  item:"Inventário atualizado", oath:"Juramento enviado", oath_decide:"Decisão de ritual registrada",
  bond_end:"Destruição registrada", bond_replaced:"Vínculo substituído", submit:"Encantamento enviado", review:"Decisão de magia registrada",
  manual:"Revisão manual aberta", catalog_create:"Item criado no catálogo", catalog_grant:"Item entregue",
  catalog_edit:"Item do catálogo editado", catalog_delete:"Item do catálogo excluído",
  item_edit:"Item da ficha editado", item_delete:"Item removido da ficha",
};

export default async function Master() {
  const { db, master } = await session();
  if (!master) notFound();
  const [players, characters, magic, rituals, audit, catalog, recipients] = await Promise.all([
    db.from("profiles").select("id",{count:"exact",head:true}).eq("role","player"),
    db.from("characters").select("id",{count:"exact",head:true}),
    db.from("spells").select("id,name,status,character_id,updated_at,characters(name)",{count:"exact"}).in("status",["analysis","review"]).order("updated_at").limit(50),
    db.from("oaths").select("id,status,character_id,ritual_date,characters(name),items(name)").eq("status","pending").order("created_at").limit(50),
    db.from("audit").select("id,action,created_at").order("created_at",{ascending:false}).limit(12),
    db.from("item_catalog").select("*").order("name"),
    campaignCharacters(),
  ]);
  if (players.error || characters.error) throw new Error("Falha ao contar registros");
  const spells = read(magic);
  const oaths = read(rituals);
  const activity = read(audit);
  return <>
    <Heading label="CONTROLE DA CAMPANHA" title="Sala do mestre"><p>Gerencie fichas, arbitre encantamentos e publique os registros do mundo.</p></Heading>
    <div className="toolbar">
      <Link className="button" href="/campanha/mestre/configuracoes"><Settings2 size={17}/> Configurações</Link>
      <a className="button" href="#catalogo">Catálogo de itens</a></div>
    <div className="cards">
      <div className="panel stat"><UsersRound size={20}/><b>{players.count}</b><span>Jogadores</span></div>
      <div className="panel stat"><ScrollText size={20}/><b>{characters.count}</b><span>Personagens</span></div>
      <div className="panel stat"><Sparkles size={20}/><b>{magic.count}</b><span>Encantamentos pendentes</span></div>
    </div>
    <div className="columns">
      <Panel title="Fila de encantamentos">
        {spells.length ? spells.map(spell => <div className="record" key={spell.id}>
          <Status state={spell.status}/><h3>{spell.name}</h3>
          <p>{relatedName(spell.characters)} · {localDate(spell.updated_at)}</p>
          <Link className="header-link" href={"/campanha/personagem/" + spell.character_id + "?aba=grimorio#" + spell.id}>Abrir solicitação <ArrowUpRight size={15}/></Link>
        </div>) : <Empty>Nenhuma magia na fila.</Empty>}
      </Panel>
      <Panel title="Rituais pendentes">
        {oaths.length ? oaths.map(oath => <div className="record" key={oath.id}>
          <h3>{relatedName(oath.characters)}</h3><p>{relatedName(oath.items)} · {localDate(oath.ritual_date)}</p>
          <Link className="header-link" href={"/campanha/personagem/" + oath.character_id + "?aba=juramento"}>Abrir juramento <ArrowUpRight size={15}/></Link>
        </div>) : <Empty>Nenhum ritual aguardando confirmação.</Empty>}
      </Panel>
    </div>
    <ItemCatalog items={read(catalog)} characters={recipients}/>
    <Panel title="Atividade recente">
      {activity.length ? <ul className="activity">{activity.map(entry => <li key={entry.id}><span>{actions[entry.action] ?? entry.action}</span><time dateTime={entry.created_at}>{localDate(entry.created_at)}</time></li>)}</ul>
        : <Empty>O histórico aparece à medida que a campanha progride.</Empty>}
    </Panel>
  </>;
}


function relatedName(row: {name:string} | {name:string}[] | null) {
  return Array.isArray(row) ? row[0]?.name : row?.name;
}
