"use client";
export default function ErrorPage({ reset }: {reset:()=>void}) {
  return <main className="workspace"><h1>O arquivo está indisponível</h1><p>Confira a conexão e tente novamente.</p>
    <button className="button" onClick={reset}>Tentar novamente</button></main>;
}
