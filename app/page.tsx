import Link from "next/link";
import { ArrowUpRight, BookOpen, Feather, Shield, Sparkles } from "lucide-react";
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
    <header className="site-header"><Brand/><Link className="header-link" href="/regras">Regras públicas <ArrowUpRight size={15}/></Link></header>
    <main className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15}/> O ARQUIVO DA CAMPANHA</div>
        <h1>Toda magia<br/>começa em <em>verso.</em></h1>
        <p>Crie seu personagem, registre o juramento e componha as fórmulas que vão marcar sua história.</p>
        <div className="hero-features"><span><Feather/> Fórmulas autorais</span><span><Shield/> Ritos e vínculos</span><span><BookOpen/> Grimório pessoal</span></div>
      </div>
      <section className="access panel">
        <span className="access-mark"><BookOpen size={27}/></span>
        <div className="eyebrow">PORTAL DA CAMPANHA</div>
        <h2>{register ? "Inscreva-se no arquivo" : "Abra seu grimório"}</h2>
        <p>{register ? "Cadastre-se para criar sua primeira ficha." : "Entre para continuar a jornada do seu personagem."}</p>
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
    <footer className="site-footer"><span>VERSO ARCANO</span><span>ARQUIVO DA CAMPANHA</span></footer>
  </div>;
}
