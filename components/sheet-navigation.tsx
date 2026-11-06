"use client";

import Link from "next/link";
import { Grid2X2, X } from "lucide-react";
import { useId, useRef, useState } from "react";

export function SheetNavigation({ sections, current }: {
  sections: { key: string; label: string }[];
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="field-navigation" onKeyDown={event => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      trigger.current?.focus();
    }
  }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="field-nav-trigger" aria-label={open ? "Fechar seções da ficha" : "Abrir seções da ficha"}
      aria-expanded={open} aria-controls={id} title="Seções da ficha" onClick={() => setOpen(!open)}>
      {open ? <X aria-hidden="true" /> : <Grid2X2 aria-hidden="true" />}
    </button>
    <nav id={id} className="field-nav-popover" aria-label="Seções da ficha" hidden={!open}>
      <p className="eyebrow">Seções da ficha</p>
      <ul>{sections.map(({ key, label }) => <li key={key}>
        <Link href={"?aba=" + key} aria-current={key === current ? "page" : undefined} onClick={() => {
          setOpen(false);
          trigger.current?.focus();
        }}>{label}</Link>
      </li>)}</ul>
    </nav>
  </div>;
}
