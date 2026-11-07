export const conditionKinds = [
  {id:"blessing",name:"Bênçãos",singular:"Bênção"},
  {id:"curse",name:"Maldições",singular:"Maldição"},
  {id:"injury",name:"Lesões",singular:"Lesão"},
] as const;

export type CharacterCondition = {
  id:string; character_id:string; kind:"blessing"|"curse"|"injury"; name:string; effect:string;
  description:string; source:string; duration:string; status:"active"|"ended"; revision:number;
  created_at:string; updated_at:string;
};
