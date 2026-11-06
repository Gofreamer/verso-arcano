"use client";

import { useId, useRef, type ReactNode } from "react";
import { Swords, X } from "lucide-react";

export function SkillCard({name,category,value,maximum,children}: {
  name:string;category?:string;value:number;maximum:number;children:ReactNode;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const title=useId();
  return <div className="skill-entry">
    <button type="button" className="skill-card" onClick={()=>dialog.current?.showModal()}>
      <Swords size={20} aria-hidden="true"/>
      <span className="skill-label"><strong>{name}</strong>{category && <small>{category}</small>}</span>
      <span className="skill-value"><b>{value}</b> / {maximum}</span>
    </button>
    <dialog className="spell-dialog catalog-dialog" ref={dialog} aria-labelledby={title}>
      <header className="spell-dialog-header">
        <h2 id={title}>{name}</h2>
        <button className="link-button" type="button" aria-label="Fechar janela" onClick={()=>dialog.current?.close()}><X size={22}/></button>
      </header>
      <div className="spell-dialog-body">{children}</div>
    </dialog>
  </div>;
}
