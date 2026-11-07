export type Divinity = {
  id:string; name:string; title:string; domains:string; color:string; summary:string;
  personality:string; manifestations:string; teachings:string; taboos:string; myth_title:string; myth:string;
  published:boolean;
};

export const pantheon:Divinity[] = [
  {
    id:"baldoro",name:"Baldoro",title:"O Senhor da Guerra",domains:"Guerra",color:"war",
    summary:"Orgulhoso, beberrão e de riso fácil, recebe as vitórias como um veterano que acaba de voltar do campo de batalha.",
    personality:"Baldoro tem a confiança de um soldado que venceu a guerra e voltou para beber com os companheiros. Gosta de ouvir relatos de combate e não esconde o orgulho das próprias conquistas. A celebração faz parte de seu temperamento tanto quanto a disposição para lutar.",
    manifestations:"Quando responde pela esfera, sua voz é firme e franca, frequentemente acompanhada de uma gargalhada. Prefere perguntas diretas e relatos sem enfeites. Seus devotos reconhecem nele a presença de um veterano à mesa.",
    teachings:"Enfrente com coragem os conflitos que escolheu.\nHonre os companheiros que lutaram ao seu lado.\nCelebre a vitória e reconheça quem tornou possível conquistá-la.",
    taboos:"Abandonar companheiros para salvar a própria reputação.\nTomar para si a vitória de outro guerreiro.\nPrometer um combate que nunca pretende enfrentar.",
    myth_title:"A Última Caneca",
    myth:"Um comandante voltou da guerra com a vitória e poucos dos soldados que haviam partido. No banquete, ergueu a caneca diante da esfera de Baldoro e brindou ao próprio nome.\n\nA gargalhada do deus interrompeu os músicos.\n\n— E quem segurou a passagem?\n\nO comandante respondeu.\n\n— Encha uma caneca para ele. E quem carregou os feridos?\n\nVieram outras perguntas. A retaguarda. Os batedores. O soldado que morrera mantendo um portão aberto. Para cada nome, uma caneca foi posta à mesa.\n\nQuando o comandante terminou, já não havia lugar para a sua.\n\nEm alguns cultos de Baldoro, a primeira rodada ainda é servida aos ausentes. Quem conta a história bebe por último.",published:true,
  },
  {
    id:"zeus",name:"Zeus",title:"O Senhor dos Céus",domains:"Céus, trovões e soberania",color:"sky",
    summary:"Sua autoridade atravessa os céus. Governantes e juramentados procuram sua esfera para pedir justiça, proteção ou testemunho.",
    personality:"Zeus fala com a segurança de quem está acostumado a ser obedecido. É solene, autoritário e atento ao peso de um juramento. A soberania, em seu culto, traz deveres para quem governa e consequências para quem usa a autoridade em proveito da mentira.",
    manifestations:"Sua voz pela esfera impõe silêncio ao templo. Seus fiéis associam o trovão à sua presença, embora nem toda tempestade seja recebida como uma mensagem. Manifestações fora da esfera são raras.",
    teachings:"Exerça a autoridade com firmeza e responsabilidade.\nCumpra os juramentos feitos em nome dos deuses.\nRespeite os deveres da hospitalidade.",
    taboos:"Romper deliberadamente um juramento sagrado.\nTrair alguém recebido sob sua proteção.\nInvocar a autoridade divina para sustentar uma mentira.",
    myth_title:"O Juramento Sob Céu Limpo",
    myth:"Dois governantes encerraram uma disputa diante da esfera de Zeus. As testemunhas ainda estavam no templo quando um deles enviou homens para ocupar as terras que acabara de prometer ao vizinho.\n\nOs soldados chegaram à fronteira sob um céu limpo. O primeiro trovão deteve os cavalos. O segundo derrubou os estandartes. Um raio atingiu a estrada diante da tropa, deixando uma fenda de pedra fumegante. Os homens voltaram sem atravessá-la.\n\nNa manhã seguinte, a esfera do templo falou:\n\n— Quem deu a ordem virá responder por ela.\n\nO governante compareceu sozinho. Ninguém registrou a conversa. Os relatos concordam apenas que, enquanto viveu, ele cumpriu cada cláusula do tratado.",published:true,
  },
  {
    id:"afrodite",name:"Afrodite",title:"A Senhora do Amor e da Beleza",domains:"Amor, beleza e desejo",color:"rose",
    summary:"Invocada nos encontros, nas paixões e nas obras de beleza, conhece o cuidado e a vulnerabilidade de quem deseja ser amado.",
    personality:"Afrodite tem uma voz envolvente e demonstra interesse pelos sentimentos e desejos dos mortais. Seu culto reúne amantes, artistas e pessoas em busca de afeto. Os mitos dedicados a ela tratam dos encontros felizes, das paixões difíceis e do cuidado necessário para sustentar um vínculo.",
    manifestations:"As respostas pela esfera costumam se dirigir ao que a pessoa sente, inclusive quando sua pergunta tenta contornar o assunto. Seus devotos a procuram tanto para falar de amor quanto para dedicar uma obra ou um gesto de beleza.",
    teachings:"Reconheça seus sentimentos e desejos.\nCultive a beleza nas pessoas, nas obras e nos encontros.\nCuide dos vínculos que deseja conservar.",
    taboos:"Profanar uma oferenda feita por amor.\nHumilhar alguém por sua aparência.\nUsar seu culto para ridicularizar os sentimentos alheios.",
    myth_title:"O Retrato Inacabado",
    myth:"Uma artista recebeu a encomenda de um retrato para a celebração de Afrodite. Pintou sua companheira e passou meses corrigindo a obra: apagou a cicatriz no queixo, desfez as marcas de cansaço, mudou a curva do sorriso. Na véspera da festa, rasgou a tela.\n\nNo templo, contou à esfera que havia fracassado. Afrodite perguntou:\n\n— Quem você estava tentando pintar?\n\nA artista voltou para casa. Encontrou a companheira adormecida numa cadeira, esperando por ela. Pintou durante a madrugada. Dessa vez, deixou a cicatriz, os olhos cansados e o sorriso que conhecia tão bem.\n\nO quadro chegou à festa ainda úmido. Afrodite permaneceu calada até alguém perguntar se a oferenda lhe agradava.\n\n— Finalmente a reconheci.",published:true,
  },
  {
    id:"zok-toh-ke",name:"Zok'toh'ke",title:"A Voz da Terra e das Tempestades",domains:"Clima e terra",color:"earth",
    summary:"Temido por sua crueldade e procurado por seu auxílio, deixa seus fiéis entre a calamidade e a reconstrução.",
    personality:"Zok'toh'ke é áspero, impaciente e conhecido por tratar os mortais com desprezo. Ainda assim, é intensamente cultuado: depois de provocar destruição, costuma ajudar aqueles que sofreram com ela. Seus fiéis têm razões para temê-lo e razões para voltar a pedir seu favor.",
    manifestations:"Pela esfera, responde de maneira brusca e por vezes provocadora. Agricultores, viajantes e comunidades sujeitas às forças naturais recorrem a ele. Seus templos recebem pedidos de auxílio, oferendas de apaziguamento e agradecimentos pela reconstrução.",
    teachings:"Prepare-se para as mudanças da terra e do clima.\nAprenda a reconstruir depois da destruição.\nReconheça sua dependência das forças naturais.",
    taboos:"Declarar-se superior às forças da natureza.\nReceber seu auxílio e atribuí-lo publicamente a outro deus.\nProfanar sua esfera por ressentimento contra uma calamidade.",
    myth_title:"A Cidade Que Pediu Chuva",
    myth:"Após meses de seca, uma cidade reuniu suas últimas oferendas e pediu chuva a Zok'toh'ke. A tempestade chegou antes que os sacerdotes deixassem o templo.\n\nO rio saiu das margens. Os celeiros cederam. Casas desapareceram na correnteza. Quando conseguiram voltar à esfera, os sobreviventes exigiram uma resposta.\n\n— Vocês pediram chuva.\n\nDurante três dias, o templo ficou vazio. No quarto, surgiram fontes nas encostas. A cheia havia espalhado terra fértil pelos campos, e o novo curso do rio permitia irrigá-los. Nos anos seguintes, as colheitas pagaram a reconstrução.\n\nDizem que ali se fazem duas oferendas antes das chuvas: uma para pedir auxílio e outra para pedir que Zok'toh'ke tenha cuidado ao concedê-lo.",published:true,
  },
  {
    id:"lih-beh-in",name:"Lih'beh'in",title:"A Senhora dos Festejos",domains:"Festividades, prazer e luxúria",color:"revel",
    summary:"Brincalhona e provocadora, diverte-se com os desejos, o embaraço e a ousadia dos mortais.",
    personality:"Lih'beh'in é exuberante, sensual e declaradamente entregue aos prazeres. Gosta de provocar os mortais, insinuar possibilidades e observar suas reações. Festas, flertes e brincadeiras são ocasiões em que sua personalidade se manifesta com facilidade.",
    manifestations:"Sua voz pela esfera costuma trazer riso, intimidade e insinuações. Uma conversa pode se transformar numa provocação antes que o devoto perceba. Seus cultos celebram o prazer, a hospitalidade e a liberdade de desfrutar a vida.",
    teachings:"Celebre as ocasiões que tornam a vida prazerosa.\nExplore seus desejos e permita-se brincar.\nRetribua a hospitalidade de quem oferece uma boa festa.",
    taboos:"Profanar suas celebrações por desprezo ao prazer.\nOferecer uma festa em seu nome e tratar os convidados com crueldade.\nUsar seu nome para impor desejos a outra pessoa.",
    myth_title:"A Festa dos Nomes Trocados",
    myth:"Um nobre ofereceu uma festa a Lih'beh'in e mandou barrar nos portões quem não tivesse título ou fortuna. Antes do primeiro brinde, a esfera começou a rir.\n\nA deusa propôs um jogo. Cada convidado retiraria um nome de uma taça e, até o amanhecer, receberia o tratamento dado àquela pessoa. O anfitrião aceitou de imediato. Seu papel trazia o nome da mulher que lavava as taças.\n\nQuando foi procurá-la, encontrou os portões abertos. Vizinhos, trabalhadores e músicos já ocupavam o salão. A mulher estava em sua cadeira. Pediu vinho.\n\n— Capriche — disse Lih'beh'in. — Hoje eu quero ver como você serve.\n\nO nobre trabalhou até o amanhecer. Quanto ao restante da festa, os contadores da história sempre pedem mais uma bebida antes de continuar.",published:true,
  },
  {
    id:"coupe",name:"Coupe",title:"O Guardião da Paz e dos Recomeços",domains:"Paz, aceitação e fertilidade",color:"peace",
    summary:"Gentil e pacifista, concede numerosas bênçãos por compaixão aos desafortunados.",
    personality:"Coupe demonstra piedade por quem sofre e procura acolher os que foram deixados à própria sorte. É paciente, gentil e favorável à reconciliação. Suas bênçãos são frequentes entre os desafortunados, e seus devotos associam seu cuidado ao nascimento, ao cultivo e à possibilidade de recomeçar.",
    manifestations:"Sua voz pela esfera é serena e atenciosa. Diante de alguém em sofrimento, costuma se interessar pelas necessidades mais imediatas. Seus templos são procurados por quem busca amparo, paz ou forças para reconstruir a própria vida.",
    teachings:"Acolha os desafortunados.\nProcure reconciliação quando houver espaço para ela.\nCuide da vida e das condições que permitem seu florescimento.",
    taboos:"Negar auxílio pelo prazer de ver alguém sofrer.\nViolar deliberadamente um acordo de paz.\nDestruir abrigo, alimento ou cultivo para atingir pessoas indefesas.",
    myth_title:"O Campo dos Estranhos",
    myth:"Duas aldeias disputavam um campo onde nada crescia havia anos. Depois de um confronto, uma mulher encontrou ali uma criança ferida, filha de uma família rival. Levou-a para casa.\n\nOs vizinhos exigiram que a entregasse. A mulher ficou à porta e pediu que falassem baixo: a criança finalmente havia dormido.\n\nNaquela noite, a esfera de Coupe brilhou no pequeno templo da aldeia.\n\n— Ela já comeu?\n\nA mulher respondeu que restava pouco alimento. Ao amanhecer, havia brotos no campo abandonado. A terra produziu durante semanas, o bastante para alimentar as duas aldeias.\n\nA criança voltou à família acompanhada da mulher e de uma cesta da primeira colheita. Mais tarde, quando os moradores combinaram dividir o cultivo, Coupe tornou a falar:\n\n— Agora ela poderá crescer em paz.",published:true,
  },
  {
    id:"xhass",name:"Xhass",title:"O Guardião do Último Limiar",domains:"Morte",color:"death",
    summary:"Inteiramente apático, segue seu propósito. Seus raros presságios chegam sem bênção, maldição ou explicação.",
    personality:"Xhass é descrito como completamente apático. Não interfere nos assuntos mortais, não concede bênçãos e não lança maldições. Segue seu propósito sem demonstrar favor, rancor ou piedade.",
    manifestations:"Ocasionalmente, Xhass envia presságios ligados à morte. Seus seguidores procuram interpretar esses sinais, que podem admitir mais de uma leitura. A natureza exata dos presságios e sua interpretação permanecem assunto dos relatos e das tradições do culto.",
    teachings:"Preparar os mortos segundo os ritos da comunidade.\nPreservar a memória dos falecidos.\nRegistrar os presságios com cuidado, distinguindo o sinal de sua interpretação.",
    taboos:"Inventar presságios para manipular os vivos.\nPrometer bênçãos ou maldições em nome de Xhass.\nAfirmar que uma morte comprova seu favor ou sua ira.",
    myth_title:"As Sete Batidas",
    myth:"Uma guardiã de templo acordou durante sete noites com três batidas na porta. Ao abrir, encontrava a rua vazia. Na oitava noite, sonhou com a ponte da cidade e reconheceu, sobre ela, as pessoas que costumavam atravessá-la ao nascer do dia.\n\nInsistiu para que examinassem os pilares. Encontraram uma rachadura profunda e fecharam a passagem. A ponte caiu antes do amanhecer.\n\nDias depois, as batidas voltaram. Dessa vez, ela sonhou com o quarto do irmão doente. Viajou para acompanhá-lo e ficou ao seu lado até sua morte.\n\nA guardiã passou o resto da vida anotando os sinais que atribuía a Xhass. Nunca recebeu uma explicação pela esfera.\n\nEntre seus escritos, os sacerdotes conservaram uma frase:\n\n“Recebi o aviso. O significado precisei procurar.”",
    published:true,
  },
];
