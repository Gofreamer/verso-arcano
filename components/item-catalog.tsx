import { Cmd, Empty, Field, Panel, Select } from "@/components/ui";
import { equipmentSlots, formatWeight } from "@/lib/inventory";
import { NewCatalogItem } from "./new-catalog-item";
import { ItemFields } from "./item-fields";

type CatalogItem={id:string;name:string;category:string;rarity:string;weight:number;description:string;
  consumable:boolean;stack_limit:number;image_url?:string|null;tags?:string;slots?:string[]};

function CatalogForm({item}: {item?:CatalogItem}) {
  return <Cmd name={item ? "catalog_edit" : "catalog_create"} values={item ? {id:item.id} : undefined} submit="Salvar item">
    <ItemFields item={item}/>
    <div className="inventory-checks">
      <label><input name="stackable" type="checkbox" defaultChecked={Boolean(item && item.stack_limit>1)}/> Empilhável</label>
      <label><input name="equippable" type="checkbox" defaultChecked={Boolean(item?.slots?.length)}/> Equipável</label>
      <label><input name="consumable" type="checkbox" defaultChecked={item?.consumable}/> Consumível</label>
    </div>
    <details><summary>Posições permitidas para equipar</summary>
      <div className="inventory-checks">{equipmentSlots.map(slot=><label key={slot.id}>
        <input name={"slot_"+slot.id} type="checkbox" defaultChecked={item?.slots?.includes(slot.id)}/> {slot.name}
      </label>)}</div>
    </details>
    {item && <p>As alterações valem para as próximas entregas. Para ajustar uma cópia existente, edite-a na ficha.</p>}
  </Cmd>;
}

export function ItemCatalog({items, characters}: {items:CatalogItem[];characters:{id:string;name:string}[]}) {
  return <Panel title="Catálogo de itens" id="catalogo">
    <NewCatalogItem><CatalogForm/></NewCatalogItem>
    {!items.length && <Empty>Crie um item para começar a distribuir cópias aos personagens.</Empty>}
    <div className="field-inventory catalog-grid">{items.map(item=><article className="field-item" key={item.id}>
      {item.image_url && <div className="field-item-art"><img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer"/></div>}
      <div className="field-item-body">
        <span className="eyebrow">{item.category}</span><h3>{item.name}</h3>
        <p>{item.rarity} · {formatWeight(item.weight)} por unidade{item.consumable ? " · Consumível" : ""}</p>
        {item.description && <p className="verbatim">{item.description}</p>}
        {characters.length>0 ? <details><summary>Dar item</summary>
          <Cmd name="catalog_grant" values={{id:item.id}} submit="Entregar">
            <Select name="character" label="Personagem" options={characters} blank="Selecione"/>
            <Field name="quantity" label="Quantidade" value={1} type="number" min={1} required/>
          </Cmd>
        </details> : <p>Cadastre um personagem para entregar o item.</p>}
        <NewCatalogItem label="Editar" title={"Editar " + item.name}><CatalogForm item={item}/></NewCatalogItem>
        <details><summary>Excluir</summary>
          <p>Remove o item do catálogo. Retire primeiro as cópias que estiverem em inventários.</p>
          <Cmd name="catalog_delete" values={{id:item.id}} submit="Confirmar exclusão"/>
        </details>
      </div>
    </article>)}</div>
  </Panel>;
}
