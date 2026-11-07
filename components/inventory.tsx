import { Cmd, Field, Panel } from "@/components/ui";
import { equipmentSlots, formatWeight } from "@/lib/inventory";
import { EquippedItem, InventoryGrid } from "./inventory-grid";
import { ItemFields } from "./item-fields";

type Item = {
  id:string; name:string; category:string; quantity:number; description:string; image_url?:string|null;
  rarity?:string; weight?:number; tags?:string; slots?:string[]; equipped_slot?:string|null; consumable?:boolean; carried?:boolean;
};

export function Equipment({items}: {items:Item[]}) {
  return <Panel title="Equipamento">
    <dl className="equipment-list">{equipmentSlots.map(slot => {
      const item=items.find(entry=>entry.equipped_slot===slot.id);
      return <div key={slot.id}><dt>{slot.name}</dt><dd>{item ? <EquippedItem id={item.id} name={item.name}/> : "— Vazio —"}</dd></div>;
    })}</dl>
  </Panel>;
}

export function Inventory({character, items, master, capacity}: {character:string; items:Item[]; master:boolean; capacity?:number}) {
  const weight=items.reduce((sum,item)=>sum+(item.carried===false ? 0 : (item.weight ?? 0)*item.quantity),0);
  const configured=typeof capacity==="number" && Number.isFinite(capacity) && capacity>0;
  const percentage=configured ? weight/capacity*100 : 0;
  const loadState=percentage>100 ? "exceeded" : percentage>=80 ? "near" : "normal";
  return <Panel title={"Inventário // "+items.length+" "+(items.length===1 ? "registro" : "registros")}>
    <div className="inventory-capacity" data-state={loadState}>
      <div className="capacity-heading"><span>Carga transportada</span><strong>{formatWeight(weight)}{configured && <> / {formatWeight(capacity)}</>}</strong></div>
      {configured ? <>
        <progress value={Math.min(weight,capacity)} max={capacity} aria-label="Peso transportado em relação ao limite"/>
        <div className="capacity-heading"><span>{loadState==="exceeded" ? "Limite excedido" : loadState==="near" ? "Próximo do limite" : "Dentro do limite"}</span>
          <span>{Math.round(percentage)}% · {loadState==="exceeded" ? formatWeight(weight-capacity)+" acima" : formatWeight(capacity-weight)+" disponíveis"}</span></div>
      </> : <p>O mestre ainda não definiu o limite de carga.</p>}
    </div>
    <InventoryGrid items={items.map(item=>{
      const slots=equipmentSlots.filter(slot=>item.slots?.includes(slot.id) && !items.some(copy=>copy.equipped_slot===slot.id));
      const equipped=equipmentSlots.find(slot=>slot.id===item.equipped_slot);
      const values={character,id:item.id};
      return {...item,actions:<div className="item-detail-actions">
        {equipped ? <>
          <p>Equipado em <b>{equipped.name}</b></p>
          <Cmd name="item_unequip" values={values} submit="Desequipar"/>
        </> : <>
          <Cmd name="item_carry" values={{...values,carry:item.carried===false ? "yes" : "no"}} submit={item.carried===false ? "Levar consigo" : "Não levar"}/>
          {slots.length>0 ? <div className="item-slot-actions"><p>Equipar em</p>
            {slots.map(slot=><Cmd key={slot.id} name="item_equip" values={{...values,slot:slot.id}} submit={slot.name}/>)}
          </div> : Boolean(item.slots?.length) && <p>Posições compatíveis ocupadas.</p>}
        </>}
        {item.consumable && <details><summary>Consumir</summary>
          <p>Uma unidade será removida do inventário.</p>
          <Cmd name="item_consume" values={values} submit="Confirmar consumo"/>
        </details>}
        {master && <>
          <details><summary>Editar item</summary>
            <Cmd name="item_edit" values={values} submit="Salvar alterações">
              <ItemFields item={item}/>
              {!equipped ? <Field name="quantity" label="Quantidade" value={item.quantity} type="number" min={1} required/>
                : <input type="hidden" name="quantity" value="1"/>}
            </Cmd>
          </details>
          <details><summary>Excluir item</summary>
            <p>Remove esta cópia do inventário do personagem.</p>
            <Cmd name="item_delete" values={values} submit="Confirmar exclusão"/>
          </details>
        </>}
      </div>};
    })}/>
  </Panel>;
}
