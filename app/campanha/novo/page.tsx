import { Heading, Panel } from "@/components/ui";
import { BasicForm } from "@/components/sheet";

export default function NewCharacter() {
  return <><Heading label="NOVA FICHA" title="Crie seu personagem"><p>Identidade, origens e história podem ser atualizadas durante a campanha.</p></Heading>
    <Panel title="Identidade do personagem"><BasicForm/></Panel></>;
}
