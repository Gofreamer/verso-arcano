import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { Cmd, Field } from "@/components/ui";
import { read, session } from "@/lib/auth";
import { pantheon, type Divinity } from "@/lib/pantheon";

function Paragraphs({text}: {text:string}) {
  return <>{text.split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p className="verbatim" key={index}>{paragraph}</p>)}</>;
}

function ArticlesList({text}: {text:string}) {
  return <ul className="pantheon-principles">{text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map((line,index)=><li key={index}>{line}</li>)}</ul>;
}

function EditDivinity({god}: {god:Divinity}) {
  return <details className="panel pantheon-editor"><summary><Pencil size={15}/> Editar artigo e publicação</summary>
    <Cmd name="pantheon_save" values={{id:god.id}} submit="Salvar artigo" collapseOnSuccess>
      <div className="fields">
        <Field name="name" label="Nome" value={god.name} max={100} required/>
        <Field name="title" label="Título" value={god.title} max={160} required/>
        <Field name="domains" label="Domínios" value={god.domains} max={200} required/>
      </div>
      <Field name="summary" label="Apresentação na galeria" value={god.summary} max={500} area required/>
      <Field name="personality" label="Personalidade e relação com mortais" value={god.personality} max={4000} area required/>
      <Field name="manifestations" label="Voz e manifestações" value={god.manifestations} max={4000} area required/>
      <Field name="teachings" label="Ensinamentos ou práticas do culto (um por linha)" value={god.teachings} max={4000} area required/>
      <Field name="taboos" label="Tabus ou proibições sacerdotais (um por linha)" value={god.taboos} max={4000} area required/>
      <Field name="myth_title" label="Título do mito" value={god.myth_title} max={160} required/>
      <Field name="myth" label="Mito (separe parágrafos com uma linha vazia)" value={god.myth} max={10000} area required/>
      <label className="check"><input type="checkbox" name="published" defaultChecked={god.published}/> Publicar para os jogadores</label>
    </Cmd>
  </details>;
}

export default async function DivinityPage({params}: {params:Promise<{slug:string}>}) {
  const {slug}=await params;
  if(!pantheon.some(god=>god.id===slug)) notFound();
  const {db,master}=await session();
  const gods=read(await db.from("pantheon").select("*"));
  const god=gods.find(entry=>entry.id===slug);
  if(!god) notFound();
  const index=gods.findIndex(entry=>entry.id===slug);
  const next=gods[(index+1)%gods.length];
  const sections=[["identidade","Identidade"],["manifestacoes","Voz e manifestações"],["culto","Culto e crenças"],["mito",god.myth_title]];
  return <div className="pantheon-wiki deity-article" data-deity={god.color}>
    <Link className="header-link" href="/campanha/panteao"><ArrowLeft size={16}/> Panteão</Link>
    <header className="deity-article-header">
      <div><span className="pantheon-kicker">{god.domains}</span><h1>{god.name}</h1><p className="deity-title">{god.title}</p><p>{god.summary}</p>
        {!god.published && <span className="badge">Artigo oculto · Exclusivo do mestre</span>}</div>
      <div className="deity-orb-stage" aria-hidden="true"><div className="deity-orb"/><span className="deity-orb-base"/></div>
    </header>
    <div className="pantheon-article-layout">
      <aside className="pantheon-toc"><p className="pantheon-kicker">Neste registro</p>
        <nav aria-label="Índice do artigo">{sections.map(([id,title],i)=><a href={"#"+id} key={id}><span>0{i+1}</span>{title}</a>)}</nav>
        <div className="pantheon-toc-fact"><small>Meio de culto</small><p>Esfera no templo</p></div>
      </aside>
      <article className="pantheon-prose">
        <section id="identidade"><span className="pantheon-kicker">01 · Identidade</span><h2>Temperamento e presença</h2><Paragraphs text={god.personality}/></section>
        <section id="manifestacoes"><span className="pantheon-kicker">02 · Manifestações</span><h2>{god.id==="xhass" ? "Os presságios de Xhass" : "A voz pela esfera"}</h2><Paragraphs text={god.manifestations}/></section>
        <section id="culto"><span className="pantheon-kicker">03 · Culto e crenças</span><h2>{god.id==="xhass" ? "As tradições dos sacerdotes" : "Entre os fiéis"}</h2>
          <p>{god.id==="xhass"
            ? "Os costumes a seguir foram estabelecidos pelos sacerdotes a partir de suas interpretações dos presságios. Xhass não concede bênçãos nem lança maldições."
            : "Os devotos cultivam estes ensinamentos e reconhecem os tabus associados à divindade. As respostas divinas dependem das circunstâncias de cada relato."}</p>
          <div className="pantheon-beliefs"><div><h3>{god.id==="xhass" ? "Práticas do culto" : "Ensinamentos"}</h3><ArticlesList text={god.teachings}/></div>
            <div><h3>{god.id==="xhass" ? "Proibições sacerdotais" : "Tabus"}</h3><ArticlesList text={god.taboos}/></div></div>
        </section>
        <section id="mito" className="pantheon-myth"><span className="pantheon-kicker">04 · Tradição oral</span><h2>{god.myth_title}</h2><Paragraphs text={god.myth}/></section>
        {master && <EditDivinity god={god}/>}
      </article>
    </div>
    <footer className="pantheon-article-footer"><Link href="/campanha/panteao">Todos os divinos</Link>
      {next && next.id!==god.id && <Link href={"/campanha/panteao/"+next.id}>{next.name}<ArrowRight size={15}/></Link>}</footer>
  </div>;
}
