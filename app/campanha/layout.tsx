import type { ReactNode } from "react";
import { Castle, Dices, LogOut, ScrollText, Orbit } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/ui";
import { session } from "@/lib/auth";
import { signOut } from "@/lib/actions";
import { campaignCharacters } from "@/lib/campaign-characters";
import { CharacterNavigation } from "@/components/character-navigation";

export default async function Campaign({children}:{children:ReactNode}) {
  const [{ master, email }, characters] = await Promise.all([session(), campaignCharacters()]);
  return <div className="campaign">
    <header className="campaign-header"><Brand/>
      <nav aria-label="Campanha">
        <CharacterNavigation characters={characters}/>
        <Link href="/regras"><ScrollText size={18}/> Regras públicas</Link>
        <Link href="/campanha/panteao"><Orbit size={18}/> Panteão</Link>
        <Link href="/roleta"><Dices size={18}/> Roleta do Destino</Link>
        {master && <Link href="/campanha/mestre"><Castle size={18}/> Sala do mestre</Link>}
      </nav>
      <div className="identity"><span className="eyebrow">{master ? "MESTRE" : "JOGADOR"}</span><span className="muted">{email}</span>
        <form action={signOut}><button className="link-button"><LogOut size={16}/> Sair</button></form>
      </div>
    </header>
    <main className="workspace">{children}</main>
  </div>;
}
