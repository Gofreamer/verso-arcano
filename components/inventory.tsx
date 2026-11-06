import { Cmd, Panel } from "@/components/ui";
import { equipmentSlots, formatWeight } from "@/lib/inventory";
import { EquippedItem, InventoryGrid } from "./inventory-grid";

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

export function Inventory({character, items}: {character:string; items:Item[]}) {
  const weight=items.reduce((sum,item)=>sum+(item.carried===false ? 0 : (item.weight ?? 0)*item.quantity),0);
  return <Panel title={"Inventário // "+items.length+" "+(items.length===1 ? "registro" : "registros")}>
    <p className="inventory-load">{formatWeight(weight)} de carga</p>
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
      </div>};
    })}/>
  </Panel>;
}
