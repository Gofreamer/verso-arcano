"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, Plus } from "lucide-react";
import { useRef } from "react";

export function CharacterNavigation({ characters }: { characters: { id: string; name: string }[] }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

  function close(restoreFocus = false) {
    if (menu.current) menu.current.open = false;
    if (restoreFocus) trigger.current?.focus();
  }

  return <details ref={menu} className="character-navigation" onKeyDown={event => {
    if (event.key === "Escape" && menu.current?.open) {
      event.preventDefault();
      close(true);
    }
  }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  }}>
    <summary ref={trigger}><BookOpen size={18} aria-hidden="true"/> Personagens <ChevronDown size={14} aria-hidden="true"/></summary>
    <ul>
      {characters.map(character => {
        const href = "/campanha/personagem/" + character.id;
        return <li key={character.id}><Link href={href} aria-current={pathname === href ? "page" : undefined}
          onClick={() => close(true)}>{character.name}</Link></li>;
      })}
      <li><Link href="/campanha/novo" aria-current={pathname === "/campanha/novo" ? "page" : undefined}
        onClick={() => close(true)}><Plus size={16} aria-hidden="true"/> Criar personagem</Link></li>
    </ul>
  </details>;
}
