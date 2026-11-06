import { SpellForm } from "@/components/sheet";
import { Cmd, Field, Select, Status } from "@/components/ui";
import { GrimoireIndex, SpellMedia } from "@/components/grimoire-index";
import { RejectionConsequence } from "@/components/rejection-consequence";
import { read, session } from "@/lib/auth";
import { hasAnalysis } from "@/lib/analysis";

type Tier = {id:string;name:string;rank:number;limits:string;max_range:number;max_duration:number;max_cost:number};
type Item = {id:string;name:string;quantity:number};
type Bond = {item_id:string;status:string};
const kinds: Record<string,string> = {mastery:"Maestria",revision:"Revisão",original:"Fórmula original"};
const reportFields: Record<string,string> = {
  rimas:"Rimas", coerencia:"Coerência", intencao:"Clareza da intenção", metaforas:"Metáforas", relacao:"Relação com a magia",
  fenomeno:"Fenômeno", tipo:"Tipo de efeito", usos:"Usos possíveis", consequencias:"Consequências", limitacoes:"Limitações",
  condicoes:"Condições", fraquezas:"Fraquezas", abusos:"Riscos de abuso", compatibilidade:"Compatibilidade", ajustes:"Ajustes sugeridos",
  alcance:"Alcance (m)", duracao:"Duração (turnos)", custo:"Custo em Mana",
};

