import type { ReactNode } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { command } from "@/lib/actions";
import { Form } from "./form";

export function Brand() {
  return <Link className="brand" href="/" aria-label="Verso Arcano, início">
    <span className="brand-icon"><Sparkles size={20}/></span><span>Verso <strong>Arcano</strong><small>CRÔNICAS DO GRIMÓRIO</small></span>
  </Link>;
}

export function Heading({ label, title, children }: {label: string; title: string; children?: ReactNode}) {
  return <header className="page-heading"><div className="eyebrow">{label}</div><h1>{title}</h1>{children}</header>;
}

export function Panel({ title, children, id }: {title: string; children: ReactNode; id?: string}) {
  return <section className="panel" id={id}><h2>{title}</h2>{children}</section>;
}

export function Empty({ children }: {children: ReactNode}) {
  return <div className="empty"><BookOpen size={23}/><p>{children}</p></div>;
}

export function Cmd({ name, submit, values = {}, children }: {
  name: string; submit: string; values?: Record<string,string>; children?: ReactNode;
}) {
  return <Form action={command.bind(null,name)} submit={submit} inline={!children} clear={!values.id && ["spell_save","oath","tier","item","lore","attribute_def"].includes(name)}>
    {Object.entries(values).map(([key,val]) => <input type="hidden" name={key} value={val} key={key}/>)}
    {children}
  </Form>;
}

export function Field({ name, label, value, max = 120, min, required, type = "text", area = false }: {
  name: string; label: string; value?: string | number | null; max?: number; min?: number;
  required?: boolean; type?: string; area?: boolean;
}) {
  return <label>{label}{area
    ? <textarea name={name} defaultValue={value ?? ""} maxLength={max} required={required} rows={4}/>
    : <input name={name} type={type} defaultValue={value ?? ""} maxLength={max} min={min} required={required}/>}</label>;
}

export function Select({ name, label, value, options, blank }: {
  name: string; label: string; value?: string | null; options: { id: string; name: string }[]; blank?: string;
}) {
  return <label>{label}<select name={name} defaultValue={value ?? (blank === undefined ? options[0]?.id : "")} required={blank === undefined}>
    {blank !== undefined && <option value="">{blank}</option>}
    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select></label>;
}

export const statuses: Record<string,string> = {
  draft:"Rascunho", analysis:"Aguardando análise", review:"Aguardando aprovação", changes:"Alterações solicitadas",
  approved:"Aprovado", rejected:"Rejeitado", pending:"Pendente", confirmed:"Confirmado", declined:"Não confirmado",
  active:"Ativo", destroyed:"Destruído", replaced:"Substituído",
};

export function Status({ state }: {state: string}) {
  return <span className={"badge badge-" + state}>{statuses[state] ?? state}</span>;
}

export function localDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {timeZone:"America/Bahia",dateStyle:"medium"}).format(
    new Date(value.length === 10 ? value + "T12:00:00Z" : value));
}
