import Link from "next/link";
import { ArrowUpRight, Plus, UserRound } from "lucide-react";
import { Empty, Heading } from "@/components/ui";
import { read, session } from "@/lib/auth";

export default async function Characters() {
  const { db, master } = await session();
  const sheets = read(await db.from("characters").select("id,name,species,origin,level,state").order("updated_at",{ascending:false}));
  return <>
    <Heading label={master ? "ARQUIVO DE FICHAS" : "SUA JORNADA"} title={master ? "Personagens da campanha" : "Meus personagens"}>
      <p>Abra uma ficha para consultar seus registros e fórmulas.</p>
    </Heading>
    <div className="toolbar"><span className="muted">{sheets.length} {sheets.length === 1 ? "ficha" : "fichas"}</span>
      <Link className="button" href="/campanha/novo"><Plus size={17}/> Criar personagem</Link></div>
    {sheets.length ? <div className="cards">{sheets.map(sheet =>
      <Link className="panel sheet-card" key={sheet.id} href={"/campanha/personagem/" + sheet.id}>
        <span className="access-mark"><UserRound size={23}/></span>
        <span className="badge">Nível {sheet.level}</span>
        <h2>{sheet.name}</h2><p>{[sheet.species,sheet.origin].filter(Boolean).join(" · ") || "Identidade em construção"}</p>
        <span className="header-link">Abrir ficha <ArrowUpRight size={15}/></span>
      </Link>)}</div> : <Empty>A primeira história começa com a criação de uma ficha.</Empty>}
  </>;
}
