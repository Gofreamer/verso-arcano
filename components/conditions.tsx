import { Cmd, Field, Select } from "./ui";
import { ConditionBoard } from "./condition-board";
import { conditionKinds, type CharacterCondition } from "@/lib/conditions";
import { read, session } from "@/lib/auth";

function ConditionForm({character,entry}: {character:string;entry?:CharacterCondition}) {
  return <Cmd name="condition_save" values={{character,id:entry?.id ?? "",revision:String(entry?.revision ?? 0)}} submit={entry ? "Salvar condição" : "Adicionar condição"} collapseOnSuccess={Boolean(entry)}>
    <div className="fields">
      <Field name="name" label="Nome" value={entry?.name} max={100} required/>
      <Select name="kind" label="Tipo" value={entry?.kind} options={conditionKinds.map(kind=>({id:kind.id,name:kind.singular}))}/>
    </div>
    <Field name="effect" label="Efeito sobre o personagem" value={entry?.effect} max={1000} area required/>
    <Field name="description" label="Descrição e detalhes (opcional)" value={entry?.description} max={4000} area/>
    <div className="fields">
      <Field name="duration" label="Duração (opcional)" value={entry?.duration} max={160}/>
      <Field name="source" label="Origem (opcional)" value={entry?.source} max={160}/>
    </div>
  </Cmd>;
}

export async function Conditions({character,compact=false}: {character:string;compact?:boolean}) {
  const {db,master}=await session();
  const entries=read(await db.from("conditions").select("*").eq("character_id",character).order("updated_at",{ascending:false}));
  const visible=compact ? entries.filter(entry=>entry.status==="active") : entries;
  return <ConditionBoard compact={compact}
    composer={master && !compact ? <ConditionForm character={character}/> : undefined}
    entries={visible.map(entry=>({...entry,controls:master ? <div className="condition-controls">
      <details><summary>Editar condição</summary><ConditionForm key={entry.revision} character={character} entry={entry}/></details>
      {entry.status==="active" && <details><summary>Encerrar condição</summary>
        <p>Esta condição deixará de aparecer entre as condições ativas.</p>
        <Cmd name="condition_end" values={{character,id:entry.id,revision:String(entry.revision)}} submit="Confirmar encerramento"/>
      </details>}
      <details><summary>Excluir condição</summary><p>Remove esta condição da ficha.</p>
        <Cmd name="condition_delete" values={{character,id:entry.id,revision:String(entry.revision)}} submit="Confirmar exclusão"/>
      </details>
    </div> : undefined}))}/>;
}
