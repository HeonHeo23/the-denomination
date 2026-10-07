# Strasbourg: The Common Table, 1523–1548

Lead a fictional common church from 1523 toward a review eligible in 1548
(turn 25). Outstanding Dilemmas can postpone completion. Content version 2
contains 86 nodes: 24 Stances, 24 Indicators, 24 Faction metrics in 12 groups,
12 Situations, and exactly two Resources, **Money** and **Authority**. There are
209 Effects, 24 Events, 30 Dilemmas, and 16 historical actors.

`index.ts` assembles static definitions from `nodes.ts`, `effects.ts`, `events.ts`,
and `dilemmas.ts`. The resulting object is JSON-compatible and uses schema 3.
The catalog version rejects earlier Strasbourg saves; no migration is provided.

## History and adaptation

Each incident separates a **Historical reference** from a **Fictional playable
situation**. A historical date identifies its source context, not the current
simulation year. No incident announces that a named historical event has taken
place in this campaign, and no dialogue is presented as an authentic quotation.
The biographical roster covers the whole period, not advisers continuously
resident or alive throughout it.

| Historical reference                                              | Basis for playable pressures                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Katharina Zell’s marriage defense and Kenzingen hospitality, 1524 | Married ministry, household provision, and religious hospitality          |
| St. Aurelia’s call to Bucer, 1524; Peasants’ War in Alsace, 1525  | Parish appointments, rural petitions, and ministry beyond the city        |
| Suspension of the Mass and Marburg Colloquy, 1529                 | Inherited worship, devotional images, and sacramental disagreement        |
| Tetrapolitan Confession, 1530                                     | Shared teaching and the cost of requiring subscription                    |
| Schmalkaldic League and Kirchenpfleger, 1531                      | External obligations and lay oversight                                    |
| Marpeck’s hearings and exclusion, 1531–1532                       | Useful work, civic employment, and religious conscience                   |
| Strasbourg synod, 1533; church ordinance, 1534                    | Common government, visitation, and local accommodations                   |
| Wittenberg Concord, 1536                                          | Diplomatic cooperation without eliminating doctrinal disagreement         |
| Gymnasium, 1538; Calvin’s French congregation, 1538–1541          | Sustained education and ministry in refugees’ language                    |
| Plague, 1541; Schmalkaldic War, 1546–1547; Augsburg Interim, 1548 | Care burdens, insecure connections, and pressure from outside authorities |

Sources:

