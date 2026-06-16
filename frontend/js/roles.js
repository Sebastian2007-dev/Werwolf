// Single source of truth for all role data used by lobby.js and game.js

export const ROLES = [
    // ── Werwölfe
    { id: 'Werwolf_blau',  name: 'Werwolf',        image: 'Werwolf_blau.jpeg',   faction: 'W' },
    { id: 'Werwolf_gelb',  name: 'Werwolf',        image: 'Werwolf_gelb.jpeg',   faction: 'W' },
    { id: 'Werwolf_gruen', name: 'Werwolf',        image: 'Werwolf_grün.jpeg',   faction: 'W' },
    { id: 'Werwolf_rot',   name: 'Werwolf',        image: 'Werwolf_rot.jpeg',    faction: 'W' },
    // ── Dorfbewohner
    { id: 'Dorfbewohner',  name: 'Dorfbewohner',   image: 'Dorfbewohner.jpeg',   faction: 'D' },
    { id: 'Dorfmatraze',   name: 'Dorfmatratze',   image: 'Dorfmatraze.jpeg',    faction: 'D' },
    { id: 'Jaeger',        name: 'Jäger',          image: 'Jaeger.jpeg',          faction: 'D' },
    { id: 'Hexe',          name: 'Hexe',           image: 'Hexe.jpeg',            faction: 'D' },
    { id: 'Amor',          name: 'Amor',           image: 'Amor.jpeg',            faction: 'D' },
    { id: 'Seherin',       name: 'Seherin',        image: 'Seherin.jpeg',         faction: 'D' },
    { id: 'Haendler',      name: 'Händler',        image: 'Händler.jpeg',         faction: 'D' },
    { id: 'Alter',         name: 'Alter',          image: 'Alter.jpeg',           faction: 'D' },
    { id: 'Silberschmied', name: 'Silberschmied',  image: 'Silberschmied.jpeg',   faction: 'D' },
    { id: 'Katze',         name: 'Katze',          image: 'Katze.jpeg',           faction: 'D' },
    { id: 'Maus',          name: 'Maus',           image: 'Maus.jpeg',            faction: 'D' },
    { id: 'Gloeckner',     name: 'Glöckner',       image: 'Glöckner.jpeg',        faction: 'D' },
    { id: 'ErgebeneMagd',  name: 'Ergebene Magd',  image: 'ErgebeneMagd.jpeg',    faction: 'D' },
    { id: 'Baer',          name: 'Bär',            image: 'Bär.jpeg',             faction: 'D' },
    { id: 'Gendarm',       name: 'Gendarm',        image: 'Gendarm.jpeg',         faction: 'D' },
    // ── Neutral / Solo
    { id: 'Dieb',          name: 'Dieb',           image: 'Dieb.jpeg',            faction: 'N' },
    { id: 'WildesKind',    name: 'Wildes Kind',    image: 'WildesKind.jpeg',      faction: 'N' },
    { id: 'Narr',          name: 'Narr',           image: 'Narr.jpeg',            faction: 'N' },
    { id: 'JekylUndHyde',  name: 'Jekyll & Hyde',  image: 'JekylUndHyde.jpeg',    faction: 'N' },
    { id: 'JackTheRipper', name: 'Jack the Ripper',image: 'JackTheRipper.jpeg',   faction: 'N' },
    { id: 'Zigeunerin',    name: 'Zigeunerin',     image: 'Zigeunerin.jpeg',       faction: 'N' },
    { id: 'EinsamerWolf',  name: 'Einsamer Wolf',  image: 'EinsamerWolf.jpeg',    faction: 'S' },
];

export const DESCRIPTIONS = {
    Werwolf_blau:  'Tötet jede Nacht gemeinsam mit anderen Werwölfen einen Dorfbewohner.',
    Werwolf_gelb:  'Tötet jede Nacht gemeinsam mit anderen Werwölfen einen Dorfbewohner.',
    Werwolf_gruen: 'Tötet jede Nacht gemeinsam mit anderen Werwölfen einen Dorfbewohner.',
    Werwolf_rot:   'Tötet jede Nacht gemeinsam mit anderen Werwölfen einen Dorfbewohner.',
    Dorfbewohner:  'Keine besondere Fähigkeit. Finde die Werwölfe durch Diskussion und Abstimmung.',
    Dorfmatraze:   'Schläft jede Nacht bei einer Person. Wird die Dorfmatratze direkt von Werwölfen angegriffen, passiert nichts. Wird die Person, bei der sie schläft, angegriffen, stirbt die Dorfmatratze mit.',
    Jaeger:        'Wird der Jäger getötet, kann er eine Person mit in den Tod reißen.',
    Hexe:          'Hat zwei Tränke: Heiltrank (rettet das Werwolf-Opfer) und Gifttrank (tötet eine beliebige Person). Jeder Trank kann nur einmal eingesetzt werden.',
    Amor:          'Wählt in der ersten Nacht ein Liebespaar. Stirbt einer, stirbt der andere ebenfalls. Das Paar gewinnt, wenn es zuletzt übrig bleibt.',
    Seherin:       'Darf jede Nacht die Karte eines Mitspielers ansehen.',
    Haendler:      'Schickt jede Runde einen Spieler einkaufen – dieser ist für diese Runde unantastbar und darf nicht am Spiel teilnehmen.',
    Alter:         'Hat 2 Leben. Von Werwölfen angegriffen überlebt er das erste Mal. Bei einer Abstimmung stirbt er sofort.',
    Silberschmied: 'Rüstet in der ersten Nacht eine Person mit Silberwaffen aus. Greifen Werwölfe diese Person an, stirbt ein Werwolf – die Person überlebt.',
    Katze:         'Katze und Maus müssen unter allen Umständen versuchen, sich gegenseitig bei Abstimmungen auszuwählen.',
    Maus:          'Katze und Maus müssen unter allen Umständen versuchen, sich gegenseitig bei Abstimmungen auszuwählen.',
    Gloeckner:     'Darf einmal in einer Nacht die Glocken läuten – die Werwölfe können in dieser Nacht niemanden töten.',
    ErgebeneMagd:  'Darf nach dem Tod eines Spielers dessen Rolle übernehmen.',
    Baer:          'Sitzt der Bär neben einem Werwolf, brummt der Spielleiter zu Beginn der Tagesrunde.',
    Gendarm:       'Darf einmalig eine Person töten. Ist es eine Unschuldige, bringt er sich selbst ebenfalls um.',
    Dieb:          'Erhält zu Spielbeginn zwei Karten und wählt eine davon als seine Rolle.',
    WildesKind:    'Wählt in der ersten Nacht ein Idol. Stirbt das Idol, wird das Wilde Kind zum Werwolf.',
    Narr:          'Kann durch Abstimmungen nicht getötet werden (Narrenfreiheit). Darf nicht mit abstimmen.',
    JekylUndHyde:  'Wechselt jede Nacht die Seite: abwechselnd Werwolf und Dorfbewohner.',
    JackTheRipper: 'Schläft die Dorfmatratze bei Jack, stirbt sie. Schläft die Dorfmatratze bei einer Person, die Jack auswählt, wird die Dorfmatratze getötet und Jack mutiert zum Werwolf.',
    Zigeunerin:    'Stirbt automatisch, wenn sie angeklagt wird. Darf in der darauffolgenden Werwolfrunde einen Werwolf verfluchen/töten.',
    EinsamerWolf:  'Tötet jede zweite Runde einen Werwolf. Ziel: als einziger Überlebender gewinnen.',
};

export const FACTION_LABEL = { W: 'Werwolf', D: 'Dorfbewohner', N: 'Neutral', S: 'Solo' };
