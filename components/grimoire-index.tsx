"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BookOpen, Plus, X, Zap } from "lucide-react";

export function SpellMedia({ url, thumbnail = false }: {url?:string; thumbnail?:boolean}) {
  const [failed, setFailed] = useState(false);
  return <div className={thumbnail ? "spell-media spell-thumbnail" : "spell-media"}>
    {url && !failed
      ? <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      : <BookOpen aria-hidden="true" size={thumbnail ? 24 : 40}/>}
  </div>;
}

type Entry = {
  id:string; name:string; category:string; image?:string; cost?:number|null; official:boolean;
  badge:ReactNode; detail:ReactNode;
};

export function GrimoireIndex({ entries, composer }: {entries:Entry[]; composer:ReactNode}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const entry = entries.find(item => item.id === selected);
  const composing = selected === "compose";
  const visible = composing || Boolean(entry);
  const categories = [...new Set(entries.map(item => item.category))].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const matches = entries.filter(item => (!category || item.category === category)
    && (item.name + " " + item.category).toLocaleLowerCase("pt-BR").includes(search));

  useEffect(() => {
    const followHash = () => setSelected(location.hash.slice(1));
    followHash();
    window.addEventListener("hashchange",followHash);
    return () => window.removeEventListener("hashchange",followHash);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (visible && element && !element.open) element.showModal();
    if (!visible && element?.open) element.close();
  }, [visible]);

  function close() {
    if (location.hash.slice(1) === selected) history.replaceState(history.state,"",location.pathname + location.search);
    setSelected("");
  }

  return <section className="panel spell-index">
    <div className="toolbar"><h2>Grimório <small>· {entries.length} registros</small></h2>
      <button className="button" type="button" onClick={() => setSelected("compose")}><Plus size={16}/> Criar encantamento</button>
    </div>
    {entries.length > 0 && <div className="spell-filters">
      <input type="search" aria-label="Pesquisar encantamento" placeholder="Pesquisar por nome ou tipo…" value={query} onChange={event => setQuery(event.target.value)}/>
      <select aria-label="Filtrar por tipo" value={category} onChange={event => setCategory(event.target.value)}>
        <option value="">Todos os tipos</option>
        {categories.map(type => <option key={type}>{type}</option>)}
      </select>
    </div>}
    {[true,false].map(official => {
      const group = matches.filter(item => item.official === official);
      if (!group.length) return null;
      return <section className="spell-group" key={String(official)}>
        <h3>{official ? "Encantamentos aprovados" : "Rascunhos e solicitações"}</h3>
        <div className="spell-grid">{group.map(item => <button className="spell-card" type="button" key={item.id} onClick={() => setSelected(item.id)}>
          <SpellMedia key={item.image} url={item.image} thumbnail/>
          <span className="spell-card-info">
            <span className="eyebrow">{item.category}</span>
            <strong>{item.name}</strong>
            {item.cost != null && <span className="spell-cost"><Zap size={13}/> {item.cost} Mana</span>}
            {!item.official && item.badge}
          </span>
        </button>)}</div>
      </section>;
    })}
    {!matches.length && <p className="muted">{entries.length ? "Nenhum encantamento corresponde à busca." : "Seu grimório está vazio. Crie um encantamento para começar."}</p>}
    <dialog ref={dialog} className="spell-dialog" aria-labelledby={title} onClose={close}>
      {visible && <><header className="spell-dialog-header">
        <h2 id={title}>{composing ? "Criar encantamento" : "Registro de encantamento"}</h2>
        <button type="button" className="link-button" aria-label="Fechar janela" onClick={() => dialog.current?.close()}><X size={22}/></button>
      </header>
      <div className="spell-dialog-body">{composing ? composer : entry?.detail}</div></>}
    </dialog>
  </section>;
}
