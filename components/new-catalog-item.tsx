"use client";

import { useId, useRef, type ReactNode } from "react";
import { Plus, X } from "lucide-react";

export function NewCatalogItem({children}: {children:ReactNode}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const title=useId();
  return <div className="catalog-create">
    <button className="button" type="button" onClick={()=>dialog.current?.showModal()}><Plus size={16}/> Novo item</button>
    <dialog className="spell-dialog catalog-dialog" ref={dialog} aria-labelledby={title}>
      <header className="spell-dialog-header">
        <h2 id={title}>Novo item</h2>
        <button className="link-button" type="button" aria-label="Fechar janela" onClick={()=>dialog.current?.close()}><X size={22}/></button>
      </header>
      <div className="spell-dialog-body">{children}</div>
    </dialog>
  </div>;
}
