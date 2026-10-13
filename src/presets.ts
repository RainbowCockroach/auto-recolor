// Ready-made palettes, mostly from the Sims 4 recolor community, offered in the preset library.
// Community palettes are free to use with credit, so each one names its creator and source,
// and the library shows that credit next to it.

export type PresetUse = 'hair' | 'furniture' | 'skin';

export interface Preset {
  id: string;
  /** Used as the palette name, and so in file names. */
  name: string;
  title: string;
  uses: PresetUse[];
  description: string;
  credit: { by: string; url: string };
  colors: [name: string, hex: string][];
}

export const PRESETS: Preset[] = [
  {
    id: 'ea-hair',
    name: 'ea',
    title: 'EA hair colors',
    uses: ['hair'],
    description: 'The 24 hair swatches in The Sims 4 (18 original + 6 added in 2021). The base most recolors match against.',
    credit: { by: 'Electronic Arts / Maxis; hex values compiled by the Sims 4 Studio community', url: 'https://sims4studio.com/thread/14734/linking-maxis-hair-swatches' },
    colors: [
      ['neutral black', '#0e0e10'], ['black', '#111111'], ['dark brown', '#3a251d'], ['warm brown', '#3d2a24'],
      ['brown', '#604733'], ['light brown', '#6f5544'], ['red', '#ac3832'], ['auburn', '#ac5333'],
      ['orange', '#c8762e'], ['neutral blonde', '#a18056'], ['light blonde', '#baa17f'], ['blonde', '#d1b350'],
      ['dirty blonde', '#d5a96c'], ['platinum', '#fff2c8'], ['white', '#e3e4e4'], ['white blonde', '#c5c0ba'],
      ['gray', '#abaeb6'], ['purple pastel', '#ca9dca'], ['hot pink', '#eb5fae'], ['dark blue', '#2742b0'],
      ['turquoise', '#32d4b9'], ['green', '#21bb3b'], ['brown salt and pepper', '#78644b'], ['black salt and pepper', '#525252'],
    ],
  },
  {
    id: 'pooklet',
    name: 'pooklet',
    title: 'Pooklet',
    uses: ['hair'],
    description: 'The long-standing community standard for hair recolors ("Pooklet’d"): 45 colors with a wide natural range plus brights.',
    credit: { by: 'Pooklet; chart by pixelswirl (Swirlgoodies)', url: 'https://swirlgoodies.tumblr.com/post/133356161116/pooklet-overhaul-color-chart-requested-by-the' },
    colors: [
      ['flash powder', '#121314'], ['dynamite', '#14110f'], ['land mine', '#1d1611'], ['shrapnel', '#23150d'],
      ['depth charge', '#1d0c05'], ['fission', '#4e3b2d'], ['safety fuse', '#674427'], ['brisance', '#6e3c26'],
      ['explosive', '#632103'], ['molotov', '#8c300d'], ['pyrotechnic', '#924b14'], ['comburent', '#b87c35'],
      ['incendiary', '#aa875e'], ['volatile', '#bb9c88'], ['primer', '#b3a396'], ['grenade', '#938374'],
      ['time bomb', '#e1dcd8'],
      // the source chart has a typo here ("#eo8754"); the letter o is read as a zero
      ['firework', '#e08754'],
      ['flammable', '#cc0004'], ['tnt', '#690213'], ['tetryl', '#b00d44'], ['unstable', '#cd179c'],
      ['pentolite', '#e24a75'], ['powder cake', '#e683ac'], ['afterburner', '#cc6ee0'], ['fluorophore', '#a078f0'],
      ['detonator', '#30054f'], ['blasting agent', '#502dbe'], ['hmx', '#5662f4'], ['napalm', '#007ff7'],
      ['cannonball', '#2945c8'], ['hazardous', '#141368'], ['shockwave', '#009997'], ['hydrazine', '#33b5e5'],
      ['pyrodex', '#5ccdae'], ['hangfire', '#25bc64'], ['fulminant', '#013220'], ['semtex', '#03bf52'],
      ['nitroglycerin', '#8acf17'], ['torpedo', '#cbcb4d'], ['nuclear', '#deb601'], ['mail bomb', '#91908c'],
      ['pipe bomb', '#5b5a57'], ['black salt and pepper', '#525252'], ['brown salt and pepper', '#78644b'],
    ],
  },
  {
    id: 'sorbets-remix',
    name: 'sorbets',
    title: 'Sorbets Remix',
    uses: ['hair'],
    description: 'Hugely popular fashion palette: 19 color families in 4 shades each, from pastel to dark (76 colors).',
    credit: { by: 'Noodles (tai / noodlescc)', url: 'https://noodlescc.tumblr.com/post/636884414311415808/a-navigation-post-for-all-things-sorbets-remix' },
    colors: [
      ['tutti frutti', '#ff9591'], ['strawberry', '#f75653'], ['rose', '#c92c2a'], ['pomegranate', '#862523'],
      ['himalayan salt', '#ffa386'], ['salmon', '#ff7f53'], ['grapefruit', '#d95e38'], ['irish coffee', '#98391b'],
      ['orange cream', '#ffaf6c'], ['mango', '#ff872c'], ['persimmon', '#d8660f'], ['curry', '#913f02'],
      ['lucuma', '#ffc76c'], ['honey', '#ffaa2c'], ['cinnamon', '#d88100'], ['toffee', '#915702'],
      ['banana', '#ffde8f'], ['starfruit', '#ffcd56'], ['pineapple', '#e5a61d'], ['goldleaf', '#bd850c'],
      ['honeydew', '#c2e87a'], ['kiwi', '#9de125'], ['matcha', '#77ac1e'], ['avocado', '#587d1b'],
      ['pistachio', '#a3e891'], ['green apple', '#48ce33'], ['aloe', '#34a722'], ['guanabana', '#227616'],
      ['spearmint', '#91e8ac'], ['grasshopper', '#4adc8d'], ['minty orchid', '#2bae66'], ['nori', '#24784a'],
      ['ramune', '#97e8ca'], ['pacific cooler', '#4adfab'], ['island cocktail', '#37ae82'], ['mermaid water', '#217c61'],
      ['winter mint', '#a2f1e5'], ['blue moon', '#5bdfd5'], ['love in mist', '#30bbb1'], ['ocean breeze', '#1d8680'],
      ['cotton candy', '#99daff'], ['blue quandong', '#41b6ff'], ['midnight kiss', '#2f8fcd'], ['indigo milk cap', '#1a5c87'],
      ['star flower', '#8eb9ff'], ['corn flower', '#4382f7'], ['acai', '#3064c1'], ['blueberry', '#1d4286'],
      ['periwinkle', '#babaff'], ['bell flower', '#7272f3'], ['lupine', '#4949ab'], ['blackberry', '#343476'],
      ['lavender', '#ceadff'], ['grape', '#955fe5'], ['fig', '#653e9d'], ['raisin', '#45276f'],
      ['lilac', '#e8abf2'], ['sweet potato', '#d76ae6'], ['eggplant', '#a148ac'], ['plum', '#692e70'],
      ['taffy', '#ffaad7'], ['dragon fruit', '#f36ab0'], ['ube', '#c44988'], ['mangosteen', '#85315c'],
      ['bubble gum', '#ffacb9'], ['watermelon', '#fe698d'], ['lychee', '#c94667'], ['rosella', '#8a2f45'],
      ['peach puff', '#ffccab'], ['butterscotch', '#f2a97c'], ['fudge', '#d4845a'], ['chocolate', '#ae5d38'],
      ['coconut', '#f6f6f6'], ['sesame', '#c3c6c9'], ['liquorice', '#899096'], ['squid ink', '#5b6063'],
    ],
  },
  {
    id: 'sandwich-naturals',
    name: 'sandwich-naturals',
    title: 'Sandwich Naturals',
    uses: ['hair'],
    description: 'Natural hair shades: blondes, browns, reds and soft blacks (20 colors).',
    credit: { by: 'WildlyMiniatureSandwich', url: 'https://wildlyminiaturesandwich.tumblr.com/post/151507592844/so-here-they-finally-are-all-the-sandwich-colours' },
    colors: [
      ['secret ice cream', '#f0edd3'], ['cake heart', '#c29372'], ['popsicle whispers', '#d68e6f'], ['midnight intrigue', '#1c1c1c'],
      ['velvet angel', '#f7ebbb'], ['decaf sparrow', '#966c4f'], ['amber tango', '#bf5234'], ['hypnotic gypsy', '#181a2b'],
      ['honey dumpling', '#f4e095'], ['haunted toffee', '#70452f'], ['tabasco mirage', '#8e2e18'], ['intese abyss', '#231715'], // creator's spelling
      ['spiced sugar', '#dbb988'], ['melted elegance', '#53372b'], ['rusted temptress', '#5c1500'], ['wayward magic', '#1a1a10'],
      ['pancake treasure', '#d1ae66'], ['poetic feather', '#331d11'], ['satin attitude', '#380900'], ['majestic dahlia', '#190f1a'],
    ],
  },
  {
    id: 'sandwich-unnaturals',
    name: 'sandwich-unnaturals',
    title: 'Sandwich Unnaturals',
    uses: ['hair', 'furniture'],
    description: 'Bright fantasy colors from pastel to deep, for hair and for bold furniture accents (35 colors).',
    credit: { by: 'WildlyMiniatureSandwich', url: 'https://wildlyminiaturesandwich.tumblr.com/post/151507592844/so-here-they-finally-are-all-the-sandwich-colours' },
    colors: [
      ['bright puff', '#fff79c'], ['pixie whisper', '#c6e3c4'], ['charming frost', '#b6efdd'], ['quiet sprite', '#acedfb'],
      ['lilac nebula', '#dbc5ec'], ['sweet cherub', '#ffc7d5'], ['sugar cloud', '#fccfa4'],
      ['cheesy sunshine', '#fef200'], ['fizzy fresh', '#ade222'], ['island wisp', '#93ede1'], ['fair haven', '#4ad1e5'],
      ['vintage grape', '#9577b5'], ['lipstick punch', '#ff708a'], ['solar storm', '#ffa057'],
      ['rubber duckie', '#ffde00'], ['lucky charm', '#61ad37'], ['mystic topaz', '#61ddcb'], ['magical merlin', '#008ece'],
      ['sorceror spell', '#a13ca3'], ['raspberry pirate', '#ff386d'], ['tangy tricks', '#f05218'],
      ['bright side', '#ffb400'], ['sheepish lizard', '#02783d'], ['origami dragon', '#34b59f'], ['suddenly sapphire', '#004285'],
      ['quirky petal', '#741a75'], ['hearts fire', '#b80037'], ['bold gumball', '#c7100a'],
      ['fireside glimmer', '#f88500'], ['empress witch', '#004539'], ['stormy riches', '#155454'], ['midnight magic', '#101f47'],
      ['perfectly royal', '#450541'], ['licorice wine', '#7e0339'], ['foxy teaberry', '#7a0014'],
    ],
  },
  {
    id: 'sandwich-neutrals',
    name: 'sandwich-neutrals',
    title: 'Sandwich Neutrals',
    uses: ['furniture'],
    description: 'Greys, sages, sands and terracottas: calm upholstery and finish colors (20 colors).',
    credit: { by: 'WildlyMiniatureSandwich', url: 'https://wildlyminiaturesandwich.tumblr.com/post/151507592844/so-here-they-finally-are-all-the-sandwich-colours' },
    colors: [
      ['viking dove', '#f0f0f0'], ['misty brocade', '#d5d6c8'], ['fuzzy fume', '#f2e9e0'], ['rather peach', '#efd0c2'],
      ['forged lullaby', '#c6c8c7'], ['dancing sage', '#b7b697'], ['tattered puppet', '#dac9af'], ['muted cashew', '#db9f83'],
      ['private smoke', '#8c908f'], ['hidden wilds', '#7d7c5e'], ['muddy owl', '#b08864'], ['biscuit wheel', '#bd6b44'],
      ['ghost ink', '#494949'], ['wordless skies', '#525037'], ['dusty tart', '#7b5c3f'], ['southern marble', '#873e1c'],
      ['somber chasm', '#2d2d2d'], ['stormy cabbage', '#363320'], ['timber castle', '#402e24'], ['comfy hearth', '#471500'],
    ],
  },
  {
    id: 'lunedsims-tea',
    name: 'tea',
    title: 'TEA woods',
    uses: ['furniture'],
    description: 'Wood and neutral finishes, tested in game so they don’t turn murky or washed out (18 colors).',
    credit: { by: 'lunedsims', url: 'https://lunedsims.tumblr.com/post/162253820126/tea-a-colour-palette-for-woods' },
    colors: [
      ['russian caravan', '#253337'], ['silver needle', '#dddfcf'], ['lapsang souchong', '#29323e'], ['earl grey', '#969696'],
      ['chamomile', '#e8d4b2'], ['pu erh', '#40322b'], ['english breakfast', '#453f3a'], ['ginger', '#b39173'],
      ['oolong', '#f4f1e5'], ['ceylon', '#574545'], ['darjeeling', '#b4a693'], ['white', '#d9dadb'],
      ['chai', '#cbb3a5'], ['sakura', '#eed6ca'], ['sencha', '#c6c3c1'], ['kenyan', '#504d4f'],
      ['scottish breakfast', '#303030'], ['assam', '#222222'],
    ],
  },
  {
    id: 'cyansimblr-chalk-pastels',
    name: 'chalk-pastels',
    title: 'Chalk Pastels',
    uses: ['furniture'],
    description: 'Soft pastels with a few deeper accents, inspired by a set of chalks (32 colors).',
    credit: { by: 'cyansimblr', url: 'https://maxismatchccworld.tumblr.com/post/639475159431020544/cyansimblr-an-improved-pastels-palette-with' },
    // the palette file has no color names, so they're numbered in the creator's order
    colors: [
      '#d5eed9', '#e3a8be', '#ba6db5', '#b2c0cb', '#92d3b3', '#d5dea5', '#b98578', '#f09ca9',
      '#f5c5d1', '#c73a6e', '#e8648c', '#cfb1a6', '#3acdfb', '#ecf0be', '#f59faf', '#e26a56',
      '#f4c77d', '#fcf7c8', '#e2faed', '#4fbcc6', '#93ca9b', '#edb765', '#83c7a2', '#bca78c',
      '#ddd1bf', '#fd9469', '#f6c2ac', '#d17c75', '#9599c5', '#e7a5a6', '#f3d686', '#ff778b',
    ].map((hex, i): [string, string] => [`chalk ${String(i + 1).padStart(2, '0')}`, hex]),
  },
  {
    id: 'monk-skin-tone',
    name: 'monk',
    title: 'Monk Skin Tone scale',
    uses: ['skin'],
    description: 'Ten skin tones from lightest to deepest, made to cover the full range of human skin (CC BY 4.0).',
    credit: { by: 'Dr. Ellis Monk / Google (CC BY 4.0)', url: 'https://skintone.google/get-started' },
    colors: [
      '#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96',
      '#a07e56', '#825c43', '#604134', '#3a312a', '#292420',
    ].map((hex, i): [string, string] => [`mst ${String(i + 1).padStart(2, '0')}`, hex]),
  },
];
