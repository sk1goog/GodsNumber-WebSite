/*
 * Layer-by-Layer-Methode (LBL) – Inhalte für AlgGuide.
 *
 * Wichtig: Startzustände werden NICHT von Hand eingetragen. AlgGuide berechnet sie,
 * indem die Lösung rückwärts auf einen gelösten Würfel angewendet wird. Dadurch ist jede
 * Ausgangsstellung garantiert gültig und passt exakt zur gezeigten Zugfolge.
 * Aufbau und alle Felder: siehe ../ANLEITUNG.md
 */
AlgGuide.register({
  id: "lbl",
  title: "Layer-by-Layer-Methode",

  sections: [
    /* ------------------------------------------------------------------ */
    {
      id: "kreuz",
      number: "1",
      short: "Weißes Kreuz",
      title: "Das weiße Kreuz",
      goal: "Vier weiße Kanten oben – und jede passt zur Farbe ihres Seiten-Mittelsteins.",
      orientation: { U: "W", F: "G" },
      mask: [
        ["context", "centers"],
        ["context", "edges:U"],
      ],
      intro:
        "<p>Die Mittelsteine bewegen sich nie gegeneinander – sie legen fest, welche Farbe wohin gehört. " +
        "Eine weiß-grüne Kante gehört also zwischen das weiße und das grüne Zentrum. " +
        "Das Kreuz baust du weitgehend intuitiv; die zwei Situationen unten kommen dabei immer wieder vor.</p>",
      cases: [
        {
          id: "kreuz-unten",
          title: "Kante liegt unten, Weiß zeigt nach unten",
          focus: "UF",
          situation:
            "Die weiß-grüne Kante liegt in der unteren Ebene direkt unter ihrem Platz. Weiß zeigt nach unten, Grün nach vorne.",
          phases: [
            {
              moves: "F2",
              title: "Kante hochklappen",
              text: "Eine halbe Drehung der Vorderseite bringt die Kante von unten nach oben. Weiß zeigt danach nach oben, Grün passt zum grünen Mittelstein.",
            },
          ],
          tip: "Liegt die Kante woanders in der unteren Ebene, drehst du zuerst D, bis sie unter ihrem Mittelstein steht.",
          done: "Die Kante sitzt – die anderen Kreuzkanten wurden nicht berührt.",
        },
        {
          id: "kreuz-verdreht",
          title: "Kante sitzt am richtigen Platz, aber verdreht",
          focus: "UF",
          situation:
            "Die weiß-grüne Kante ist schon oben vorne, aber Grün zeigt nach oben und Weiß nach vorne.",
          phases: [
            {
              moves: "F",
              title: "Kante zur Seite klappen",
              text: "Die Vorderseite dreht die Kante nach rechts in die mittlere Ebene.",
            },
            {
              moves: "U'",
              title: "Nachbarkante in Sicherheit bringen",
              text: "Die weiß-rote Kante oben rechts würde vom nächsten Zug mitgerissen. U′ dreht sie nach hinten aus dem Weg.",
            },
            {
              moves: "R",
              title: "Kante richtig herum hochholen",
              text: "Die rechte Seite bringt die Kante nach oben – diesmal mit Weiß nach oben.",
            },
            {
              moves: "U",
              title: "Obere Ebene zurückdrehen",
              text: "U bringt die weiß-grüne Kante nach vorne und die weiß-rote Kante zurück an ihren Platz.",
            },
          ],
          done: "Die Kante ist umgedreht, das restliche Kreuz unverändert.",
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: "ecken",
      number: "2",
      short: "Weiße Ecken",
      title: "Die weißen Ecken – erste Ebene fertig",
      goal: "Die vier weißen Ecken einsetzen, sodass die komplette weiße Ebene stimmt.",
      orientation: { U: "W", F: "G" },
      mask: [
        ["context", "centers"],
        ["context", "layer:U"],
      ],
      intro:
        "<p>Die weiße Seite bleibt oben. Suche eine weiße Ecke in der unteren Ebene und drehe D, bis sie " +
        "<em>direkt unter ihrem Platz</em> steht – also zwischen den beiden Seitenfarben, die sie trägt. " +
        "Welcher Algorithmus passt, hängt nur davon ab, wohin das Weiß der Ecke zeigt. " +
        "Der graue Stein oben rechts ist der Platz, auf den die Ecke gehört.</p>",
      cases: [
        {
          id: "ecke-vorne",
          title: "Weiß zeigt nach vorne",
          focus: "UFR",
          situation:
            "Die weiß-grün-rote Ecke steht unten rechts unter ihrem Platz; Weiß zeigt nach vorne. " +
            "(Schaust du schräg auf die Ecke, zeigt Weiß nach links.)",
          phases: [
            {
              moves: "F",
              title: "Kreuzkante zur Seite klappen",
              text: "Die Vorderseite dreht sich: Die weiß-grüne Kante klappt nach rechts in die mittlere Ebene, die Ecke wandert nach unten links.",
            },
            {
              moves: "D",
              title: "Ecke unter die Kante bringen",
              text: "Die untere Ebene holt die Ecke zurück nach rechts – direkt unter die Kante. Jetzt zeigen das Weiß der Ecke und das Weiß der Kante in dieselbe Richtung.",
            },
            {
              moves: "F'",
              title: "Gemeinsam hochklappen",
              text: "Die Vorderseite zurückdrehen: Kante und Ecke gehen zusammen nach oben. Das Kreuz ist wieder vollständig, die Ecke sitzt.",
            },
          ],
          done: "Die Ecke sitzt, das weiße Kreuz ist unverändert.",
        },
        {
          id: "ecke-rechts",
          title: "Weiß zeigt nach rechts",
          focus: "UFR",
          situation:
            "Die Ecke steht unten rechts unter ihrem Platz; Weiß zeigt nach rechts. Das ist das Spiegelbild des vorigen Falls.",
          phases: [
            {
              moves: "R'",
              title: "Kreuzkante zur Seite klappen",
              text: "Die rechte Seite dreht die weiß-rote Kante nach vorne in die mittlere Ebene; die Ecke wandert nach hinten weg.",
            },
            {
              moves: "D'",
              title: "Ecke unter die Kante bringen",
              text: "D′ bringt die Ecke zurück nach vorne rechts – unter die Kante, Weiß zeigt jetzt bei beiden nach vorne.",
            },
            {
              moves: "R",
              title: "Gemeinsam hochklappen",
              text: "Die rechte Seite zurückdrehen: Kante und Ecke gehen zusammen nach oben.",
            },
          ],
          done: "Die Ecke sitzt.",
        },
        {
          id: "ecke-unten",
          title: "Weiß zeigt nach unten",
          focus: "UFR",
          situation:
            "Die Ecke steht unter ihrem Platz, aber Weiß zeigt nach unten. Keiner der beiden Grundzüge passt direkt.",
          phases: [
            {
              moves: "F D2 F' D'",
              title: "Ecke umorientieren",
              text: "Diese vier Züge drehen die Ecke so, dass Weiß nach vorne zeigt – sie steht danach wieder unter ihrem Platz, und das Kreuz ist intakt.",
            },
            {
              moves: "F D F'",
              title: "Einsetzen wie in Fall 2.1",
              text: "Jetzt liegt genau der Fall „Weiß zeigt nach vorne“ vor.",
            },
          ],
          tip: "Steckt eine Ecke oben, aber falsch, holst du sie mit R′ D′ R nach unten und setzt sie dann neu ein.",
          done: "Die Ecke sitzt. Mit den drei Fällen kannst du jede Ecke einsetzen.",
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: "mitte",
      number: "3",
      short: "Mittlere Ebene",
      title: "Die mittlere Ebene",
      goal: "Die vier Kanten ohne Gelb zwischen ihre Mittelsteine setzen.",
      orientation: { U: "Y", F: "G" },
      mask: [
        ["context", "centers"],
        ["context", "layer:D"],
        ["context", "edges:E"],
      ],
      intro:
        "<p>Drehe den Würfel um: <strong>Weiß nach unten, Gelb nach oben.</strong> Die fertige weiße Ebene ist ab jetzt unten. " +
        "Suche oben eine Kante <em>ohne Gelb</em> und drehe U, bis ihre Vorderfarbe zum vorderen Mittelstein passt. " +
        "Dann zeigt die obere Farbe der Kante, ob sie nach links oder nach rechts muss.</p>" +
        "<p>Achte bei den Animationen auf die weiße Ecke unter dem Zielplatz: Sie wird kurz herausgeholt und kommt mit der Kante zurück.</p>",
      cases: [
        {
          id: "kante-links",
          title: "Kante muss nach links",
          focus: "FL",
          situation:
            "Die grün-rote Kante ist oben vorne: Grün vorne passt zum Mittelstein, Rot oben gehört nach links.",
          phases: [
            {
              moves: "U'",
              title: "Kante wegdrehen",
              text: "Die obere Ebene dreht die Kante nach rechts – weg von dem linken Eckplatz, der gleich nach oben geholt wird.",
            },
            {
              moves: "L' U L",
              title: "Ecke nach oben holen",
              text: "Die linke Seite klappt kurz auf und wieder zu. Dabei kommt die weiße Ecke unter dem Ziel nach oben, und die Kante kehrt nach vorne zurück.",
            },
            {
              moves: "U",
              title: "Paar bilden",
              text: "Ein Dreh der oberen Ebene legt Ecke und Kante nebeneinander: Grün liegt bei beiden links, Rot bei beiden oben – sie bilden ein Paar.",
            },
            {
              moves: "F U' F'",
              title: "Paar einsetzen",
              text: "Die Vorderseite öffnet den Platz, U′ schiebt das Paar hinein, F′ schließt wieder. Kante und Ecke sitzen.",
            },
          ],
          done: "Kante und Ecke sitzen, die weiße Ebene ist wieder vollständig.",
        },
        {
          id: "kante-rechts",
          title: "Kante muss nach rechts",
          focus: "FR",
          situation:
            "Die grün-orange Kante ist oben vorne: Grün passt vorne, Orange oben gehört nach rechts. Alles ist spiegelbildlich zum Fall davor.",
          phases: [
            { moves: "U", title: "Kante wegdrehen", text: "Die Kante wandert nach links, weg vom rechten Eckplatz." },
            {
              moves: "R U' R'",
              title: "Ecke nach oben holen",
              text: "Die rechte Seite klappt auf und zu: Die weiße Ecke kommt nach oben, die Kante kehrt nach vorne zurück.",
            },
            {
              moves: "U'",
              title: "Paar bilden",
              text: "Ecke und Kante liegen jetzt nebeneinander rechts – Grün und Orange jeweils auf derselben Seite.",
            },
            {
              moves: "F' U F",
              title: "Paar einsetzen",
              text: "F′ öffnet, U schiebt das Paar hinein, F schließt.",
            },
          ],
          done: "Kante und Ecke sitzen.",
        },
        {
          id: "kante-verdreht",
          title: "Kante steckt verdreht im Platz",
          focus: "FR",
          situation:
            "Oben findest du keine Kante ohne Gelb mehr – die grün-orange Kante steckt zwar rechts in der mittleren Ebene, aber falsch herum.",
          phases: [
            {
              moves: "U R U' R' U' F' U F",
              title: "Kante herausholen",
              text: "Du setzt einfach irgendeine obere Kante rechts ein – dadurch kommt die verdrehte Kante nach oben.",
            },
            {
              moves: "U2",
              title: "Kante ausrichten",
              text: "Die obere Ebene dreht die Kante nach vorne, bis Grün zum grünen Mittelstein passt.",
            },
            {
              moves: "U R U' R' U' F' U F",
              title: "Neu einsetzen",
              text: "Jetzt liegt der normale Fall „Kante muss nach rechts“ vor.",
            },
          ],
          done: "Die Kante sitzt jetzt richtig herum.",
        },
        {
          id: "kanten-tausch",
          title: "Zwei Kanten vertauscht",
          focus: "FR FL",
          situation:
            "Die beiden vorderen Kanten sitzen mit Grün vorne, aber Rot und Orange sind vertauscht.",
          phases: [
            {
              moves: "F2 U2 F2 U2 F2",
              title: "Kanten tauschen",
              text: "Fünf halbe Drehungen tauschen die beiden vorderen Kanten der mittleren Ebene aus. Die weiße Ebene ist am Ende wieder intakt; die obere Ebene wird durchgemischt – das ist egal, sie ist noch nicht gelöst.",
            },
          ],
          tip: "Das ist eine Abkürzung. Du kommst auch ohne sie aus: Kante mit dem Rechts-Algorithmus herausholen und neu einsetzen.",
          done: "Beide Kanten sitzen.",
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: "gelbes-kreuz",
      number: "4",
      short: "Gelbes Kreuz",
      title: "Das gelbe Kreuz",
      goal: "Die vier oberen Kanten so drehen, dass ihr Gelb nach oben zeigt.",
      orientation: { U: "Y", F: "G" },
      mask: [
        ["context", "layer:D layer:E"],
        ["focus", "edges:U center:U", "Y"],
      ],
      intro:
        "<p>Ab jetzt wird nur noch oben gearbeitet. In diesem Schritt zählt <em>nur das Gelb der Kanten</em> – deshalb ist auf der oberen Ebene alles andere grau. " +
        "Ein einziger Algorithmus reicht: <strong>F R U R′ U′ F′</strong>. Je nachdem, was du oben siehst (Punkt, L oder Linie), wendest du ihn ein- bis dreimal an.</p>",
      cases: [
        {
          id: "kreuz-linie",
          title: "Gelbe Linie",
          situation: "Oben siehst du eine gelbe Linie. Halte sie waagerecht, also von links nach rechts.",
          phases: [
            { moves: "F", title: "Rahmen öffnen", text: "F dreht die Vorderseite – die vordere obere Kante wandert dabei auf die rechte Seite." },
            {
              moves: "R U R' U'",
              title: "Der Kern: R U R′ U′",
              text: "Diese vier Züge (oft „Sexy Move“ genannt) drehen zwei Kanten. Merke sie dir gut, sie tauchen in vielen Algorithmen auf.",
            },
            { moves: "F'", title: "Rahmen schließen", text: "F′ klappt die Vorderseite zurück – das gelbe Kreuz ist da." },
          ],
          done: "Das gelbe Kreuz ist fertig. Die Seitenfarben der Kanten sind noch egal.",
        },
        {
          id: "kreuz-l",
          title: "Gelbes L",
          situation: "Oben siehst du ein gelbes L. Halte es so, dass es nach hinten und nach links zeigt – wie die Zeiger um 9 Uhr.",
          phases: [
            { moves: "F R U R' U' F'", title: "Erster Durchgang", text: "Aus dem L wird eine waagerechte Linie." },
            { moves: "F R U R' U' F'", title: "Zweiter Durchgang", text: "Aus der Linie wird das Kreuz – genau wie im Fall davor." },
          ],
          done: "Das gelbe Kreuz ist fertig.",
        },
        {
          id: "kreuz-punkt",
          title: "Nur der gelbe Punkt",
          situation: "Oben ist nur der Mittelstein gelb, keine Kante zeigt Gelb nach oben.",
          phases: [
            { moves: "F R U R' U' F'", title: "Erster Durchgang", text: "Aus dem Punkt entsteht ein L." },
            { moves: "U2", title: "L ausrichten", text: "Drehe die obere Ebene, bis das L nach hinten links zeigt." },
            { moves: "F R U R' U' F'", title: "Zweiter Durchgang", text: "Aus dem L wird eine Linie." },
            { moves: "F R U R' U' F'", title: "Dritter Durchgang", text: "Aus der Linie wird das Kreuz." },
          ],
          done: "Spätestens nach drei Durchgängen steht immer das Kreuz.",
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: "gelbe-flaeche",
      number: "5",
      short: "Gelbe Fläche",
      title: "Die gelbe Fläche",
      goal: "Die Ecken so drehen, dass die ganze Oberseite gelb ist.",
      orientation: { U: "Y", F: "G" },
      mask: [
        ["context", "layer:D layer:E"],
        ["context", "edges:U center:U", "Y"],
        ["focus", "corners:U", "Y"],
      ],
      intro:
        "<p>Jetzt zählt nur, <em>wohin das Gelb der Ecken zeigt</em> – auch an den Seiten. Darum sind dort nur die gelben Sticker farbig. " +
        "Der Algorithmus heißt „Sune“: <strong>R U R′ U R U2 R′</strong>. " +
        "Merkhilfe: rechts hoch, oben, rechts runter, oben, rechts hoch, oben doppelt, rechts runter.</p>",
      cases: [
        {
          id: "flaeche-fisch",
          title: "Fisch – genau eine gelbe Ecke oben",
          situation: "Genau eine Ecke zeigt Gelb nach oben – das sieht aus wie ein Fisch. Halte diese Ecke vorne links.",
          phases: [
            { moves: "R U R'", title: "Rechts hoch, oben, rechts runter", text: "Die erste Hälfte. Achte darauf, wie die gelben Sticker der rechten Ecken mitwandern." },
            { moves: "U", title: "Oben", text: "Ein einzelner Dreh der oberen Ebene trennt die beiden Hälften." },
            { moves: "R U2 R'", title: "Rechts hoch, oben doppelt, rechts runter", text: "Die zweite Hälfte – danach zeigen alle Ecken Gelb nach oben." },
          ],
          done: "Die Oberseite ist komplett gelb.",
        },
        {
          id: "flaeche-keine",
          title: "Keine Ecke zeigt Gelb nach oben",
          situation:
            "Keine Ecke ist oben gelb. Drehe U so, dass die Ecke vorne links ihr Gelb nach <em>links</em> zeigt.",
          phases: [
            { moves: "R U R' U R U2 R'", title: "Erster Sune", text: "Danach siehst du einen Fisch – genau eine Ecke ist oben gelb." },
            { moves: "U", title: "Fisch ausrichten", text: "Die gelbe Ecke nach vorne links drehen." },
            { moves: "R U R' U R U2 R'", title: "Zweiter Sune", text: "Der Fisch-Fall – die Fläche wird komplett gelb." },
          ],
          tip:
            "Zeigen zwei Ecken Gelb nach oben, halte den Würfel so, dass die Ecke vorne links ihr Gelb nach <em>vorne</em> zeigt, und führe Sune aus.",
          done: "Die Oberseite ist komplett gelb.",
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: "kanten-oben",
      number: "6",
      short: "Kanten oben",
      title: "Die oberen Kanten sortieren",
      goal: "Die Kanten der oberen Ebene an ihre Plätze bringen – ihre Seitenfarbe passt dann zum Mittelstein.",
      orientation: { U: "Y", F: "G" },
      mask: [
        ["context", "layer:D layer:E"],
        ["context", "corners:U", "Y"],
        ["focus", "edges:U"],
      ],
      intro:
        "<p>Die gelbe Fläche ist fertig. Jetzt kommt es auf die <em>Seitenfarben der Kanten</em> an – die Ecken sind in diesem Schritt egal und deshalb seitlich grau. " +
        "Drehe U, bis mindestens eine Kante zu ihrem Mittelstein passt, und halte sie <strong>vorne</strong>. Die übrigen drei Kanten tauscht der Algorithmus im Kreis.</p>",
      cases: [
        {
          id: "kanten-im-uhrzeigersinn",
          title: "Drei Kanten im Uhrzeigersinn tauschen",
          situation:
            "Die vordere Kante (Grün) passt. Rechts, links und hinten sitzen die Kanten so, dass sie – von oben gesehen – im Uhrzeigersinn weiter müssen.",
          phases: [
            {
              moves: "R' U R' U' R' U' R' U R U R2",
              title: "Drei Kanten im Kreis tauschen",
              text: "Unterwegs wird viel durcheinandergewirbelt – am Ende sind nur die drei Kanten weitergewandert. Ecken und untere Ebenen stehen wieder an ihrem Platz.",
            },
          ],
          done: "Alle Kanten passen zu ihren Mittelsteinen.",
        },
        {
          id: "kanten-gegen-uhrzeigersinn",
          title: "Andere Richtung: zweimal anwenden",
          situation: "Wieder passt nur die vordere Kante, die drei anderen müssen aber gegen den Uhrzeigersinn weiter.",
          phases: [
            { moves: "R' U R' U' R' U' R' U R U R2", title: "Erster Durchgang", text: "Die Kanten wandern einen Schritt – allerdings in die „falsche“ Richtung." },
            { moves: "R' U R' U' R' U' R' U R U R2", title: "Zweiter Durchgang", text: "Ein zweiter Durchgang mit derselben Kante vorne bringt alle an ihren Platz." },
          ],
          tip: "Passt anfangs keine einzige Kante, wende den Algorithmus einmal von beliebiger Seite an – danach passt eine.",
          done: "Alle Kanten passen.",
        },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: "ecken-oben",
      number: "7",
      short: "Ecken oben",
      title: "Die letzten Ecken – Würfel gelöst",
      goal: "Die gelben Ecken an ihre Plätze bringen.",
      orientation: { U: "G", F: "Y" },
      mask: [
        ["context", "all"],
        ["focus", "corners:F"],
      ],
      intro:
        "<p>Für diesen Algorithmus hältst du den Würfel anders: <strong>Gelb zeigt zu dir (vorne), Grün nach oben.</strong> " +
        "Dann bestehen die Züge nur aus R, U und D – die gehen besonders flüssig von der Hand. " +
        "Suche eine Ecke, die schon an ihrem Platz sitzt, und halte sie <em>oben links</em>.</p>",
      cases: [
        {
          id: "ecken-einmal",
          title: "Drei Ecken im Kreis tauschen",
          situation: "Die Ecke oben links auf der gelben Seite sitzt richtig. Die anderen drei müssen im Kreis getauscht werden.",
          phases: [
            { moves: "R U' R D2", title: "Erste Hälfte", text: "Merke dir den Rhythmus: R, U′, R, D2." },
            { moves: "R' U R D2 R2", title: "Zweite Hälfte", text: "Fast dasselbe gespiegelt – R′, U, R, D2 – und zum Schluss R2. Dabei sind drei Ecken einen Platz weitergewandert." },
          ],
          done: "Der Würfel ist gelöst!",
        },
        {
          id: "ecken-zweimal",
          title: "Andere Richtung: zweimal anwenden",
          situation: "Wieder sitzt die Ecke oben links, die drei anderen müssen aber in die andere Richtung.",
          phases: [
            { moves: "R U' R D2 R' U R D2 R2", title: "Erster Durchgang", text: "Die drei Ecken wandern einen Platz weiter – noch nicht am Ziel." },
            { moves: "R U' R D2 R' U R D2 R2", title: "Zweiter Durchgang", text: "Mit derselben Haltung noch einmal – jetzt sitzen alle." },
          ],
          tip: "Sitzt anfangs keine Ecke richtig, führe den Algorithmus einmal aus. Danach sitzt mindestens eine.",
          done: "Der Würfel ist gelöst!",
        },
      ],
    },
  ],
});
