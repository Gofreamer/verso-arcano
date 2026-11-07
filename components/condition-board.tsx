"use client";

import { useId, useRef, useState, useEffect, type ReactNode, type KeyboardEvent } from "react";
import { Sparkles, Skull, HeartCrack, Plus, X, Clock3 } from "lucide-react";
import { conditionKinds, type CharacterCondition } from "@/lib/conditions";

type Entry=CharacterCondition & {controls?:ReactNode};
const icons={blessing:Sparkles,curse:Skull,injury:HeartCrack};

export function ConditionBoard({entries,composer,compact=false}: {entries:Entry[];composer?:ReactNode;compact?:boolean}) {
  const [tab,setTab]=useState<CharacterCondition["kind"]>("blessing");
  const [includeEnded,setIncludeEnded]=useState(false);
  const [selected,setSelected]=useState("");
  const dialog=useRef<HTMLDialogElement>(null);
  const prefix=useId();
  const chosen=entries.find(entry=>entry.id===selected);
  const composing=selected==="new" && Boolean(composer);
  const visible=Boolean(chosen) || composing;
  const active=entries.filter(entry=>entry.status==="active");
  const filtered=entries.filter(entry=>(compact || entry.kind===tab) && (entry.status==="active" || includeEnded));
  const titleId=prefix+"-title";
  const EmptyIcon=compact ? Sparkles : icons[tab];

  useEffect(()=>{
    const element=dialog.current;
    if(visible && !element?.open) element?.showModal();
    else if(!visible && element?.open) element.close();
  },[visible]);

  function moveTab(event:KeyboardEvent<HTMLButtonElement>,index:number) {
    const moves:Record<string,number>={ArrowRight:(index+1)%3,ArrowLeft:(index+2)%3,Home:0,End:2};
    const next=moves[event.key];
    if(next===undefined) return;
    event.preventDefault();
    setTab(conditionKinds[next].id);
    document.getElementById(prefix+"-tab-"+conditionKinds[next].id)?.focus();
  }

  return <section className={"panel conditions-panel"+(compact ? " conditions-compact" : "")}>
    <div className="conditions-heading">
      <div><h2>{compact ? "Condições ativas" : "Condições"}</h2><p>{active.length ? active.length+" em vigor" : "Nenhuma condição em vigor"}</p></div>
      {composer && <button type="button" className="button" onClick={()=>setSelected("new")}><Plus size={16}/> Nova condição</button>}
    </div>
    {!compact && <>
      <div className="condition-tabs" role="tablist" aria-label="Tipos de condição">
        {conditionKinds.map((kind,index)=>{
          const Icon=icons[kind.id];
          return <button type="button" role="tab" id={prefix+"-tab-"+kind.id} aria-selected={tab===kind.id}
            aria-controls={prefix+"-panel"} tabIndex={tab===kind.id ? 0 : -1} data-kind={kind.id} key={kind.id}
            onKeyDown={event=>moveTab(event,index)} onClick={()=>setTab(kind.id)}>
            <Icon size={17}/><span>{kind.name}</span><b>{active.filter(entry=>entry.kind===kind.id).length}</b>
          </button>;
        })}
      </div>
      {entries.some(entry=>entry.status==="ended") && <label className="condition-ended-toggle">
        <input type="checkbox" checked={includeEnded} onChange={event=>setIncludeEnded(event.target.checked)}/> Mostrar encerradas
      </label>}
    </>}
    <div id={prefix+"-panel"} role={compact ? undefined : "tabpanel"} aria-labelledby={compact ? undefined : prefix+"-tab-"+tab}>
      {filtered.length ? <div className="condition-grid">{filtered.map(entry=>{
        const Icon=icons[entry.kind];
        return <button className="condition-card" type="button" data-kind={entry.kind} data-ended={entry.status==="ended"} key={entry.id} onClick={()=>setSelected(entry.id)}>
          <div className="condition-card-heading"><span className="condition-emblem"><Icon size={20}/></span>
            <span className="condition-card-name"><small>{conditionKinds.find(kind=>kind.id===entry.kind)?.singular}</small><strong>{entry.name}</strong></span>
          </div>
          <p>{entry.effect}</p>
          <span className="condition-card-footer"><Clock3 size={13}/>{entry.status==="ended" ? "Encerrada" : entry.duration || "Duração não definida"}</span>
        </button>;
      })}</div> : <div className="condition-empty">
        <EmptyIcon size={26}/>
        <p>{compact ? "Nenhuma bênção, maldição ou lesão ativa." : "Nenhuma "+({blessing:"bênção",curse:"maldição",injury:"lesão"}[tab])+" "+(includeEnded ? "registrada." : "ativa.")}</p>
      </div>}
    </div>
    <dialog className="spell-dialog catalog-dialog condition-dialog" data-kind={chosen?.kind ?? tab} ref={dialog} aria-labelledby={titleId} onClose={()=>setSelected("")}>
      {visible && <><header className="spell-dialog-header"><h2 id={titleId}>{composing ? "Nova condição" : chosen?.name}</h2>
        <button className="link-button" type="button" aria-label="Fechar janela" onClick={()=>dialog.current?.close()}><X size={22}/></button>
      </header><div className="spell-dialog-body">{composing ? composer : chosen && <>
        <div className="condition-detail-meta"><span>{conditionKinds.find(kind=>kind.id===chosen.kind)?.singular}</span>
          <span>{chosen.status==="active" ? "Em vigor" : "Encerrada"}</span></div>
        <div className="spell-block"><h4>Efeito</h4><p className="verbatim">{chosen.effect}</p></div>
        {chosen.description && <div className="spell-block"><h4>Descrição</h4><p className="verbatim">{chosen.description}</p></div>}
        <dl className="condition-facts"><div><dt>Duração</dt><dd>{chosen.duration || "Não definida"}</dd></div>
          {chosen.source && <div><dt>Origem</dt><dd>{chosen.source}</dd></div>}</dl>
        {chosen.controls}
      </>}</div></>}
    </dialog>
  </section>;
}
