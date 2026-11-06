"use client";

import { useId, useRef, type ReactNode } from "react";
import { Plus, X } from "lucide-react";

export function NewCatalogItem({children,label="Novo item",title:heading="Novo item"}: {children:ReactNode;label?:string;title?:string}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const title=useId();
  return <div className="catalog-create">
    <button className="button" type="button" onClick={()=>dialog.current?.showModal()}>{label==="Novo item" && <Plus size={16}/>} {label}</button>
    <dialog className="spell-dialog catalog-dialog" ref={dialog} aria-labelledby={title}>
      <header className="spell-dialog-header">
        <h2 id={title}>{heading}</h2>
        <button className="link-button" type="button" aria-label="Fechar janela" onClick={()=>dialog.current?.close()}><X size={22}/></button>
      </header>
      <div className="spell-dialog-body">{children}</div>
    </dialog>
  </div>;
}
