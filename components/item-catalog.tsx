import { Cmd, Empty, Field, Panel, Select } from "@/components/ui";
import { equipmentSlots, formatWeight, rarities } from "@/lib/inventory";
import { NewCatalogItem } from "./new-catalog-item";

type CatalogItem={id:string;name:string;category:string;rarity:string;weight:number;description:string;consumable:boolean;stack_limit:number;image_url?:string};

export function ItemCatalog({items, characters}: {items:CatalogItem[];characters:{id:string;name:string}[]}) {
  return <Panel title="Catálogo de itens" id="catalogo">
    <NewCatalogItem>
      <Cmd name="catalog_create" submit="Salvar item">
        <Field name="name" label="Nome" required/>
        <Field name="description" label="Descrição" max={3000} area/>
        <Field name="image_url" label="Imagem ou GIF (URL HTTPS direta)" type="url" max={2000}/>
        <div className="fields">
          <Field name="category" label="Categoria" value="Diversos" required/>
          <Select name="rarity" label="Raridade" options={rarities.map(name=>({id:name,name}))}/>
          <Field name="weight" label="Peso por unidade (kg)" value={0} type="number" min={0} step={0.001} required/>
          <Field name="stack_limit" label="Máximo por pilha (se empilhável)" value={10} type="number" min={2}/>
        </div>
        <div className="inventory-checks">
          <label><input name="stackable" type="checkbox"/> Empilhável</label>
          <label><input name="equippable" type="checkbox"/> Equipável</label>
          <label><input name="consumable" type="checkbox"/> Consumível</label>
        </div>
        <details><summary>Posições permitidas para equipar</summary>
          <div className="inventory-checks">{equipmentSlots.map(slot=><label key={slot.id}>
            <input name={"slot_"+slot.id} type="checkbox"/> {slot.name}
          </label>)}</div>
        </details>
        <Field name="tags" label="Tags separadas por vírgulas" max={300}/>
      </Cmd>
    </NewCatalogItem>
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
      </div>
    </article>)}</div>
  </Panel>;
}
