import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { configured } from "@/lib/firebase/config";
import { authenticate } from "@/lib/actions";
import { Brand, Field } from "@/components/ui";
import { Form } from "@/components/form";

export default async function Home({ searchParams }: {searchParams: Promise<{modo?:string;confirmacao?:string}>}) {
  if (await currentUser()) redirect("/campanha");
  const query = await searchParams;
  const register = query.modo === "cadastro";
  return <div className="landing">
    <header className="campaign-header"><Brand/><nav aria-label="Portal"><Link href="/regras">Regras públicas</Link></nav></header>
    <main className="hero">
      <div className="hero-copy">
        <div className="eyebrow">Arquivo da campanha</div>
        <h1>Verso Arcano</h1>
        <p>Seu personagem, seus juramentos e seu grimório em um só lugar.</p>
      </div>
      <section className="access panel">
        <h2>{register ? "Criar conta" : "Entrar na campanha"}</h2>
        {!configured() && <p className="notice">Para ativar o portal, configure o Firebase seguindo o README.</p>}
        {query.confirmacao === "ok" && <p className="notice success" role="status">E-mail confirmado. Você já pode entrar.</p>}
        {query.confirmacao === "invalida" && <p className="notice error" role="alert">Link de confirmação inválido ou expirado.</p>}
        <Form action={authenticate.bind(null,register ? "register" : "login")} submit={register ? "Criar conta" : "Entrar na campanha"}>
          <Field name="email" label="E-mail" type="email" max={254} required/>
          <Field name="password" label="Senha" type="password" max={72} required/>
        </Form>
        <div className="switch">{register ? "Já tem uma conta?" : "Primeira vez na campanha?"} <Link href={register ? "/" : "/?modo=cadastro"}>{register ? "Entrar" : "Criar conta"}</Link></div>
      </section>
    </main>
  </div>;
}
