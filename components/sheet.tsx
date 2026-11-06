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

type Spell = Partial<{
  id:string;name:string;formula:string;intention:string;description:string;item_id:string;category:string;image_url:string;
  proposal:Partial<{cost:number|null;duration:number|null;cooldown:string;damage:string;effect:string;limitations:string}>;
}>;
type Option = {id:string;name:string};
export function SpellForm({character, items, spell = {}, parent, kind}: {
  character:string; items:Option[]; spell?:Spell; parent?:string; kind?:"revision"|"mastery"|"original";
}) {
  return <Cmd name="submit" values={{character,id:spell.id ?? "",parent:parent ?? "",kind:kind ?? ""}} submit="Enviar para avaliação">
    <div className="fields">
      <Field name="name" label="Nome do encantamento" value={spell.name} required/>
      <Field name="category" label="Tipo (ex.: Técnica, Passiva)" value={spell.category} max={60}/>
      <Field name="image_url" label="Imagem ou GIF (URL HTTPS direta)" value={spell.image_url} type="url" max={2000}/>
      <Select name="item" label="Canalizador" value={spell.item_id} options={items} blank="Sem objeto específico"/>
    </div>
    <Field name="formula" label="Fórmula poética (um verso por linha)" value={spell.formula} max={6000} required area/>
    <Field name="intention" label="Intenção do encantamento" value={spell.intention} max={4000} required area/>
    <Field name="description" label="Descrição opcional" value={spell.description} max={4000} area/>
    {kind !== "mastery" && <fieldset className="spell-proposal">
      <legend>Proposta para o mestre</legend>
      <div className="fields">
        <Field name="proposed_cost" label="Custo em Mana" value={spell.proposal?.cost} type="number" min={0}/>
        <Field name="proposed_cooldown" label="Recarga" value={spell.proposal?.cooldown} max={160}/>
        <Field name="proposed_duration" label="Duração (turnos)" value={spell.proposal?.duration} type="number" min={0}/>
        <Field name="proposed_damage" label="Dano" value={spell.proposal?.damage} max={160}/>
      </div>
      <Field name="proposed_effect" label="Efeito sugerido" value={spell.proposal?.effect} max={4000} area/>
      <Field name="proposed_limitations" label="Condições e limitações sugeridas" value={spell.proposal?.limitations} max={4000} area/>
    </fieldset>}
  </Cmd>;
}
