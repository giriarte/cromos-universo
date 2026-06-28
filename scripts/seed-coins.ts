/**
 * Run: npx tsx --env-file=.env.local scripts/seed-coins.ts
 *
 * What this script does:
 *  1. Creates the "Monedas del mundo" category (idempotent)
 *  2. Downloads each coin image from Wikimedia Commons into tmp/coin-images/
 *  3. Uploads each image to S3 under the key coins/<slug>.<ext>
 *  4. Inserts the article (coin) into the database with the S3 public URL
 *
 * Safe to re-run: skips coins whose slug already exists in the database.
 * Image filenames were verified against Wikimedia Commons during research.
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// ── Load .env.local manually (tsx may not propagate --env-file on all setups) ─

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ── Clients (initialised after env load) ─────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const s3 = new S3Client({
  region: process.env.APP_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.APP_S3_BUCKET!;
const REGION = process.env.APP_AWS_REGION!;
const IMAGES_DIR = path.join(process.cwd(), "tmp", "coin-images");

// ── Coin data ─────────────────────────────────────────────────────────────────

interface CoinEntry {
  title: string;
  description: string;
  country: string;
  wikiFile: string;
  denomination: string;
  price?: number;
  stock?: number;
}

const COINS: CoinEntry[] = [
  // ── ESTADOS UNIDOS ────────────────────────────────────────────────────────
  {
    title: "1 Centavo Lincoln - EE.UU.",
    description: "El centavo de Lincoln es la moneda de un centavo de dólar de los Estados Unidos, acuñada desde 1909. Presenta el retrato del presidente Abraham Lincoln diseñado por Victor D. Brenner.",
    country: "Estados Unidos",
    wikiFile: "US_One_Cent_Obv.png",
    denomination: "1 Centavo",
  },
  {
    title: "25 Centavos Washington Quarter - EE.UU.",
    description: "El Washington Quarter es la moneda de veinticinco centavos de los Estados Unidos, con el retrato de George Washington desde 1932. A partir de 1999 se emitieron versiones conmemorativas de cada estado.",
    country: "Estados Unidos",
    wikiFile: "2022_Washington_quarter_obverse.jpeg",
    denomination: "25 Centavos",
  },
  {
    title: "Dólar Morgan - EE.UU.",
    description: "El Dólar Morgan fue acuñado entre 1878 y 1921 y es una de las monedas de plata más coleccionadas del mundo. Fue diseñado por George T. Morgan y presenta la cabeza de la Libertad en el anverso.",
    country: "Estados Unidos",
    wikiFile: "1879S_Morgan_Dollar_NGC_MS67plus_Obverse.png",
    denomination: "1 Dólar",
  },
  {
    title: "Dólar de la Paz - EE.UU.",
    description: "El Peace Dollar fue acuñado entre 1921 y 1935 para conmemorar la paz tras la Primera Guerra Mundial. Diseñado por Anthony de Francisci, muestra a la Libertad con una corona radiante.",
    country: "Estados Unidos",
    wikiFile: "NNC-US-1921-1$-Peace_dollar.jpg",
    denomination: "1 Dólar",
  },
  {
    title: "Medio Dólar Walking Liberty - EE.UU.",
    description: "El Walking Liberty Half Dollar fue emitido entre 1916 y 1947, diseñado por Adolph A. Weinman. Su imagen de la Libertad caminando es considerada uno de los diseños más hermosos de la numismática americana.",
    country: "Estados Unidos",
    wikiFile: "Walking_Liberty_Half_Dollar_1945D_Obverse.png",
    denomination: "50 Centavos",
  },
  {
    title: "Níquel Buffalo - EE.UU.",
    description: "El Buffalo Nickel fue acuñado entre 1913 y 1938, diseñado por James Earle Fraser. Presenta un nativo americano en el anverso y un bisonte americano en el reverso, íconos de la historia del Oeste.",
    country: "Estados Unidos",
    wikiFile: "NNC-US-1913-5C-Buffalo_Nickel_(TyI-mound).jpg",
    denomination: "5 Centavos",
  },
  {
    title: "Dime Mercury - EE.UU.",
    description: "El Mercury Dime fue emitido entre 1916 y 1945, diseñado por Adolph Weinman. Su figura de la Libertad con casco alado fue confundida popularmente con Mercurio, el mensajero romano.",
    country: "Estados Unidos",
    wikiFile: "1943D_Mercury_Dime_obverse-cutout.png",
    denomination: "10 Centavos",
  },
  {
    title: "Double Eagle Saint-Gaudens - EE.UU.",
    description: "El Double Eagle de Saint-Gaudens es la moneda de oro de 20 dólares más bella de la historia americana, diseñada por Augustus Saint-Gaudens entre 1907 y 1933. Representa a la Libertad portando una antorcha.",
    country: "Estados Unidos",
    wikiFile: "NNC-US-1907-G$20-Saint_Gaudens_(Arabic).jpg",
    denomination: "20 Dólares",
  },
  {
    title: "Medio Dólar Franklin - EE.UU.",
    description: "El Franklin Half Dollar fue acuñado entre 1948 y 1963, presentando el retrato de Benjamin Franklin. Es muy popular entre coleccionistas por su diseño clásico y su relativamente corta historia de acuñación.",
    country: "Estados Unidos",
    wikiFile: "Franklin_Half_Dollar_1963_D_Obverse.png",
    denomination: "50 Centavos",
  },
  {
    title: "Medio Dólar Kennedy - EE.UU.",
    description: "El Kennedy Half Dollar fue emitido a partir de 1964 en honor al presidente John F. Kennedy, asesinado en 1963. Sigue siendo moneda de circulación legal en los Estados Unidos.",
    country: "Estados Unidos",
    wikiFile: "US_Half_Dollar_Obverse_2015.png",
    denomination: "50 Centavos",
  },
  {
    title: "Dólar Eisenhower - EE.UU.",
    description: "El Dólar Eisenhower fue acuñado entre 1971 y 1978 en honor al presidente Dwight D. Eisenhower. Su reverso muestra el águila del Apolo 11 aterrizando en la Luna, conmemorando el alunizaje de 1969.",
    country: "Estados Unidos",
    wikiFile: "1974S_Eisenhower_Obverse.jpg",
    denomination: "1 Dólar",
  },
  {
    title: "Dólar Sacagawea - EE.UU.",
    description: "El Dólar Sacagawea fue emitido a partir del año 2000, mostrando a la guía nativa americana Sacagawea con su hijo en brazos. Conmemora las contribuciones de los pueblos indígenas de América del Norte.",
    country: "Estados Unidos",
    wikiFile: "Sacagawea_dollar_obverse.png",
    denomination: "1 Dólar",
  },
  {
    title: "Dólar Susan B. Anthony - EE.UU.",
    description: "El Dólar Susan B. Anthony fue acuñado entre 1979 y 1981, siendo la primera moneda de circulación americana en honrar a una mujer real. Presenta el retrato de la sufragista Susan B. Anthony.",
    country: "Estados Unidos",
    wikiFile: "1981-S_SBA$_Type_Two_Deep_Cameo.jpg",
    denomination: "1 Dólar",
  },
  {
    title: "Águila de Plata Americana - EE.UU.",
    description: "El American Silver Eagle es la moneda de plata de inversión oficial de los Estados Unidos, emitida desde 1986. Contiene 1 onza troy de plata pura y presenta la imagen de la Libertad Caminando.",
    country: "Estados Unidos",
    wikiFile: "2022-american-eagle-silver-one-ounce-bullion-coin-obverse.png",
    denomination: "1 Dólar",
  },

  // ── REINO UNIDO ───────────────────────────────────────────────────────────
  {
    title: "Soberano de Oro Británico - Reino Unido",
    description: "El Soberano es la moneda de oro británica más icónica, acuñada desde 1489 con diseño moderno desde 1817. Su reverso muestra a San Jorge matando al dragón, obra maestra de Benedetto Pistrucci.",
    country: "Reino Unido",
    wikiFile: "1963_Gold_Sovereign_–_St._George_Reverse.png",
    denomination: "1 Libra",
  },
  {
    title: "Britannia de Plata - Reino Unido",
    description: "La Britannia de plata es la moneda de inversión oficial del Reino Unido, emitida desde 1997. Contiene 1 onza troy de plata y presenta la figura alegórica de Britannia, símbolo de Gran Bretaña.",
    country: "Reino Unido",
    wikiFile: "Obverse_of_the_2016_Britannia_bullion_coin.png",
    denomination: "2 Libras",
  },
  {
    title: "Libra Esterlina Dodecagonal - Reino Unido",
    description: "La moneda de una libra esterlina de doce lados fue introducida en 2017 como la moneda de circulación más segura del mundo. Presenta el retrato del monarca y un diseño floral en el reverso.",
    country: "Reino Unido",
    wikiFile: "British_12_sided_pound_coin.png",
    denomination: "1 Libra",
  },
  {
    title: "50 Peniques Británicos - Reino Unido",
    description: "La moneda de 50 peniques es la mayor moneda de circulación del Reino Unido, con su inconfundible forma heptagonal desde 1969. Ha sido objeto de numerosas ediciones conmemorativas a lo largo de los años.",
    country: "Reino Unido",
    wikiFile: "British_fifty_pence_coin_2015_obverse.png",
    denomination: "50 Peniques",
  },
  {
    title: "Corona Victoriana 1891 - Reino Unido",
    description: "La Corona es la moneda más grande de la historia británica, acuñada en plata desde el siglo XVI. El ejemplar victoriano de 1891 presenta el 'retrato de jubileo' de la reina Victoria, diseñado por Joseph Boehm.",
    country: "Reino Unido",
    wikiFile: "Obverse_of_the_crown_of_1891,_Great_Britain,_Victoria.jpg",
    denomination: "5 Chelines",
  },
  {
    title: "Florín Británico de Isabel II - Reino Unido",
    description: "El Florín británico equivalía a dos chelines y fue acuñado entre 1849 y 1967. Fue la primera moneda decimalizada del Reino Unido, precursora del sistema moderno de 10 peniques.",
    country: "Reino Unido",
    wikiFile: "British_florin_1967_obverse.png",
    denomination: "2 Chelines",
  },
  {
    title: "Chelín Británico de Isabel II - Reino Unido",
    description: "El chelín fue la moneda de un veinteavo de libra esterlina, acuñada desde el siglo XVI hasta la decimalización en 1971. La versión de Isabel II fue diseñada por Mary Gillick en 1953.",
    country: "Reino Unido",
    wikiFile: "British_shilling_1963_obverse.png",
    denomination: "1 Chelín",
  },

  // ── ALEMANIA ──────────────────────────────────────────────────────────────
  {
    title: "Tálero Histórico - Alemania",
    description: "El Tálero original, acuñado en Joachimsthal desde 1520, fue el origen del nombre de todas las monedas tipo 'dólar' del mundo. Esta gran moneda de plata del Sacro Imperio estableció el estándar monetario europeo durante siglos.",
    country: "Alemania",
    wikiFile: "Thaler.jpg",
    denomination: "1 Tálero",
  },
  {
    title: "5 Marcos - Guillermo II 1901 - Imperio Alemán",
    description: "La moneda de 5 marcos del Kaiser Guillermo II fue acuñada a principios del siglo XX durante el Imperio Alemán. Presenta el retrato del kaiser en el anverso y el águila imperial en el reverso.",
    country: "Alemania",
    wikiFile: "5_mark_Wilhelm_II_-_1901.png",
    denomination: "5 Marcos",
  },
  {
    title: "5 Marcos 1937 - III Reich Alemán",
    description: "La moneda de 5 Reichsmarks de 1937 fue acuñada durante el Tercer Reich y es una pieza histórica muy documentada por coleccionistas. Presenta el águila nacional en el reverso.",
    country: "Alemania",
    wikiFile: "5_marks_Germany_-_1937.png",
    denomination: "5 Marcos",
  },
  {
    title: "2 Euros Bremen 2026 - Alemania",
    description: "La moneda conmemorativa de 2 euros de Bremen 2026 forma parte de la serie alemana de estados federales. Su anverso muestra el Ayuntamiento de Bremen, declarado Patrimonio de la Humanidad por la UNESCO.",
    country: "Alemania",
    wikiFile: "2-Euro_Münze_Bremen_2026.jpg",
    denomination: "2 Euros",
  },

  // ── AUSTRIA ───────────────────────────────────────────────────────────────
  {
    title: "Tálero de María Teresa - Austria",
    description: "El Tálero de María Teresa es una de las monedas más reconocidas de la historia, acuñada desde 1741 con la efigie de la emperatriz. Fue ampliamente usada en el comercio de Oriente Medio y África Oriental durante siglos.",
    country: "Austria",
    wikiFile: "Tallero_di_Maria_Teresa.jpg",
    denomination: "1 Tálero",
  },
  {
    title: "Ducado de Oro de Franz Josef - Austria",
    description: "El ducado de oro austríaco con el retrato del Kaiser Franz Josef I fue acuñado a finales del siglo XIX. Los ducados austriacos fueron moneda de comercio internacional durante el Imperio Austro-Húngaro.",
    country: "Austria",
    wikiFile: "Gold-Dukaten-KFJ.jpg",
    denomination: "1 Ducado",
  },
  {
    title: "Filarmónica de Viena - Austria",
    description: "La Filarmónica de Viena es la moneda de oro de inversión más vendida de Europa, emitida desde 1989. Su reverso muestra los instrumentos de la Filarmónica de Viena y el anverso el Gran Órgano de la Sala Dorada.",
    country: "Austria",
    wikiFile: "1_oz_Vienna_Philharmonic_2017_reverse.png",
    denomination: "100 Euros",
  },

  // ── MÉXICO ────────────────────────────────────────────────────────────────
  {
    title: "Pieza de Ocho - Reyes Católicos - México/España",
    description: "La Pieza de Ocho fue la primera moneda de uso global de la historia, acuñada en las cecas de México, Lima y Potosí. Circuló en todos los continentes durante los siglos XVII y XVIII como reserva internacional.",
    country: "México",
    wikiFile: "Reyes_Católicos_8_reales_28829.jpg",
    denomination: "8 Reales",
  },
  {
    title: "Libertad de Plata Mexicana - México",
    description: "La Moneda Libertad de plata es la moneda de inversión oficial de México, emitida desde 1982. Su reverso muestra el Ángel de la Independencia con los volcanes Popocatépetl e Iztaccíhuatl de fondo.",
    country: "México",
    wikiFile: "Mexican_Libertad_silver_coin_obverse.png",
    denomination: "1 Onza",
  },
  {
    title: "Libertad de Oro Mexicana - México",
    description: "La Moneda Libertad de oro es la moneda de inversión en oro de México, emitida desde 1981. El anverso muestra el escudo nacional mexicano con el águila posada sobre un nopal devorando una serpiente.",
    country: "México",
    wikiFile: "Mexican_Libertad_gold_coin_obverse.png",
    denomination: "1 Onza",
  },

  // ── SUDÁFRICA ─────────────────────────────────────────────────────────────
  {
    title: "Krugerrand de Oro - Sudáfrica",
    description: "El Krugerrand es la moneda de oro de inversión más vendida del mundo, emitida desde 1967 por la Casa de la Moneda Sudafricana. Lleva el retrato de Paul Kruger y un springbok (antílope) en el reverso.",
    country: "Sudáfrica",
    wikiFile: "1_oz_Krugerrand_2017_Bildseite.png",
    denomination: "1 Onza",
  },
  {
    title: "10 Centavos Jan van Riebeeck 1962 - Sudáfrica",
    description: "La moneda de 10 centavos de 1962 presenta el retrato de Jan van Riebeeck, fundador holandés de la Colonia del Cabo en 1652. Esta moneda de plata de la era del apartheid es hoy una pieza de colección histórica.",
    country: "Sudáfrica",
    wikiFile: "1962_South_African_10_Cent_Coin_featuring_Jan_van_Riebeeck.png",
    denomination: "10 Centavos",
  },

  // ── CANADÁ ────────────────────────────────────────────────────────────────
  {
    title: "Loonie y Toonie - Canadá",
    description: "El Loonie (1 dólar) y el Toonie (2 dólares) son las icónicas monedas canadienses que circulan desde los años 1980 y 1990. El Loonie lleva un colimbo ártico, ave que da nombre coloquial a la moneda.",
    country: "Canadá",
    wikiFile: "Canadian_1_and_2_dollar_coins.png",
    denomination: "1 y 2 Dólares",
  },
  {
    title: "Toonie Carlos III - Canadá",
    description: "El Toonie (2 dólares canadienses) es una moneda bimetálica introducida en 1996. La versión de 2023 presenta el retrato del rey Carlos III en el anverso y un oso polar sobre hielo en el reverso.",
    country: "Canadá",
    wikiFile: "2023_Toonie_-_obverse.webp",
    denomination: "2 Dólares",
  },
  {
    title: "Hoja de Arce de Plata Canadiense - Canadá",
    description: "La Hoja de Arce de Plata es la moneda de inversión más reconocida de Canadá, emitida desde 1988. Con una pureza del 99.99%, es de las monedas de plata más puras del mundo.",
    country: "Canadá",
    wikiFile: "Canadian_Silver_Maple_Leaf_coins_and_tubes.png",
    denomination: "5 Dólares",
  },

  // ── AUSTRALIA ─────────────────────────────────────────────────────────────
  {
    title: "50 Centavos Australianos - Australia",
    description: "La moneda de cincuenta centavos australianos es la de mayor denominación en circulación de Australia. Su forma dodecagonal y el escudo de armas australiano la hacen muy reconocible.",
    country: "Australia",
    wikiFile: "Australian_fifty-cent_coin_reverse.jpg",
    denomination: "50 Centavos",
  },
  {
    title: "Florín Australiano Jorge VI 1942 - Australia",
    description: "El Florín australiano de 1942 con el retrato de Jorge VI fue emitido durante la Segunda Guerra Mundial. Fue la moneda de mayor denominación de circulación australiana antes de la decimalización de 1966.",
    country: "Australia",
    wikiFile: "Australia_-_Florin_1942_S_-_Georgius_VI.jpg",
    denomination: "2 Chelines",
  },
  {
    title: "1 Dólar Australiano - Australia",
    description: "El dólar australiano de 1 dólar presenta un canguro en su reverso, animal símbolo de Australia. Es una moneda de aluminio-bronce introducida en 1984 que sustituyó al billete de un dólar.",
    country: "Australia",
    wikiFile: "Australian_$1_Coin.png",
    denomination: "1 Dólar",
  },

  // ── JAPÓN ─────────────────────────────────────────────────────────────────
  {
    title: "500 Yenes - Japón",
    description: "La moneda de 500 yenes es la de mayor valor en circulación en Japón, introducida en 1982. La versión bimetálica actual de 2021 incorpora tecnología avanzada anti-falsificación.",
    country: "Japón",
    wikiFile: "500yen-R3.jpg",
    denomination: "500 Yenes",
  },
  {
    title: "100 Yenes - Japón",
    description: "La moneda de 100 yenes es una de las más utilizadas en Japón, acuñada en cuproníquel desde 1967. Su anverso muestra flores de cerezo, el símbolo floral nacional del país.",
    country: "Japón",
    wikiFile: "100JPY.JPG",
    denomination: "100 Yenes",
  },
  {
    title: "5 Yenes - Japón",
    description: "La moneda de 5 yenes es la única moneda japonesa perforada en el centro, acuñada en latón dorado desde 1949. Se considera de buena suerte porque 'go en' en japonés suena igual que 'buena relación'.",
    country: "Japón",
    wikiFile: "5JPY.JPG",
    denomination: "5 Yenes",
  },
  {
    title: "1 Yen Meiji 1870 - Japón",
    description: "El yen de plata de 1870 fue una de las primeras monedas del Japón moderno, acuñada durante la era Meiji tras la restauración imperial. Presenta un dragón en el reverso y fue diseñada para el comercio en el Pacífico.",
    country: "Japón",
    wikiFile: "1_yen_Meiji_3_-_1870.png",
    denomination: "1 Yen",
  },

  // ── CHINA ─────────────────────────────────────────────────────────────────
  {
    title: "Panda de Oro Chino - China",
    description: "El Panda de Oro es la moneda de inversión oficial de la República Popular China, emitida desde 1982. Cada año presenta un nuevo diseño de panda gigante, el animal símbolo de China.",
    country: "China",
    wikiFile: "Panda100YuanA.jpg",
    denomination: "100 Yuan",
  },
  {
    title: "Dólar Yuan Shikai 1914 - China",
    description: "El Dólar Yuan Shikai de 1914 fue la moneda de plata estándar de la República de China, con el retrato del presidente Yuan Shikai. Conocido como 'Cabeza de Yuan', fue la moneda oficial de la era republicana.",
    country: "China",
    wikiFile: "1_dollar_Yuan_Shikai_1914_-_3.png",
    denomination: "1 Yuan",
  },
  {
    title: "Moneda de Cash China Antigua - China",
    description: "Las monedas de cash de bronce con agujero cuadrado central fueron la moneda estándar de China durante más de dos milenios, desde la dinastía Qin hasta principios del siglo XX. El agujero permitía ensartarlas en cuerdas.",
    country: "China",
    wikiFile: "China_coin1.JPG",
    denomination: "1 Cash (Wen)",
  },

  // ── COREA DEL SUR ─────────────────────────────────────────────────────────
  {
    title: "500 Won - Corea del Sur",
    description: "La moneda de 500 won es la de mayor denominación en circulación en Corea del Sur, acuñada en cuproníquel desde 1982. Su reverso presenta una grulla manchu en vuelo, símbolo de longevidad en la cultura coreana.",
    country: "Corea del Sur",
    wikiFile: "500_won_1982_obverse.jpeg",
    denomination: "500 Won",
  },
  {
    title: "100 Won 1970 - Corea del Sur",
    description: "La moneda de 100 won presenta al almirante Yi Sun-sin, héroe nacional que destruyó la flota japonesa en el siglo XVI. Es una de las monedas de circulación más utilizadas en la vida diaria coreana.",
    country: "Corea del Sur",
    wikiFile: "100_won_1970_obverse.jpeg",
    denomination: "100 Won",
  },

  // ── INDIA ─────────────────────────────────────────────────────────────────
  {
    title: "Mohur de Oro de Akbar - Imperio Mogol, India",
    description: "El Mohur de oro del emperador Akbar (1556-1605) es una de las monedas más fascinantes del Imperio Mogol. Estas monedas de alta pureza circularon por toda la India y el Oriente durante el apogeo del poder mogol.",
    country: "India",
    wikiFile: "Mohur_of_Akbar_(r._1556-1605)_LACMA_M.77.55.11_(1_of_2).jpg",
    denomination: "1 Mohur",
  },
  {
    title: "1 Rupia Gandhi 1948 - India",
    description: "La rupia de 1948 con el retrato de Mahatma Gandhi fue emitida como moneda conmemorativa del padre de la nación india. Es una de las primeras monedas de la India republicana y una pieza de gran valor histórico.",
    country: "India",
    wikiFile: "1_rupee_Gandhi_India_-_1948.png",
    denomination: "1 Rupia",
  },
  {
    title: "Monedas 75 Años Independencia - India",
    description: "En 2022 India emitió monedas conmemorativas del 75 aniversario de su independencia, mostrando el sello del gobierno con el León de Ashoka. Son un símbolo de la soberanía y el orgullo nacional indio.",
    country: "India",
    wikiFile: "75_years_of_India's_independence_commemorative_coins.png",
    denomination: "75 Rupias",
  },

  // ── ISRAEL ────────────────────────────────────────────────────────────────
  {
    title: "Primera Moneda del Estado de Israel 1948 - Israel",
    description: "La moneda de 25 mils fue la primera emitida por el Estado de Israel en 1948, año de su declaración de independencia. Presenta un racimo de uvas, símbolo bíblico de la Tierra Prometida.",
    country: "Israel",
    wikiFile: "25_mil_coin_–_the_State_of_Israel's_first_coin.png",
    denomination: "25 Mils",
  },
  {
    title: "10 Agorot 1960 - Israel",
    description: "La moneda de 10 agorot de 1960 fue una de las primeras de la serie decimal israelí. Presenta una menorá, el candelabro de siete brazos que es el símbolo oficial del Estado de Israel.",
    country: "Israel",
    wikiFile: "10_Agorot_(1960).jpg",
    denomination: "10 Agorot",
  },

  // ── EGIPTO ────────────────────────────────────────────────────────────────
  {
    title: "20 Piastras Rey Faruq 1937 - Egipto",
    description: "La moneda de 20 piastras del rey Faruq fue acuñada en plata durante el Reino de Egipto. Presenta el retrato del joven rey Faruq I en el anverso y el valor facial rodeado de ornamentos caligráficos árabes en el reverso.",
    country: "Egipto",
    wikiFile: "20_qirsh_king_Farouk_1927.jpg",
    denomination: "20 Piastras",
  },
  {
    title: "10 Piastras Egipcias - Egipto",
    description: "Las monedas de piastras egipcias son las denominaciones fraccionarias de la libra egipcia. Presentan el Escudo de la República Árabe de Egipto con el águila de Saladino en el anverso.",
    country: "Egipto",
    wikiFile: "10_Egyptian_piasters.png",
    denomination: "10 Piastras",
  },

  // ── TURQUÍA ───────────────────────────────────────────────────────────────
  {
    title: "1 Lira Turca Moderna - Turquía",
    description: "La moneda de 1 lira turca moderna es una moneda bimetálica emitida desde 2005, tras la reforma monetaria que eliminó seis ceros de la antigua lira. Presenta el retrato de Mustafa Kemal Atatürk en el anverso.",
    country: "Turquía",
    wikiFile: "1TL obverse.png",
    denomination: "1 Lira",
  },
  {
    title: "1 Piastra Otomana de Trípoli 1773 - Imperio Otomano",
    description: "La piastra otomana de 1773 fue acuñada en Trípoli durante el reinado del sultán Abdulhamid I. Es una moneda de plata del Imperio Otomano que circuló por el Mediterráneo y el Oriente Medio.",
    country: "Turquía",
    wikiFile: "1 Piastre Ottoman Tripolitania 1773 - Abdulhamid I.png",
    denomination: "1 Piastra",
  },

  // ── RUSIA ─────────────────────────────────────────────────────────────────
  {
    title: "1 Rublo Nicolás II 1898 - Imperio Ruso",
    description: "El rublo de plata del zar Nicolás II acuñado en 1898 es una de las monedas más coleccionadas del Imperio Ruso. Presenta el retrato del último zar de Rusia en el anverso con inscripciones en cirílico.",
    country: "Rusia",
    wikiFile: "1_ruble_Nikolai_II_-_1898.png",
    denomination: "1 Rublo",
  },
  {
    title: "1 Rublo - Tercer Centenario Románov 1913 - Rusia",
    description: "El rublo de plata de 1913 fue acuñado para conmemorar el tercer centenario de la dinastía Románov. Es una pieza conmemorativa muy codiciada que presenta a Nicolás II y el primer zar Mikhail Fiódorovich.",
    country: "Rusia",
    wikiFile: "1_ruble_Russia_1913.png",
    denomination: "1 Rublo",
  },

  // ── SUECIA ────────────────────────────────────────────────────────────────
  {
    title: "2 Coronas - Bodas de Oro Oscar II 1907 - Suecia",
    description: "La moneda de 2 coronas de 1907 conmemora las bodas de oro del rey Oscar II de Suecia. Es una moneda de plata conmemorativa muy apreciada por su diseño elegante y su valor histórico.",
    country: "Suecia",
    wikiFile: "2_Kronor_-_Oscar_II_Golden_Wedding_1907.png",
    denomination: "2 Coronas",
  },
  {
    title: "5 Coronas - 70 Años Gustaf VI Adolf 1952 - Suecia",
    description: "La moneda conmemorativa de 5 coronas de 1952 celebra el 70 cumpleaños del rey Gustaf VI Adolf. Es una pieza de plata con el retrato oficial del monarca sueco.",
    country: "Suecia",
    wikiFile: "5_Kronor_-_Gustaf_VI_Adolf_70th_Birthday_1952.png",
    denomination: "5 Coronas",
  },

  // ── NORUEGA ───────────────────────────────────────────────────────────────
  {
    title: "10 Coronas - Constitución Noruega 150 Años 1964 - Noruega",
    description: "La moneda de 10 coronas de 1964 conmemora el 150 aniversario de la Constitución noruega durante el reinado de Olav V. Es una de las monedas conmemorativas más populares de la numismática noruega.",
    country: "Noruega",
    wikiFile: "10 Kroner - Olav V Constitution Sesquicentennial 1964.png",
    denomination: "10 Coronas",
  },
  {
    title: "1 Corona Noruega 2010 - Noruega",
    description: "La moneda de 1 corona noruega presenta el monograma del rey Harald V. Noruega introdujo el sistema decimal de coronas en 1875 al unirse a la Unión Monetaria Escandinava.",
    country: "Noruega",
    wikiFile: "1 NOK Coin 2010 Obverse.jpg",
    denomination: "1 Corona",
  },

  // ── PAÍSES BAJOS ──────────────────────────────────────────────────────────
  {
    title: "Ducatón de Utrecht 1793 - Países Bajos",
    description: "El Ducatón de plata de Utrecht de 1793 es un ejemplo magnífico de la numismática holandesa del siglo XVIII. También llamado 'rijder de plata', muestra a un jinete a caballo completamente armado.",
    country: "Países Bajos",
    wikiFile: "Utrecht_Ducaton_82001327.jpg",
    denomination: "1 Ducatón",
  },
  {
    title: "Guillén - Reina Guillermina 1897 - Países Bajos",
    description: "El guillén o florín neerlandés de 1897 con el retrato de la joven reina Guillermina fue una de las primeras monedas que mostró su efigie. Fue la moneda principal de los Países Bajos hasta el euro en 2002.",
    country: "Países Bajos",
    wikiFile: "Netherlands,_1897_-_Guilder,_Welhelmina.jpg",
    denomination: "1 Guillén",
  },

  // ── PORTUGAL ──────────────────────────────────────────────────────────────
  {
    title: "50 Escudos - Vasco da Gama 1969 - Portugal",
    description: "La moneda de 50 escudos de 1969 conmemora el quinto centenario del descubrimiento de la ruta marítima a la India por Vasco da Gama. Es una pieza de plata de gran valor numismático de la era del Estado Novo.",
    country: "Portugal",
    wikiFile: "50_Escudos_Vasco_da_Gama_1969.png",
    denomination: "50 Escudos",
  },
  {
    title: "1 Escudo Portugués 1916 - Portugal",
    description: "El escudo de 1916 fue la primera moneda de la República Portuguesa, sustituyendo al real del Imperio. Fue la unidad monetaria del país durante casi un siglo hasta la adopción del euro en 2002.",
    country: "Portugal",
    wikiFile: "1_Escudo_of_Portugal_1916.png",
    denomination: "1 Escudo",
  },

  // ── FRANCIA ───────────────────────────────────────────────────────────────
  {
    title: "Franco a Caballo de Carlos V - Francia 1360",
    description: "El Franco a Caballo de 1360 fue la primera moneda francesa denominada 'franco', acuñada por Carlos V para pagar el rescate del rey Juan II prisionero en Inglaterra. La moneda muestra al rey a caballo con armadura completa.",
    country: "Francia",
    wikiFile: "Franc_à_cheval_1360_73001139.jpg",
    denomination: "1 Franco",
  },
  {
    title: "5 Francos - Luis Felipe I 1848 - Francia",
    description: "La moneda de 5 francos de plata del rey Luis Felipe I fue la moneda de mayor denominación de la monarquía de julio francesa. La pieza napoleónica de 5 francos fue la principal moneda de comercio europea del siglo XIX.",
    country: "Francia",
    wikiFile: "5_Francs_-_Louis_Philippe_I_Domard_type,_3rd_1848.png",
    denomination: "5 Francos",
  },
  {
    title: "20 Céntimos Marianne - Francia",
    description: "La moneda de 20 céntimos francesa presenta a Marianne con el gorro frigio, símbolo de la República Francesa. Acuñada entre 1962 y 2001, es una de las monedas más emblemáticas de la Quinta República.",
    country: "Francia",
    wikiFile: "20_Centimes_(France).jpg",
    denomination: "20 Céntimos",
  },

  // ── ESPAÑA ────────────────────────────────────────────────────────────────
  {
    title: "5 Pesetas Españolas 1870 - España",
    description: "La moneda de 5 pesetas fue la moneda principal de España desde 1869 hasta la adopción del euro. El diseño de 1870 con la figura de Hispania recostada fue el modelo base de la Serie de la Latina.",
    country: "España",
    wikiFile: "5_Peseta_of_Spain_1870.png",
    denomination: "5 Pesetas",
  },
  {
    title: "8 Reales Carlos III 1763 - España/México",
    description: "La moneda de 8 reales de Carlos III de 1763, acuñada en México, es un peso colonial español canónico. Circuló como moneda de reserva mundial y es el antepasado directo del dólar estadounidense.",
    country: "España",
    wikiFile: "8_Reales_Carlos_III_1763_MM.png",
    denomination: "8 Reales",
  },

  // ── ITALIA ────────────────────────────────────────────────────────────────
  {
    title: "Florín de Oro Florentino 1347 - Italia",
    description: "El Florín de oro florentino fue la primera moneda de oro de alta circulación en la Europa medieval, acuñado desde 1252. Fue la moneda de referencia del comercio internacional europeo durante más de 200 años.",
    country: "Italia",
    wikiFile: "Fiorino_1347.jpg",
    denomination: "1 Florín",
  },
  {
    title: "2 Euros Jubileo 2025 - Italia",
    description: "La moneda conmemorativa italiana de 2 euros de 2025 celebra el Jubileo Católico proclamado por el Papa Francisco. Es una edición especial con simbolismo religioso y arquitectónico del Vaticano.",
    country: "Italia",
    wikiFile: "2-euro-italia-2025-giubileo-iubilaeum.jpg",
    denomination: "2 Euros",
  },

  // ── GRECIA ANTIGUA / MACEDONIA ────────────────────────────────────────────
  {
    title: "Tetradracma de Atenas 480-420 a.C. - Antigua Grecia",
    description: "El Tetradracma ateniense con el búho de Atenea fue la moneda de reserva del mundo antiguo durante los siglos V y IV a.C. Acuñado en plata del Ática, circuló por todo el Mediterráneo y el Oriente Medio.",
    country: "Grecia (Antigua)",
    wikiFile: "Tetradrachm_Athens_480-420BC_MBA_Lyon.jpg",
    denomination: "4 Dracmas",
  },
  {
    title: "Tetradracma de Alejandro Magno - Macedonia",
    description: "El Tetradracma de Alejandro Magno muestra a Heracles con piel de león en el anverso y Zeus entronizado en el reverso. Fue la moneda más difundida del mundo helenístico, acuñada desde Macedonia hasta la India.",
    country: "Grecia (Antigua)",
    wikiFile: "Alexander_the_great_temnos_tetradrachm.jpg",
    denomination: "4 Dracmas",
  },

  // ── ROMA ANTIGUA ──────────────────────────────────────────────────────────
  {
    title: "Sestercio Romano - Roma Antigua",
    description: "El Sestercio fue la moneda de bronce más importante del Imperio Romano. Presentaba el retrato del emperador reinante en el anverso y alegorías de la prosperidad romana en el reverso.",
    country: "Roma (Antigua)",
    wikiFile: "ArSestertiusDioscuri.jpg",
    denomination: "1 Sestercio",
  },
  {
    title: "Áureo de Septimio Severo 193 d.C. - Roma",
    description: "El Áureo de Septimio Severo de 193 d.C. es una de las monedas de oro romanas mejor conservadas. Fue acuñado para celebrar la Legio XIV Gemina, la legión que proclamó a Severo como emperador.",
    country: "Roma (Antigua)",
    wikiFile: "Aureus_of_Septimius_Severus,_AD_193.jpg",
    denomination: "1 Áureo",
  },
  {
    title: "Sólido de Teodosio II c. 435 d.C. - Imperio Bizantino",
    description: "El Sólido de oro del emperador Teodosio II, acuñado hacia el año 435 en Constantinopla, fue la moneda más estable de la historia: mantuvo su peso y pureza durante más de 700 años.",
    country: "Imperio Bizantino",
    wikiFile: "Theodosius_II_solidus.jpg",
    denomination: "1 Sólido",
  },

  // ── CALIFATOS E IMPERIOS ISLÁMICOS ────────────────────────────────────────
  {
    title: "Dinar de Oro Omeya 697 d.C. - Califato Omeya",
    description: "El Dinar de oro omeya de Damasco del año 697 d.C. fue la primera moneda islámica sin imágenes figurativas. Solo presenta inscripciones coránicas en árabe y estableció el estándar monetario del mundo islámico medieval.",
    country: "Siria (Califato Omeya)",
    wikiFile: "Khalili_Collection_Islamic_Art_av-1071.jpg",
    denomination: "1 Dinar",
  },
  {
    title: "Moneda del Emperador Aurangzeb - Kabul 1691 - Imperio Mogol",
    description: "La moneda del emperador Aurangzeb (1658-1707) fue acuñada en Kabul y presenta inscripciones en persa con el nombre del monarca. Es representativa del sistema monetario del Imperio Mogol en su máxima expansión.",
    country: "India (Imperio Mogol)",
    wikiFile: "Coin of Aurangzeb, minted in Kabul.jpg",
    denomination: "1 Rupia",
  },

  // ── BRASIL ────────────────────────────────────────────────────────────────
  {
    title: "1 Real Brasileño 2018 - Brasil",
    description: "La moneda de 1 real presenta la efigie de la República en el anverso. Es la moneda estabilizadora que terminó con la hiperinflación brasileña de los años 1990 y simboliza la modernización económica del país.",
    country: "Brasil",
    wikiFile: "1-real-2018-separado.png",
    denomination: "1 Real",
  },
  {
    title: "20 Reales - 500 Años del Brasil 2000 - Brasil",
    description: "La moneda conmemorativa de 20 reales de 2000 celebra el quinto centenario del descubrimiento de Brasil por Pedro Álvares Cabral. Es una pieza de plata de gran valor numismático e histórico para la coleccionística latinoamericana.",
    country: "Brasil",
    wikiFile: "20-reais-2000-descobrimento.png",
    denomination: "20 Reales",
  },

  // ── HONG KONG ─────────────────────────────────────────────────────────────
  {
    title: "1 Dólar Victoria de Hong Kong 1867 - Hong Kong",
    description: "El dólar de plata de 1867 con el retrato de la reina Victoria fue acuñado para el comercio de Hong Kong colonial. Es una de las monedas coloniales británicas más bellas del siglo XIX.",
    country: "Hong Kong",
    wikiFile: "1_dollar_Victoria_of_Hong_Kong_1867.jpg",
    denomination: "1 Dólar",
  },
  {
    title: "5 Dólares Hong Kong 1997 - Hong Kong",
    description: "La moneda de 5 dólares de Hong Kong de 1997 fue emitida para conmemorar la transferencia de soberanía de Reino Unido a China. Presenta la bauhinia, flor símbolo de la Región Administrativa Especial de Hong Kong.",
    country: "Hong Kong",
    wikiFile: "Reverse_of_the_Hong_Kong_Five-Dollar_coin_1997.jpg",
    denomination: "5 Dólares",
  },

  // ── FILIPINAS ─────────────────────────────────────────────────────────────
  {
    title: "1 Peso Filipinas 1909 - Filipinas",
    description: "El peso de plata de 1909 fue acuñado durante la administración estadounidense de Filipinas. Presenta la imagen de un forjador de acero golpeando el yunque, símbolo del trabajo y la forja de una nación.",
    country: "Filipinas",
    wikiFile: "1 peso Philippines - USA 1909.png",
    denomination: "1 Peso",
  },
  {
    title: "10 Piso Filipinos - Filipinas",
    description: "La moneda de 10 piso es la de mayor denominación en circulación de las Filipinas. Presenta el retrato de Apolinario Mabini, el 'cerebro de la revolución' filipina, en el anverso.",
    country: "Filipinas",
    wikiFile: "10 piso Coin NGC rev.jpg",
    denomination: "10 Piso",
  },

  // ── KENIA ─────────────────────────────────────────────────────────────────
  {
    title: "1 Chelín Keniano - Kenia",
    description: "El chelín keniano es la moneda oficial de Kenia, emitida desde la independencia del país en 1966. Presenta el retrato del primer presidente Jomo Kenyatta y refleja la rica identidad cultural del país en África Oriental.",
    country: "Kenia",
    wikiFile: "1_Kenyan_Shilling_01.png",
    denomination: "1 Chelín",
  },

  // ── NUEVA ZELANDA ─────────────────────────────────────────────────────────
  {
    title: "50 Centavos de Nueva Zelanda - Nueva Zelanda",
    description: "La moneda de 50 centavos de Nueva Zelanda, de forma dodecagonal, presenta el escudo de armas del país en su reverso. Es muy reconocible entre las monedas del Pacífico y fue emitida con el diseño actual desde 2006.",
    country: "Nueva Zelanda",
    wikiFile: "New_Zealand_50_cents.png",
    denomination: "50 Centavos",
  },

  // ── POLONIA ───────────────────────────────────────────────────────────────
  {
    title: "Złoty de Stanisław II Agosto 1766 - Polonia",
    description: "La moneda de złoty de 1766 fue acuñada durante el reinado de Stanisław II Agosto, último rey de Polonia antes de las particiones. El złoty es la moneda más antigua de Polonia, cuyo nombre significa 'dorado' en polaco.",
    country: "Polonia",
    wikiFile: "Złotówka_1766.jpg",
    denomination: "1 Złoty",
  },
  {
    title: "5 Złotych Polonia 1994 - Polonia",
    description: "La moneda de 5 złotych de 1994 es la moneda bimetálica de mayor denominación de circulación regular en Polonia. Presenta el águila blanca sobre fondo rojo, símbolo nacional polaco desde el siglo XIII.",
    country: "Polonia",
    wikiFile: "Polish_5-Zloty_coin_(1994).gif",
    denomination: "5 Złotych",
  },

  // ── UNIÓN EUROPEA ─────────────────────────────────────────────────────────
  {
    title: "2 Euros - Cara Común - Unión Europea",
    description: "La moneda de 2 euros es la de mayor denominación de circulación en la zona euro. Su cara común muestra el mapa de Europa sin fronteras internas diseñado por Luc Luycx, rodeada de 12 estrellas doradas.",
    country: "Unión Europea",
    wikiFile: "Common_face_of_two_euro_coin_(2007).jpg",
    denomination: "2 Euros",
  },
  {
    title: "1 Euro - Cara Común - Unión Europea",
    description: "La moneda de 1 euro es el símbolo de la unión monetaria europea, introducida en circulación en 2002. La cara común presenta el globo terráqueo y el continente europeo, diseño de Luc Luycx para los países de la eurozona.",
    country: "Unión Europea",
    wikiFile: "Common_face_of_one_euro_coin.png",
    denomination: "1 Euro",
  },

  // ── ARGENTINA ─────────────────────────────────────────────────────────────
  {
    title: "Primera Moneda Patria Argentina 1813 - Argentina",
    description: "La primera moneda de oro de Argentina, acuñada en 1813 durante las guerras de independencia, presenta el Sol de Mayo y la leyenda 'Provincias del Río de la Plata'. Es la moneda fundacional de la numismática argentina.",
    country: "Argentina",
    wikiFile: "Primera_Moneda_Patria_Argentina_de_Oro_1813.JPG",
    denomination: "8 Escudos",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith("https") ? https : http;
    const req = (get as typeof https).get(url, { headers: { "User-Agent": "CromosUniverso/1.0 (seed-coins; a.g.iriarte@gmail.com)" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    });
    req.on("error", (e) => {
      fs.unlink(dest, () => {});
      reject(e);
    });
  });
}

async function uploadToS3(localPath: string, key: string, contentType: string): Promise<string> {
  const body = fs.readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // Connectivity check
  console.log(`🔗 Supabase URL: ${SUPABASE_URL!.slice(0, 40)}...`);
  try {
    const probe = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!probe.ok && probe.status !== 401 && probe.status !== 404) {
      console.error(`❌ Supabase returned HTTP ${probe.status} — project may be paused at supabase.com`);
      process.exit(1);
    }
    console.log(`✓ Supabase reachable (HTTP ${probe.status})`);
  } catch (e) {
    console.error("❌ Cannot reach Supabase:", (e as Error).message);
    console.error("   → Check if project is paused at https://supabase.com/dashboard");
    console.error("   → Verify NEXT_PUBLIC_SUPABASE_URL in .env.local");
    process.exit(1);
  }

  // 1. Upsert category
  console.log("\n📁 Creating category 'Monedas del mundo'...");
  const { data: catData, error: catError } = await supabase
    .from("categories")
    .upsert({ name: "Monedas del mundo", slug: "monedas-del-mundo" }, { onConflict: "slug" })
    .select("id")
    .single();

  if (catError) {
    console.error("❌ Error creating category:", catError.message);
    process.exit(1);
  }
  const categoryId = catData.id;
  console.log(`✓ Category ID: ${categoryId}`);

  // 2. Fetch existing slugs to skip duplicates
  const { data: existingData } = await supabase
    .from("articles")
    .select("slug")
    .eq("category_id", categoryId);
  const existingSlugs = new Set((existingData ?? []).map((r: { slug: string }) => r.slug));

  // 3. Process each coin
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const coin of COINS) {
    const slug = slugify(coin.title);

    if (existingSlugs.has(slug)) {
      console.log(`  ⏭  Skipping (already exists): ${coin.title}`);
      skipped++;
      continue;
    }

    const wikiUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(coin.wikiFile)}`;
    const ext = (coin.wikiFile.split(".").pop()?.toLowerCase() ?? "jpg").replace("jpeg", "jpg").replace("webp", "jpg").replace("gif", "jpg");
    const localFile = path.join(IMAGES_DIR, `${slug}.${ext}`);
    const s3Key = `coins/${slug}.${ext}`;
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    try {
      await new Promise((r) => setTimeout(r, 1200)); // respect Wikimedia rate limit
      process.stdout.write(`  ⬇  ${coin.title}...`);
      await downloadFile(wikiUrl, localFile);
      const publicUrl = await uploadToS3(localFile, s3Key, contentType);
      process.stdout.write(" ✓\n");

      const { error: insertError } = await supabase.from("articles").insert({
        title: coin.title,
        slug,
        description: coin.description,
        price: coin.price ?? 15000,
        stock: coin.stock ?? 1,
        waitlist: 3,
        status: "active",
        category_id: categoryId,
        thumbnail_url: publicUrl,
      });

      if (insertError) {
        console.error(`  ❌ DB error for ${coin.title}: ${insertError.message}`);
        failed++;
      } else {
        inserted++;
      }
    } catch (err) {
      console.error(`\n  ❌ Failed: ${coin.title} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n✅ Done: ${inserted} inserted, ${skipped} skipped, ${failed} failed.`);
  console.log(`   Images saved locally in: ${IMAGES_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
