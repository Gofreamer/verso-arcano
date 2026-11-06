import { Brand, Empty, Heading, Panel } from "@/components/ui";
import { database, read } from "@/lib/auth";
import Link from "next/link";
import { configured } from "@/lib/firebase/config";
export const dynamic = "force-dynamic";

export default async function Rules() {
  const entries = configured() ? read(await database().from("lore").select("id,title,body").eq("published",true).order("updated_at",{ascending:false})) : [];
  return <><header className="site-header"><Brand/><Link href="/campanha">Campanha</Link></header>
    <main className="workspace rules"><Heading label="ARQUIVO ABERTO" title="Regras públicas"/>
      <Panel title="Encantamentos poéticos"><p>Componha versos com intenção e estrutura. Rimas, metáforas e símbolos podem ligar a fórmula ao efeito desejado. Recite a fórmula registrada após a aprovação do mestre.</p>
        <p>O tier delimita a potência. A maestria permite solicitar uma fórmula abreviada para o mesmo efeito. O mestre confirma rituais e vínculos de canalização.</p></Panel>
      {entries.length ? entries.map(entry => <Panel key={entry.id} title={entry.title}><p className="verbatim">{entry.body}</p></Panel>)
        : <Empty>Nenhum registro adicional publicado pelo mestre.</Empty>}
    </main></>;
}
