import "server-only";
import { cache } from "react";
import { read, session } from "./auth";

export const campaignCharacters = cache(async () => {
  const { db } = await session();
  const rows = read(await db.from("characters").select("id,name").order("updated_at", { ascending: false }));
  return rows.map(({ id, name }) => ({ id, name: String(name) }));
});
