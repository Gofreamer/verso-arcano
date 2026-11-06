import type { ReactNode } from "react";
import { BookOpen, Castle, LogOut, ScrollText } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/ui";
import { session } from "@/lib/auth";
import { signOut } from "@/lib/actions";

export default async function Campaign({children}:{children:ReactNode}) {
  const { master, email } = await session();
  return <div className="campaign">
    <aside className="sidebar"><Brand/>
      <nav aria-label="Campanha">
        <Link href="/campanha"><BookOpen size={18}/> Personagens</Link>
        <Link href="/regras"><ScrollText size={18}/> Regras públicas</Link>
        {master && <Link href="/campanha/mestre"><Castle size={18}/> Sala do mestre</Link>}
      </nav>
      <div className="identity"><span className="eyebrow">{master ? "MESTRE" : "JOGADOR"}</span><span className="muted">{email}</span>
        <form action={signOut}><button className="link-button"><LogOut size={16}/> Sair</button></form>
      </div>
    </aside>
    <main className="workspace">{children}</main>
  </div>;
}
