import { redirect } from "next/navigation";
import { campaignCharacters } from "@/lib/campaign-characters";

export default async function CampaignHome() {
  const [character] = await campaignCharacters();
  redirect(character ? "/campanha/personagem/" + character.id : "/campanha/novo");
}
