import { Cmd, Field, Select } from "./ui";

type Basic = Partial<{id:string;name:string;avatar:string;age:number;species:string;origin:string;history:string;personality:string;appearance:string}>;
export function BasicForm({ sheet = {} }: {sheet?: Basic}) {
  return <Cmd name="character" submit={sheet.id ? "Salvar ficha" : "Criar personagem"} values={sheet.id ? {id:sheet.id} : {}}>
    <div className="fields">
      <Field name="name" label="Nome" value={sheet.name} max={100} required/>
      <Field name="avatar" label="Retrato (URL HTTPS)" value={sheet.avatar} type="url" max={500}/>
      <Field name="age" label="Idade" value={sheet.age} type="number" min={0}/>
      <Field name="species" label="Raça ou espécie" value={sheet.species} max={100}/>
      <Field name="origin" label="Origem" value={sheet.origin} max={150}/>
    </div>
    <Field name="history" label="História" value={sheet.history} max={6000} area/>
    <div className="fields">
      <Field name="personality" label="Personalidade" value={sheet.personality} max={3000} area/>
      <Field name="appearance" label="Aparência" value={sheet.appearance} max={3000} area/>
    </div>
  </Cmd>;
}

type Spell = Partial<{id:string;name:string;formula:string;intention:string;description:string;item_id:string}>;
type Option = {id:string;name:string};
export function SpellForm({character, items, spell = {}, parent, kind}: {
  character:string; items:Option[]; spell?:Spell; parent?:string; kind?:"revision"|"mastery";
}) {
  return <Cmd name="spell_save" values={{character,id:spell.id ?? "",parent:parent ?? "",kind:kind ?? ""}} submit="Salvar rascunho">
    <div className="fields">
      <Field name="name" label="Nome do encantamento" value={spell.name} required/>
      <Select name="item" label="Canalizador" value={spell.item_id} options={items} blank="Sem objeto específico"/>
    </div>
    <Field name="formula" label="Fórmula poética (um verso por linha)" value={spell.formula} max={6000} required area/>
    <Field name="intention" label="Intenção do encantamento" value={spell.intention} max={4000} required area/>
    <Field name="description" label="Descrição opcional" value={spell.description} max={4000} area/>
  </Cmd>;
}
