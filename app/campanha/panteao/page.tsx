import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Heading, Empty } from "@/components/ui";
import { read, session } from "@/lib/auth";

export default async function Pantheon() {
  const {db,master}=await session();
  const gods=read(await db.from("pantheon").select("*"));
  return <div className="pantheon-wiki">
    <Heading label="CRENÇAS E TRADIÇÕES" title="Panteão">
      <p className="pantheon-intro">Sete nomes percorrem templos, cidades e povos. São os mais cultuados entre os divinos conhecidos, procurados diante da guerra, do desejo, do nascimento e da morte.</p>
    </Heading>
    <div className="pantheon-preface">
      <span className="pantheon-kicker">O culto pelas esferas</span>
      <p>Nos templos, os fiéis se reúnem diante de uma esfera. Algumas vezes, uma voz responde. Fora dela, as manifestações são raras. As aparências dos divinos permanecem desconhecidas para o público. Apenas os mais íntimos já os viram.</p>
    </div>
    <div className="pantheon-section-heading"><h2>Os grandes cultos</h2><span>{gods.length} artigos disponíveis</span></div>
    {!gods.length && <Empty>Os registros do Panteão ainda não foram publicados.</Empty>}
    <div className="pantheon-grid">{gods.map(god=><Link className="deity-card" data-deity={god.color} href={"/campanha/panteao/"+god.id} key={god.id}>
      <div className="deity-orb-stage" aria-hidden="true"><div className="deity-orb"/><span className="deity-orb-base"/></div>
      <div className="deity-card-content">
        <span className="pantheon-kicker">{god.domains}</span><h2>{god.name}</h2><p className="deity-title">{god.title}</p>
        <p className="deity-summary">{god.summary}</p>
        <span className="deity-read">{master && !god.published ? "Artigo oculto · Editar" : "Consultar registro"}<ArrowUpRight size={15}/></span>
      </div>
    </Link>)}</div>
    <p className="pantheon-footnote">As esferas ilustram os meios de culto. As cores são uma convenção visual deste arquivo.</p>
  </div>;
}
