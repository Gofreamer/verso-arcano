"use client";

import { startTransition, useActionState, useRef, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import type { FormState } from "@/lib/actions";

export function Form({ action, children, submit, inline = false, clear = false }: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  children?: ReactNode; submit: string; inline?: boolean; clear?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(async (previous: FormState, data: FormData) => {
    const next = await action(previous, data);
    if (next?.ok && clear) form.current?.reset();
    return next;
  }, null);
  return <form method="post" ref={form} className={inline ? "inline-form" : "editor"} onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }}>
    <fieldset disabled={pending}>{children}
      <button className="button" type="submit">{pending && <LoaderCircle size={16} className="spin" />}
        {pending ? "Processando…" : submit}</button>
    </fieldset>
    {!pending && state && <p className={state.ok ? "notice success" : "notice error"} role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </form>;
}