- [Electronic Capito Project chronology](https://capito.iterpubs.org/wolfgang-faber-capito-chronology/):
  Capito, the confessions, synod, Concord, and his death in 1541.
- [Musée protestant: The Reformation in Alsace](https://museeprotestant.org/en/notice/the-reformation-in-alsace/):
  Strasbourg’s Magistrat, chapters, St. Aurelia, rural reform, printing, and schooling.
- [Elsie McKee: Catharina Zell](https://www.alsace-histoire.org/netdba/zell-catharina-nee-schutz/)
  and [Zell’s 1524 defense of clerical marriage](https://germanhistorydocs.org/en/from-the-reformations-to-the-thirty-years-war-1500-1648/ghdi:document-4332):
  household ministry, hospitality, and the published defense.
- [Neal Blough: Pilgram Marpeck](https://www.alsace-histoire.org/netdba/marpeck-marbeck-pilgram/):
  civic work and the 1531–1532 proceedings; his community is distinct from
  Hoffman’s movement.
- [Thomas A. Brady: Jakob Sturm](https://www.alsace-histoire.org/netdba/sturm-von-sturmeck-jacob/)
  and [Alsatian historical dictionary: Bucer](https://www.alsace-histoire.org/netdba/bucer-bucerus-bucaerus-butzer-buczer-boukeros/):
  council, diplomacy, Kirchenpfleger, church order, and imperial pressure.
- [Strasbourg University Press: Calvin in Strasbourg](https://pus.unistra.fr/ouvrage/9782868204035/):
  the French congregation and Calvin’s 1538–1541 residence.
- [Deutsche Biographie: Schwenckfeld](https://www.deutsche-biographie.de/sfz79759.html)
  and [Hoffman](https://www.deutsche-biographie.de/gnd118552716.html):
  distinct strands of religious dissent, not one interchangeable radical faction.
- [German History in Documents and Images: volume introduction](https://germanhistorydocs.ghi-dc.org/pdf/eng/GHDI_volume_1_Intro_.pdf):
  civic institutions, the Peasants’ War, and Strasbourg’s resistant Dominican convents.

The player coordinates a church’s relationships with these institutions, not
an entire city-state, army, or empire. Membership is an abstract constituency
share; institutional groups include supporting networks. Social and religious
groups overlap. Only the four theological membership nodes share a sum cap of 1.
Anabaptist, Spiritualist, and French-refugee memberships start at zero; subsequent
small policy-dependent growth is not a reconstruction of dated population change.

## Balance choices

- **A correctable deficit:** 65 Money and 45 Authority give room to act. Starting
  recurring commitments exceed receipts by approximately 3.5 Money per turn.
  Assessments and endowment redirection increase income but damage different
  constituencies; retrenchment preserves those relationships at a service cost.
- **Benefits arrive later:** institutional and membership Effects generally use
  2–4-turn Inertia. Funded programs have rising marginal costs (`value ** 1.5`),
  so fully funding every program is unsustainable. Annual receipts and commitments
  reach Money through the next snapshot.
- **Different kinds of control:** foundational positions remain forced active.
  Fourteen funded programs can be repealed or enacted for 3 or 5 Authority.
  Adjustments cost `1 + 10 × absolute change`, with a 0.25 maximum per action.
  Repeal preserves the stored value and never refunds expenditure.
- **Connected constituencies:** satisfaction affects protection, coverage, public
  order, legitimacy, unity, and receipts. Membership uses small delayed target
  changes, not compounding growth. Faction preference is not a moral judgment.
- **Recovery before defeat:** Money at or below 0, Civic Trust at or below 0.30,
  or Church Unity at or below 0.38 must persist for five consecutive turns to end
  play. Warnings on turns 1, 3, and 4 add no penalties. Recovery ends the episode
  without an exploitable reward.
- **Conditional incidents:** six Dilemmas are initially eligible; the rest depend
  on policy and causal state. Dilemma cooldowns are 100 turns, beyond the maximum
  55-turn completion delay from this 30-choice pool. Events have a five-turn
  cooldown, meaning at least six turns between occurrences. Grudges decay at 0.6.
  Expensive choices may overdraw Resources under existing consequence rules;
  each dilemma also offers responses without a Money debit.
- **Distinct settlements:** refuge, concord, civic establishment, and negotiated
  continuity have separate requirements; all require a remaining Money reserve.
  An institution can survive yet receive the unfinished-settlement fallback.

## Validation and limits

The scenario tests cover four strategies across 64 seeds and three choice styles
(768 campaigns), legal reachability of all 54 incidents, all conditional endings,
crisis recovery and abandonment, policy costs, enactment/repeal, simultaneous
Events, delayed responses, Effect-order independence, and 100-turn persistent
stability. Reference strategies use 7–10 Stance actions and leave more than ten
turns without policy adjustments. Their fiscal approaches include both stronger
collections and reduced spending; they do not achieve universal satisfaction.

| Tested strategy         | Final Money across 192 runs | Stance actions |
| ----------------------- | --------------------------- | -------------- |
| Charitable hospitality  | 25.97–75.22                 | 10             |
| Education and diplomacy | 13.94–68.44                 | 10             |
| Civic establishment     | 25.08–74.94                 | 9              |
| Negotiated pluralism    | 23.90–55.21                 | 7              |

All reference runs reached their corresponding ending at turn 25. With policies
untouched, the three tested choice styles ended in insolvency on turns 15 or 23.
The recovery tests restore solvency in three turns and civic confidence and
church unity in four, before the fifth qualifying turn would become terminal.

Historical names and institutions are researched; numerical values, local
petitions, choices, and endings are authored abstractions. No historical calendar,
population subsystem, voting system, or military model is added. Stability tests
isolate persistent dynamics from incidents and terminal outcomes; seeded campaign
tests exercise the full scenario. These checks do not prove the absence of every
dominant strategy. Policy-sensitive incident selection and temporary consequences
can change results, and membership shares are not census estimates.

Mechanics follow `GAME_DESIGN.md` (nodes, Effects, Inertia, Incidents, Consequences,
Game Overs, and completion), with the canonical representation in `DATA_FORMAT.md`.
