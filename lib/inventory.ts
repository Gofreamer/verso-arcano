export const equipmentSlots = [
  ["head","Cabeça"], ["body","Corpo"], ["hands","Mãos"], ["legs","Pernas"], ["feet","Pés"],
  ["main","Mão principal"], ["off","Mão secundária"], ["accessory1","Acessório 1"],
  ["accessory2","Acessório 2"], ["accessory3","Acessório 3"], ["extra1","Extra 1"], ["extra2","Extra 2"],
].map(([id,name])=>({id,name}));

export const rarities = ["Comum","Incomum","Raro","Épico","Lendário","Mítico"];
export const formatWeight = (weight:number) => new Intl.NumberFormat("pt-BR",{maximumFractionDigits:3}).format(weight) + " kg";
