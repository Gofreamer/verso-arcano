import { Field, Select } from "@/components/ui";
import { rarities } from "@/lib/inventory";

type Details = {name:string;category:string;description:string;rarity?:string;weight?:number;tags?:string;image_url?:string|null};

export function ItemFields({item}: {item?:Details}) {
  return <>
    <Field name="name" label="Nome" value={item?.name} required/>
    <Field name="description" label="Descrição" value={item?.description} max={3000} area/>
    <Field name="image_url" label="Imagem ou GIF (URL HTTPS direta)" value={item?.image_url} type="url" max={2000}/>
    <div className="fields">
      <Field name="category" label="Categoria" value={item?.category ?? "Diversos"} required/>
      <Select name="rarity" label="Raridade" value={item?.rarity} options={rarities.map(name=>({id:name,name}))}/>
      <Field name="weight" label="Peso por unidade (kg)" value={item?.weight ?? 0} type="number" min={0} step={0.001} required/>
    </div>
    <Field name="tags" label="Tags separadas por vírgulas" value={item?.tags} max={300}/>
  </>;
}
