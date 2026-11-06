"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Package, Search, X } from "lucide-react";
import { formatWeight } from "@/lib/inventory";

const Selection = createContext({id:"", select: (_id:string) => {}});
export function InventorySelection({children}: {children:ReactNode}) {
  const [id,select]=useState("");
  return <Selection.Provider value={{id,select}}>{children}</Selection.Provider>;
}

export function EquippedItem({id,name}: {id:string;name:string}) {
  const {select}=useContext(Selection);
  return <button type="button" className="equipment-link" onClick={()=>select(id)}>{name}</button>;
}

type Entry = {
  id:string; name:string; category:string; rarity?:string; image_url?:string|null; quantity:number;
  weight?:number; tags?:string; description:string; equipped_slot?:string|null; carried?:boolean;
  consumable?:boolean; actions:ReactNode;
};

export function InventoryGrid({items}: {items:Entry[]}) {
  const {id,select}=useContext(Selection);
  const selected=items.find(item=>item.id===id);
  const dialog=useRef<HTMLDialogElement>(null);
  const title=useId();
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("");
  const [rarity,setRarity]=useState("");
  const [state,setState]=useState("");
  const [sort,setSort]=useState("name");
  const categories=[...new Set(items.map(item=>item.category))].sort();
  const rarities=[...new Set(items.map(item=>item.rarity ?? "Comum"))].sort();
  const normalize=(value:string)=>value.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLocaleLowerCase("pt-BR");
  const weight=(item:Entry)=>(item.weight ?? 0)*item.quantity;
  const visible=items.filter(item=>
    (!category || item.category===category) && (!rarity || (item.rarity ?? "Comum")===rarity)
    && (state!=="equipped" || item.equipped_slot) && (state!=="stored" || !item.equipped_slot)
    && (state!=="consumable" || item.consumable)
    && normalize([item.name,item.tags,item.description].join(" ")).includes(normalize(search.trim())))
    .sort((a,b)=>(sort==="weight" ? weight(b)-weight(a) : sort==="quantity" ? b.quantity-a.quantity : 0) || a.name.localeCompare(b.name,"pt-BR"));

  useEffect(()=>{
    const element=dialog.current;
    if(selected && !element?.open) element?.showModal();
    else if(!selected && element?.open) element.close();
  },[selected]);

  return <>
    {items.length>0 && <div className="inventory-filters">
      <div className="inventory-search"><Search size={16}/><input type="search" aria-label="Pesquisar itens" placeholder="Pesquisar item ou tag…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <select aria-label="Categoria" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas categorias</option>{categories.map(value=><option key={value}>{value}</option>)}</select>
      <select aria-label="Raridade" value={rarity} onChange={e=>setRarity(e.target.value)}><option value="">Todas raridades</option>{rarities.map(value=><option key={value}>{value}</option>)}</select>
      <select aria-label="Estado" value={state} onChange={e=>setState(e.target.value)}><option value="">Todos</option><option value="equipped">Equipados</option><option value="stored">Guardados</option><option value="consumable">Consumíveis</option></select>
      <select aria-label="Ordenar" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Nome</option><option value="weight">Peso</option><option value="quantity">Quantidade</option></select>
    </div>}
    {!visible.length && <p>{items.length ? "Nenhum item corresponde aos filtros." : "Nenhum item no inventário."}</p>}
    <div className="field-inventory">{visible.map(item=><button type="button" className="field-item inventory-card" key={item.id} onClick={()=>select(item.id)}>
      <span className="field-item-art">{item.image_url ? <img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer"/> : <Package size={32} aria-hidden="true"/>}
        {(item.equipped_slot || item.carried===false) && <span className="inventory-equipped">{item.equipped_slot ? "Equipado" : "Fora da carga"}</span>}
      </span>
      <span className="field-item-body">
        <span className="eyebrow">{item.category}</span><strong>{item.name}</strong>
        <span className="inventory-meta"><span>× {item.quantity}</span><span>{formatWeight(weight(item))}</span></span>
        <span className="inventory-rarity" data-rarity={item.rarity}>{item.rarity ?? "Comum"}</span>
      </span>
    </button>)}</div>
    <dialog className="spell-dialog item-detail-dialog" ref={dialog} aria-labelledby={title} onClose={()=>select("")} onClick={e=>{if(e.target===e.currentTarget) dialog.current?.close()}}>
      {selected && <>
        <header className="spell-dialog-header"><h2 id={title}>Registro de item</h2><button type="button" className="link-button" aria-label="Fechar janela" onClick={()=>dialog.current?.close()}><X size={22}/></button></header>
        <div className="spell-dialog-body">
          <div className="spell-hero">
            <div className="spell-media">{selected.image_url ? <img src={selected.image_url} alt="" referrerPolicy="no-referrer"/> : <Package size={48} aria-hidden="true"/>}</div>
            <div><span className="eyebrow">{selected.category} · {selected.rarity ?? "Comum"}</span><h3>{selected.name}</h3>
              <p className="verbatim">{selected.description || "Sem descrição registrada."}</p>
              {selected.tags && <p>{selected.tags}</p>}
              {selected.consumable && <span className="badge">Consumível</span>}
            </div>
          </div>
          <dl className="spell-stats">
            <div><dt>Quantidade</dt><dd>× {selected.quantity}</dd></div>
            <div><dt>Peso unitário</dt><dd>{formatWeight(selected.weight ?? 0)}</dd></div>
            <div><dt>Peso total</dt><dd>{formatWeight(weight(selected))}</dd></div>
            <div><dt>Estado</dt><dd>{selected.equipped_slot ? "Equipado" : selected.carried===false ? "Fora da carga" : "Guardado"}</dd></div>
          </dl>
          {selected.actions}
        </div>
      </>}
    </dialog>
  </>;
}
