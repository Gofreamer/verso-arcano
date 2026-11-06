import { Package } from "lucide-react";
import Link from "next/link";
import { Cmd, Empty, Panel, Select } from "@/components/ui";
import { equipmentSlots, formatWeight } from "@/lib/inventory";

type Item = {
  id:string; name:string; category:string; quantity:number; description:string; image_url?:string|null;
  rarity?:string; weight?:number; tags?:string; slots?:string[]; equipped_slot?:string|null; consumable?:boolean;
};

export function Equipment({items}: {items:Item[]}) {
  return <Panel title="Equipamento">
    <dl className="equipment-list">{equipmentSlots.map(slot => {
      const item=items.find(entry=>entry.equipped_slot===slot.id);
      return <div key={slot.id}><dt>{slot.name}</dt><dd>{item ? <a href={"#item-"+item.id}>{item.name}</a> : "—"}</dd></div>;
    })}</dl>
  </Panel>;
}

export function Inventory({character, items, query}: {
  character:string; items:Item[]; query:{busca?:string;categoria?:string;raridade?:string;estado?:string};
}) {
  const options=(values:string[])=>[...new Set(values)].sort((a,b)=>a.localeCompare(b,"pt-BR")).map(name=>({id:name,name}));
  const categories=options(items.map(item=>item.category));
  const rarities=options(items.map(item=>item.rarity ?? "Comum"));
  const search=typeof query.busca==="string" ? query.busca.trim().slice(0,120) : "";
  const normalize=(value:string)=>value.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLocaleLowerCase("pt-BR");
  const visible=items.filter(item=>
    (!query.categoria || item.category===query.categoria) &&
    (!query.raridade || (item.rarity ?? "Comum")===query.raridade) &&
    (query.estado!=="equipado" || item.equipped_slot) && (query.estado!=="consumivel" || item.consumable) &&
    normalize([item.name,item.category,item.description,item.tags].join(" ")).includes(normalize(search)));
  const weight=items.reduce((sum,item)=>sum+(item.weight ?? 0)*item.quantity,0);

  return <Panel title="Inventário">
    <p>{items.length} {items.length===1 ? "registro" : "registros"} · {formatWeight(weight)} no inventário</p>
    {items.length>0 && <form className="field-filters" method="get">
      <input type="hidden" name="aba" value="inventario"/>
      <label>Buscar<input type="search" name="busca" defaultValue={search} maxLength={120} placeholder="Nome ou tag"/></label>
      <Select name="categoria" label="Categoria" value={query.categoria} blank="Todas" options={categories}/>
      <Select name="raridade" label="Raridade" value={query.raridade} blank="Todas" options={rarities}/>
      <Select name="estado" label="Mostrar" value={query.estado} blank="Todos" options={[{id:"equipado",name:"Equipados"},{id:"consumivel",name:"Consumíveis"}]}/>
      <button className="button" type="submit">Filtrar</button>
      {(search || query.categoria || query.raridade || query.estado) && <Link className="field-edit" href="?aba=inventario">Limpar filtros</Link>}
    </form>}
    {!visible.length && <Empty>{items.length ? "Nenhum item corresponde aos filtros." : "Nenhum item no inventário."}</Empty>}
    <div className="field-inventory">{visible.map(item=>{
      const slots=equipmentSlots.filter(slot=>item.slots?.includes(slot.id) && !items.some(copy=>copy.equipped_slot===slot.id));
      const values={character,id:item.id};
      return <article className="field-item" id={"item-"+item.id} key={item.id}>
        <div className="field-item-art">{item.image_url
          ? <img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer"/>
          : <Package size={32} aria-hidden="true"/>}
          {item.equipped_slot && <span className="inventory-equipped">Equipado</span>}
        </div>
        <div className="field-item-body">
          <span className="eyebrow">{item.category}</span><h3>{item.name}</h3>
          <div className="inventory-meta"><span>× {item.quantity}</span><span>{formatWeight((item.weight ?? 0)*item.quantity)}</span></div>
          <span className="inventory-rarity" data-rarity={item.rarity}>{item.rarity ?? "Comum"}</span>
          {item.consumable && <span className="badge">Consumível</span>}
          <details><summary>Detalhes e ações</summary>
            {item.description && <p className="verbatim">{item.description}</p>}
            {item.tags && <p>{item.tags}</p>}
            {item.equipped_slot ? <Cmd name="item_unequip" values={values} submit="Desequipar"/>
              : slots.length>0 ? <Cmd name="item_equip" values={values} submit="Equipar">
                <Select name="slot" label="Posição" options={slots}/>
              </Cmd> : Boolean(item.slots?.length) && <p>Posições compatíveis ocupadas.</p>}
            {item.consumable && <details><summary>Consumir</summary>
              <p>Uma unidade será removida do inventário.</p>
              <Cmd name="item_consume" values={values} submit="Confirmar consumo"/>
            </details>}
          </details>
        </div>
      </article>;
    })}</div>
  </Panel>;
}
