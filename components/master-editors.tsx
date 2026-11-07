import { Cmd, Field, Select } from "./ui";

type Definition = {id:string;name:string;minimum:number;maximum:number;baseline:number;category?:string;description?:string};
export function SkillDefinitionForm({skill,character,value}: {skill?:Definition;character?:string;value?:number}) {
  return <Cmd name={character ? "attribute_edit" : "attribute_def"} values={{id:skill?.id ?? "",...(character && {character})}} submit="Salvar perícia">
    <div className="fields">
      <Field name="name" label="Nome" value={skill?.name} max={80} required/>
      <Field name="minimum" label="Mínimo" value={skill?.minimum} type="number" required/>
      <Field name="maximum" label="Máximo" value={skill?.maximum} type="number" required/>
      {character ? <Field name="value" label="Valor nesta ficha" value={value} type="number" required/>
        : <Field name="baseline" label="Valor inicial" value={skill?.baseline} type="number" required/>}
    </div>
    <Field name="category" label="Categoria (opcional)" value={skill?.category} max={80}/>
    <Field name="description" label="O que esta perícia cobre" value={skill?.description} max={1000} area/>
  </Cmd>;
}

type ApprovedSpell = {id:string;review_id:string;name:string;description?:string;image_url?:string;category?:string;formula?:string;kind:string};
type Approval = {cost?:number;effect?:string;limitations?:string;cooldown?:string;damage?:string;duration_label?:string;
  tier_id?:string;range_m?:number;duration_turns?:number;immersive?:{name:string;manifestation:string;description:string}};
export function ApprovedSpellForm({spell,review,tiers}: {
  spell:ApprovedSpell;review:Approval;tiers:{id:string;name:string}[];
}) {
  const granted=spell.kind==="grant";
  return <Cmd name="spell_edit" values={{id:spell.id,review_id:spell.review_id}} submit="Salvar habilidade" collapseOnSuccess>
    <div className="fields">
      <Field name="name" label="Nome" value={review.immersive?.name ?? spell.name} required/>
      <Field name="category" label="Tipo" value={spell.category} max={60}/>
      <Field name="image_url" label="Imagem ou GIF (URL HTTPS direta)" value={spell.image_url} type="url" max={2000}/>
      <Field name="cost" label="Custo em Mana" value={review.cost} type="number" min={0} required/>
      <Field name="cooldown" label="Recarga" value={review.cooldown} max={160}/>
      <Field name="damage" label="Dano ou rolagem" value={review.damage} max={160}/>
      {granted ? <Field name="duration_label" label="Duração" value={review.duration_label} max={160}/> : <>
        <Select name="tier" label="Tier" value={review.tier_id} options={tiers} blank="Selecione"/>
        <Field name="range" label="Alcance (m)" value={review.range_m} type="number" min={0} required/>
        <Field name="duration" label="Duração (turnos)" value={review.duration_turns} type="number" min={0} required/>
      </>}
    </div>
    <Field name="description" label="Descrição" value={spell.description} max={4000} area/>
    <Field name="effect" label="Efeito" value={review.effect} max={4000} area required/>
    <Field name="limitations" label="Condições e limitações" value={review.limitations} max={4000} area/>
    {granted ? <Field name="formula" label="Fórmula poética (opcional)" value={spell.formula} max={6000} area/> : <>
      <Field name="manifestation" label="Manifestação para o jogador" value={review.immersive?.manifestation} max={4000} area/>
      <Field name="immersive_description" label="Descrição imersiva do efeito final" value={review.immersive?.description ?? review.effect} max={4000} area/>
    </>}
  </Cmd>;
}
