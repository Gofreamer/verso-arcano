"use client";

import { useState } from "react";
import { previewConsequence } from "@/lib/actions";

export function RejectionConsequence({spellId,reviewId}: {spellId:string;reviewId:string}) {
  const [direction,setDirection]=useState("");
  const [consequence,setConsequence]=useState("");
  const [error,setError]=useState("");
  const [pending,setPending]=useState(false);

  async function generate() {
    setPending(true);
    setError("");
    try {
      const result=await previewConsequence(spellId,reviewId,direction);
      if (result.text) setConsequence(result.text);
      else setError(result.error ?? "Não foi possível gerar a prévia.");
    } catch {
      setError("Não foi possível gerar a prévia.");
    } finally {
      setPending(false);
    }
  }

  return <details>
    <summary>Consequência da recusa (opcional)</summary>
    <label>O que deve acontecer?
      <textarea rows={3} maxLength={2000} value={direction} onChange={event=>setDirection(event.target.value)}/>
    </label>
    <button type="button" className="button" disabled={pending || !direction.trim()} onClick={generate}>
      {pending ? "Gerando prévia…" : "Gerar prévia com a IA"}
    </button>
    {error && <p role="alert">{error}</p>}
    <label>Texto final para o jogador
      <textarea name="consequence" rows={4} maxLength={4000} value={consequence} onChange={event=>setConsequence(event.target.value)}/>
    </label>
    <p>Revise o texto antes de registrar a rejeição. Deixe o campo final vazio para recusar sem consequência.</p>
  </details>;
}