export async function Grimoire({character, tiers, cap, items, bonds, requireBond, minVerses}: {
  character:string; tiers:Tier[]; cap?:Tier; items:Item[]; bonds:Bond[]; requireBond:boolean; minVerses:number;
}) {
  const { db, master } = await session();
  const analysisEnabled = hasAnalysis();
  const spells = read(await db.from("spells").select("*").eq("character_id",character).order("updated_at",{ascending:false}))
    .filter(spell => spell.status !== "draft");
  const reviewIds = spells.flatMap(spell => spell.review_id ? [spell.review_id] : []);
  const reviews = reviewIds.length ? read(await db.from("spell_reviews").select("*").in("id",reviewIds)) : [];
  const analyses = master && reviews.length ? read(await db.from("ai_analyses").select("*").in("review_id",reviews.map(r=>r.id))) : [];
  const activeIds = new Set(bonds.filter(b => b.status === "active").map(b => b.item_id));
  const eligibleItems = items.filter(item => activeIds.has(item.id) && item.quantity > 0);
  const eligibleTiers = tiers.filter(t => cap && t.rank <= cap.rank);
  function renderSpell(spell: (typeof spells)[number]) {
    const review = reviews.find(r => r.id === spell.review_id);
    const ai = analyses.find(a => a.review_id === review?.id);
    const analysis = ai?.result.mestre;
    const draft = ai?.result.imersiva;
    const tier = tiers.find(t => t.id === review?.tier_id);
    const parent = spells.find(s => s.id === spell.parent_id);
    const bound = spell.item_id ? eligibleItems.some(i => i.id === spell.item_id) : !requireBond || eligibleItems.length > 0;
    const available = bound && review && tier && cap && tier.rank <= cap.rank && review.range_m <= Math.min(tier.max_range,cap.max_range)
      && review.duration_turns <= Math.min(tier.max_duration,cap.max_duration) && review.cost <= Math.min(tier.max_cost,cap.max_cost);
    const official = spell.status === "approved";
    const immersive = official && review?.decision === "approved" ? review.immersive : undefined;
    const tierName = review?.tier_name ?? tier?.name;
    const name = immersive?.name ?? spell.name;
    const stats = official ? review : spell.proposal;
    const duration = official ? review?.duration_turns : spell.proposal?.duration;
    const category = spell.category || "Encantamento";
    const detail = <article className="spell-detail" id={spell.id}>
      <div className="spell-hero">
        <SpellMedia key={spell.image_url} url={spell.image_url}/>
        <div><div className="eyebrow">{category} · {kinds[spell.kind]}{parent && " · " + parent.name}</div>
          <h3>{name}</h3><Status state={spell.status}/>
          {spell.description && <p className="verbatim">{spell.description}</p>}
        </div>
      </div>
      <dl className="spell-stats">
        <div><dt>Custo em Mana</dt><dd>{stats?.cost == null ? "—" : stats.cost + " Mana"}</dd></div>
        <div><dt>Recarga</dt><dd>{stats?.cooldown || "—"}</dd></div>
        <div><dt>Duração</dt><dd>{duration == null ? "—" : duration + " turno(s)"}</dd></div>
        <div><dt>Dano</dt><dd>{stats?.damage || "—"}</dd></div>
      </dl>
      {immersive && <div className="spell-block">
        <h4>A força respondeu.</h4>
        {immersive.manifestation && <p className="verbatim">{immersive.manifestation}</p>}
        <h3>{name}</h3>
        <p className="verbatim">{immersive.description}</p>
        <dl className="spell-stats">
          <div><dt>Escala</dt><dd>{tierName}</dd></div>
          <div><dt>Alcance</dt><dd>{review!.range_m} metros</dd></div>
          <div><dt>Duração</dt><dd>{duration} turno(s)</dd></div>
          <div><dt>Custo</dt><dd>{stats?.cost} de energia</dd></div>
        </dl>
        <h4>Limitações que a magia impôs a si mesma</h4>
        <ul className="list-disc pl-5">{String(review!.limitations).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
          .map((line,index) => <li key={index}>{line.replace(/^[-•]\s+/, "")}</li>)}</ul>
      </div>}
      {!official && stats && <p className="muted">Valores propostos, sujeitos à aprovação do mestre.</p>}
      {!immersive && stats?.effect && <div className="spell-block"><h4>{official ? "Efeito registrado" : "Efeito proposto"}</h4><p className="verbatim">{stats.effect}</p></div>}
      {!immersive && stats?.limitations && <div className="spell-block"><h4>Condições e limitações</h4><p className="verbatim">{stats.limitations}</p></div>}
      <div className="spell-block"><h4>Fórmula poética</h4>
      <blockquote>{spell.formula}</blockquote>
      <p className="verbatim"><b>Intenção:</b> {spell.intention}</p>
      {spell.item_id && <p>Canalizador: {items.find(i => i.id === spell.item_id)?.name}</p>}
      </div>
      {spell.feedback && <p className="notice verbatim"><b>Retorno do mestre:</b> {spell.feedback}</p>}
      {spell.status === "rejected" && review?.decision === "rejected" && review.consequence &&
        <div className="spell-block"><h4>Consequência da recusa</h4><p className="verbatim">{review.consequence}</p></div>}
      {spell.status === "approved" && review && <div className="approved">
        {!immersive && <p>{tierName} · Alcance de {review.range_m} m</p>}
        {!available && <p className="notice">Indisponível para execução com os limites ou vínculos atuais.</p>}
        <details><summary>Solicitar revisão ou maestria</summary>
          <details><summary>Nova revisão</summary><SpellForm character={character} items={eligibleItems} spell={{...spell,id:undefined}} parent={spell.id} kind="revision"/></details>
          <details><summary>Fórmula abreviada</summary><p>Proponha menos versos para o mesmo efeito. A autorização é do mestre.</p>
            <SpellForm character={character} items={eligibleItems} spell={{...spell,id:undefined,formula:""}} parent={spell.id} kind="mastery"/></details>
        </details>
      </div>}
      {spell.status === "changes" && <details><summary>Ajustar e reenviar</summary>
        <SpellForm character={character} items={eligibleItems} spell={spell} kind={spell.kind}/>
      </details>}
      {master && spell.status === "analysis" && <Cmd name="manual" values={{id:spell.id}} submit="Abrir revisão manual"/>}
      {master && ai && <details open={spell.status === "review"}><summary>Análise da Força Mágica · {ai.model}</summary>
        {analysis ? <div className="report">
          <p className="verbatim"><b>Intenção captada:</b> {analysis.intencao}</p>
          <p className="verbatim"><b>Fenômeno gerado:</b> {analysis.fenomeno}</p>
          <h4>Proposta de magia</h4>
          <ul className="list-disc pl-5">
            <li><b>Nome:</b> {analysis.nome}</li>
            <li><b>Efeito:</b> {analysis.efeito}</li>
            <li><b>Tier sugerido:</b> {tiers.find(t => t.id === analysis.tier_id)?.name ?? "Tier indisponível"}</li>
            <li><b>Alcance:</b> {analysis.alcance} metros</li>
            <li><b>Duração:</b> {analysis.duracao} turno(s)</li>
            <li><b>Custo:</b> {analysis.custo} de energia</li>
          </ul>
          <h4>Limitações naturais</h4>
          <ul className="list-disc pl-5">{analysis.limitacoes.map((line:string,index:number) => <li key={index}>{line}</li>)}</ul>
          <h4>Riscos e possíveis abusos</h4>
          <ul className="list-disc pl-5">{analysis.riscos.map((line:string,index:number) => <li key={index}>{line}</li>)}</ul>
          <p className="verbatim"><b>Observação pro mestre:</b> {analysis.observacao}</p>
        </div> : <div className="report"><p><b>Tier sugerido:</b> {tiers.find(t => t.id === ai.result.tier_id)?.name ?? "Tier indisponível"}</p>
          {Object.entries(reportFields).map(([key,label]) => <p className="verbatim" key={key}><b>{label}:</b> {ai.result[key]}</p>)}</div>
        }
      </details>}
      {master && spell.status === "review" && review && <>
        {!ai && <p className="muted">Revisão manual. Nenhuma análise de IA disponível.</p>}
        {cap && <p>Limite do personagem: {cap.name} · {cap.max_range} m · {cap.max_duration} turnos · {cap.max_cost} Mana</p>}
        {eligibleTiers.length > 0 && <details open><summary>Limites narrativos dos tiers elegíveis</summary>
          {eligibleTiers.map(tier => <p className="verbatim" key={tier.id}><b>{tier.name}:</b> {tier.limits} · {tier.max_range} m · {tier.max_duration} turnos · {tier.max_cost} Mana</p>)}</details>}
        <Cmd name="review" values={{id:spell.id,review_id:review.id}} submit="Registrar decisão">
          <Select name="decision" label="Decisão do mestre" blank="Selecione" options={[
            {id:"approved",name:"Aprovar e registrar efeito"},{id:"changes",name:"Solicitar alterações"},{id:"rejected",name:"Rejeitar"}]}/>
          {spell.kind === "mastery" ? <p>Verifique se os versos abreviados preservam a intenção e o fenômeno. O efeito, o tier e os custos são herdados da fórmula aprovada.</p> : <>
            <Field name="effect" label="Efeito final (preencha para aprovar)" max={4000} area value={analysis?.efeito ?? ai?.result.fenomeno ?? stats?.effect}/>
            <Field name="limitations" label="Limitações públicas (uma por linha)" max={4000} area value={analysis?.limitacoes.join("\n") ?? ai?.result.limitacoes ?? stats?.limitations}/>
            <div className="fields">
              <Select name="tier" label="Tier final" options={eligibleTiers} blank="Selecione para aprovar" value={analysis?.tier_id ?? ai?.result.tier_id}/>
              <Field name="range" label="Alcance (m)" type="number" min={0} value={analysis?.alcance ?? ai?.result.alcance}/>
              <Field name="duration" label="Duração (turnos)" type="number" min={0} value={analysis?.duracao ?? ai?.result.duracao ?? duration}/>
              <Field name="cost" label="Custo em Mana" type="number" min={0} value={analysis?.custo ?? ai?.result.custo ?? stats?.cost}/>
              <Field name="cooldown" label="Recarga final" max={160} value={stats?.cooldown}/>
              <Field name="damage" label="Dano final" max={160} value={stats?.damage}/>
            </div>
            <h4>Versão imersiva para o jogador</h4>
            <Field name="immersive_name" label="Nome da magia" value={analysis?.nome ?? spell.name}/>
            <Field name="manifestation" label="Manifestação (1 a 3 frases)" max={4000} area value={draft?.manifestacao}/>
            <Field name="immersive_description" label="Descrição sensorial do efeito final" max={4000} area value={draft?.descricao}/>
            </>}
          <Field name="feedback" label="Retorno ao jogador (explique ajustes, revisão ou rejeição)" max={4000} area/>
          <RejectionConsequence key={review.id} spellId={spell.id} reviewId={review.id}/>
        </Cmd>
      </>}
    </article>;
    return {id:spell.id,name,category,image:spell.image_url,cost:stats?.cost,official,badge:<Status state={spell.status}/>,detail};
  }

  return <GrimoireIndex entries={spells.map(renderSpell)} composer={<>
    <p>Escreva pelo menos {minVerses} versos, um por linha, e descreva a intenção do encantamento.</p>
    {analysisEnabled && <p>Ao enviar, a IA analisa a proposta para o mestre.</p>}
    <SpellForm character={character} items={eligibleItems}/>
  </>}/>;
}
