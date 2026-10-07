import type { ScenarioDefinition } from "../../simulation";
import { strasbourgNodes } from "./nodes";
import { strasbourgEffects } from "./effects";
import { strasbourgEvents } from "./events";
import { strasbourgDilemmas } from "./dilemmas";

// Historical references and balance evidence: README.md.
export const strasbourgScenario = {
  schemaVersion: 3,
  id: "strasbourg-common-table-1523",
  title: "Strasbourg: The Common Table",
  description:
    "Strasbourg, 1523. Preaching, inherited worship, civic authority, and household obligations pull the emerging evangelical church in different directions. Lead its common work toward a review from 1548 onward: twenty-five annual turns, with pending decisions potentially delaying the conclusion. Balance Money and Authority across teaching, relief, conscience, and outside relations. The named people and dated references belong to documented history; playable incidents are fictional local pressures, not scheduled reenactments. Constituency shares and all numeric values are design abstractions. The opening’s modest deficit makes reform necessary, but a warning gives time to recover.",
  start: {
    turn: 0,
    year: 1523,
  },
  historicalActors: [
    {
      id: "martin-bucer",
      name: "Martin Bucer",
      role: "Reformer, pastor, and mediator",
      description:
        "Worked in Strasbourg from 1523 to 1549, connecting pastoral care, church order, and evangelical reconciliation. His departure lies beyond the nominal campaign. Historical biography, not a continuously present adviser.",
    },
    {
      id: "wolfgang-capito",
      name: "Wolfgang Capito",
      role: "Humanist theologian and Strasbourg reformer",
      description:
        "Settled in Strasbourg in 1523, collaborated on the Tetrapolitan Confession and Wittenberg Concord, and died in the plague of 1541. His theological openness was not agreement with every dissenter.",
    },
    {
      id: "katharina-zell",
      name: "Katharina Schütz Zell",
      role: "Lay writer and organizer of hospitality",
      description:
        "Published a defense of clerical marriage in 1524 and worked with displaced and needy people. Her hospitality crossed religious disagreements without erasing her own convictions.",
    },
    {
      id: "matthaus-zell",
      name: "Matthäus Zell",
      role: "Cathedral preacher and pastoral host",
      description:
        "An early evangelical preacher whose household with Katharina became a place of refuge. He died in 1548; fictional incidents refer to pastoral pressures, not invented late meetings with him.",
    },
    {
      id: "jakob-sturm",
      name: "Jakob Sturm von Sturmeck",
      role: "Civic statesman",
      description:
        "Entered Strasbourg’s council in 1524 and presided over the 1533 synod. He connected religious settlement with civic security and diplomacy. He is not Johannes Sturm, the educator.",
    },
    {
      id: "caspar-hedio",
      name: "Caspar Hedio",
      role: "Preacher, scholar, and reformer",
      description:
        "Worked alongside Bucer, Capito, and Zell in Strasbourg’s evangelical reform. His work anchors the link between public teaching and the ordinary life of congregations.",
    },
    {
      id: "pilgram-marpeck",
      name: "Pilgram Marpeck",
      role: "Engineer and Anabaptist theologian",
      description:
        "Became a Strasbourg citizen in 1528 and worked on timber provision. Hearings in 1531–1532 preceded his exclusion. His Anabaptist community is not interchangeable with Hoffman’s following.",
    },
    {
      id: "caspar-schwenckfeld",
      name: "Caspar Schwenckfeld",
      role: "Spiritualist theologian",
      description:
        "Left Silesia in 1529 and spent time in Strasbourg’s religious networks. His emphasis on inward faith provides a historical reference for disagreement with compulsory outward formulas.",
    },
    {
      id: "melchior-hoffman",
      name: "Melchior Hoffman",
      role: "Apocalyptic preacher",
      description:
        "Associated Strasbourg with his apocalyptic expectations and was imprisoned there in 1533. His movement must not stand for every Anabaptist; the game does not reproduce his predictions as facts.",
    },
    {
      id: "john-calvin",
      name: "John Calvin",
      role: "Pastor of the French congregation, 1538–1541",
      description:
        "Served French-speaking refugees during his Strasbourg years and worked with its reformers. He is a later historical reference, not a pastor already resident in the 1523 opening.",
    },
    {
      id: "johannes-sturm",
      name: "Johannes Sturm",
      role: "Humanist educator",
      description:
        "Led the Gymnasium founded in 1538. He is distinct from Jakob Sturm; the school serves as a historical reference for costly, sustained educational provision.",
    },
    {
      id: "wilhelm-von-hohnstein",
      name: "Wilhelm von Hohnstein",
      role: "Bishop of Strasbourg",
      description:
        "Opposed the city’s evangelical changes while municipal institutions took a growing role in religious affairs. The bishop, Cathedral Chapter, convents, and Catholic laity are not one actor.",
    },
    {
      id: "martin-luther",
      name: "Martin Luther",
      role: "Wittenberg reformer",
      description:
        "His writings and sacramental convictions shaped Strasbourg’s debates. Marburg in 1529 and the Wittenberg Concord in 1536 illustrate the limits and possibilities of evangelical agreement.",
    },
    {
      id: "philipp-melanchthon",
      name: "Philipp Melanchthon",
      role: "Theologian and negotiator",
      description:
        "A leading voice in the Augsburg Confession of 1530 and evangelical negotiations. He appears as historical context for the work of finding shared doctrinal language.",
    },
    {
      id: "philip-of-hesse",
      name: "Philip of Hesse",
      role: "Evangelical prince and alliance leader",
      description:
        "Hosted the Marburg Colloquy in 1529 and became a leading figure in the Schmalkaldic League. Princely protection brought political obligations, not unconditional security.",
    },
    {
      id: "charles-v",
      name: "Charles V",
      role: "Holy Roman Emperor",
      description:
        "Imperial victory in the Schmalkaldic War preceded the Augsburg Interim of 1548. His authority supplies historical context for outside pressure; the player does not control imperial policy or military campaigns.",
    },
  ],
  factionMetrics: [
    {
      id: "membership",
      label: "Membership",
    },
    {
      id: "satisfaction",
      label: "Satisfaction",
    },
  ],
  factionGroups: [
    {
      id: "evangelicals",
      name: "Evangelical Parishioners",
      description:
        "Households attached to evangelical preaching; neither a unified party nor identical with the pastors.",
      metrics: {
        membership: "evangelicals-membership",
        satisfaction: "evangelicals-satisfaction",
      },
    },
    {
      id: "traditionalists",
      name: "Adherents of the Old Faith",
      description:
        "Lay households attached to inherited Catholic worship; distinct from the Cathedral Chapter and convents.",
      metrics: {
        membership: "traditionalists-membership",
        satisfaction: "traditionalists-satisfaction",
      },
    },
    {
      id: "anabaptists",
      name: "Anabaptist Congregations",
      description:
        "Later-emerging congregations, including the milieu of Pilgram Marpeck. This group does not equate all Anabaptists with Melchior Hoffman or Münster.",
      metrics: {
        membership: "anabaptists-membership",
        satisfaction: "anabaptists-satisfaction",
      },
    },
    {
      id: "spiritualists",
      name: "Spiritualist Circles",
      description:
        "A simplified constituency around inward religious conviction, with Caspar Schwenckfeld as a historical reference; not a single organized church.",
      metrics: {
        membership: "spiritualists-membership",
        satisfaction: "spiritualists-satisfaction",
      },
    },
    {
      id: "magistrat",
      name: "Strasbourg Magistrat",
      description:
        "Municipal governors and their supporting networks. Membership is constituency presence, not the proportion of residents holding office.",
      metrics: {
        membership: "magistrat-membership",
        satisfaction: "magistrat-satisfaction",
      },
    },
    {
      id: "cathedral-chapter",
      name: "Cathedral Chapter",
      description:
        "The cathedral’s corporate clerical institution and its supporting network; not a synonym for all Catholic households.",
      metrics: {
        membership: "cathedral-chapter-membership",
        satisfaction: "cathedral-chapter-satisfaction",
      },
    },
    {
      id: "pastors",
      name: "Evangelical Pastors",
      description:
        "Preachers and the networks sustaining their ministry, including the historical work of Bucer, Capito, Hedio, and Zell.",
      metrics: {
        membership: "pastors-membership",
        satisfaction: "pastors-satisfaction",
      },
    },
    {
      id: "guilds",
      name: "Guild Households",
      description:
        "Artisan households balancing religious conviction, assessments, common provision, and neighborhood peace.",
      metrics: {
        membership: "guilds-membership",
        satisfaction: "guilds-satisfaction",
      },
    },
    {
      id: "merchants",
      name: "Merchant Households",
      description:
        "Households dependent on trade and reliable civic arrangements, with diverse religious loyalties.",
      metrics: {
        membership: "merchants-membership",
        satisfaction: "merchants-satisfaction",
      },
    },
    {
      id: "french-refugees",
      name: "French-speaking Refugee Households",
      description:
        "A later-emerging constituency. Calvin’s Strasbourg congregation of 1538–1541 is a historical reference, not a turn-zero institution.",
      metrics: {
        membership: "french-refugees-membership",
        satisfaction: "french-refugees-satisfaction",
      },
    },
    {
      id: "dominican-convents",
      name: "Dominican Convent Communities",
      description:
        "Communities defending inherited religious life and property; their concerns cannot be reduced to the bishop’s position.",
      metrics: {
        membership: "dominican-convents-membership",
        satisfaction: "dominican-convents-satisfaction",
      },
    },
    {
      id: "rural-parishes",
      name: "Connected Rural Parishioners",
      description:
        "Households in congregations linked to Strasbourg’s ministry, not a claim of rule over all rural Alsace.",
      metrics: {
        membership: "rural-parishes-membership",
        satisfaction: "rural-parishes-satisfaction",
      },
    },
  ],
  constraints: [
    {
      id: "religious-households",
      kind: "sum-limit",
      maxTotal: 1,
      name: "Religious household constituency shares",
    },
  ],
  gameOvers: [
    {
      id: "common-insolvency",
      title: "The Common Ministry Loses Its Credit",
      prerequisiteGroups: [
        {
          id: "common-insolvency",
          title: "The Common Ministry Loses Its Credit",
          allOf: [
            {
              kind: "node-value",
              nodeId: "money",
              comparison: "at-most",
              value: 0,
            },
          ],
        },
      ],
      terminalAfterTurns: 5,
      stages: [
        {
          id: "warning",
          atTurn: 1,
          title: "The Common Ministry Loses Its Credit",
          description:
            "Money is at or below zero. Reduce recurring commitments or increase receipts; recover before five consecutive insolvent turns pass.",
        },
        {
          id: "renewed-warning",
          atTurn: 3,
          title: "Common Work Is Still at Risk",
          description:
            "The same danger has persisted for three turns. Two further qualifying turns will end this leadership; recovery still ends this crisis episode.",
        },
        {
          id: "last-opportunity",
          atTurn: 4,
          title: "One More Opportunity to Recover",
          description:
            "Another qualifying turn ends the common institution. The warning itself imposes no additional cost.",
        },
      ],
      recovery: {
        title: "Room to Continue",
        description:
          "The threatened value has risen above its danger threshold. This crisis episode ends without a reward or extra penalty; continue addressing its causes.",
      },
      report: {
        title: "The Common Ministry Loses Its Credit",
        narrative:
          "The common church cannot honor its financial commitments. Congregations and stewards fall back on separate arrangements, ending the shared institution you led. Religious life continues, but its common provision has failed.",
      },
    },
    {
      id: "withdrawn-confidence",
      title: "The City Withdraws Its Confidence",
      prerequisiteGroups: [
        {
          id: "withdrawn-confidence",
          title: "The City Withdraws Its Confidence",
          allOf: [
            {
              kind: "node-value",
              nodeId: "civic-trust",
              comparison: "at-most",
              value: 0.3,
            },
          ],
        },
      ],
      terminalAfterTurns: 5,
      stages: [
        {
          id: "warning",
          atTurn: 1,
          title: "The City Withdraws Its Confidence",
          description:
            "Civic Trust is at or below 0.30. Restore reliable care, accounts, or parish peace before five consecutive qualifying turns pass.",
        },
        {
          id: "renewed-warning",
          atTurn: 3,
          title: "Common Work Is Still at Risk",
          description:
            "The same danger has persisted for three turns. Two further qualifying turns will end this leadership; recovery still ends this crisis episode.",
        },
        {
          id: "last-opportunity",
          atTurn: 4,
          title: "One More Opportunity to Recover",
          description:
            "Another qualifying turn ends the common institution. The warning itself imposes no additional cost.",
        },
      ],
      recovery: {
        title: "Room to Continue",
        description:
          "The threatened value has risen above its danger threshold. This crisis episode ends without a reward or extra penalty; continue addressing its causes.",
      },
      report: {
        title: "The City Withdraws Its Confidence",
        narrative:
          "The Magistrat and parish networks no longer accept the common leadership as a credible partner. They establish other arrangements. Your failure is institutional, not a claim that one religious constituency has disappeared.",
      },
    },
    {
      id: "broken-communion",
      title: "Congregations Leave the Common Church",
      prerequisiteGroups: [
        {
          id: "broken-communion",
          title: "Congregations Leave the Common Church",
          allOf: [
            {
              kind: "node-value",
              nodeId: "church-unity",
              comparison: "at-most",
              value: 0.38,
            },
          ],
        },
      ],
      terminalAfterTurns: 5,
      stages: [
        {
          id: "warning",
          atTurn: 1,
          title: "Congregations Leave the Common Church",
          description:
            "Church Unity is at or below 0.38. Improve pastoral provision or calm confessional conflict before five consecutive qualifying turns pass.",
        },
        {
          id: "renewed-warning",
          atTurn: 3,
          title: "Common Work Is Still at Risk",
          description:
            "The same danger has persisted for three turns. Two further qualifying turns will end this leadership; recovery still ends this crisis episode.",
        },
        {
          id: "last-opportunity",
          atTurn: 4,
          title: "One More Opportunity to Recover",
          description:
            "Another qualifying turn ends the common institution. The warning itself imposes no additional cost.",
        },
      ],
      recovery: {
        title: "Room to Continue",
        description:
          "The threatened value has risen above its danger threshold. This crisis episode ends without a reward or extra penalty; continue addressing its causes.",
      },
      report: {
        title: "Congregations Leave the Common Church",
        narrative:
          "Congregations cease to use common institutions to settle disagreement and sustain ministry. Separate arrangements replace the church you led; neither teaching nor charity has vanished, but its common structure has dissolved.",
      },
    },
  ],
  completion: {
    prerequisiteGroups: [
      {
        id: "review-from-1548",
        title: "The Long Review, from 1548",
        description:
          "After twenty-five annual turns, review the common church once outstanding decisions permit completion. This review does not announce that the historical Augsburg Interim has occurred in play.",
        allOf: [
          {
            kind: "turn",
            atTurn: 25,
          },
        ],
      },
    ],
    endings: [
      {
        id: "a-church-of-refuge",
        title: "A Church of Refuge",
        priority: 40,
        prerequisiteGroups: [
          {
            id: "a-church-of-refuge",
            title: "A Church of Refuge",
            allOf: [
              {
                kind: "node-value",
                nodeId: "religious-forbearance",
                comparison: "at-least",
                value: 0.75,
              },
              {
                kind: "node-value",
                nodeId: "refugee-integration",
                comparison: "at-least",
                value: 0.58,
              },
              {
                kind: "node-value",
                nodeId: "relief-reach",
                comparison: "at-least",
                value: 0.55,
              },
              {
                kind: "node-value",
                nodeId: "anabaptists-satisfaction",
                comparison: "at-least",
                value: 0.55,
              },
              {
                kind: "node-value",
                nodeId: "church-unity",
                comparison: "at-least",
                value: 0.52,
              },
              {
                kind: "node-value",
                nodeId: "money",
                comparison: "at-least",
                value: 10,
              },
            ],
          },
        ],
        narrative:
          "At the long review, the accounts contain obligations to strangers as well as familiar parish households. Hospitality has become common provision, and peaceful dissent need not mean exclusion from ordinary companionship. The price is sustained coordination and fewer resources for other ambitions. This alternate settlement is not a claim that historical Strasbourg granted general religious liberty.",
      },
      {
        id: "a-city-in-concord",
        title: "A City in Concord",
        priority: 30,
        prerequisiteGroups: [
          {
            id: "a-city-in-concord",
            title: "A City in Concord",
            allOf: [
              {
                kind: "node-value",
                nodeId: "teaching-quality",
                comparison: "at-least",
                value: 0.6,
              },
              {
                kind: "node-value",
                nodeId: "external-security",
                comparison: "at-least",
                value: 0.65,
              },
              {
                kind: "node-value",
                nodeId: "church-unity",
                comparison: "at-least",
                value: 0.62,
              },
              {
                kind: "node-value",
                nodeId: "money",
                comparison: "at-least",
                value: 10,
              },
            ],
          },
        ],
        narrative:
          "Prepared teachers and useful external relationships leave the common church able to explain its commitments and negotiate its place. The historical Wittenberg Concord remains a reference, not an event your treasury purchased. Your institution has made cooperation durable without resolving every sacramental disagreement; it must continue paying for the people who sustain that work.",
      },
      {
        id: "the-magistrates-church",
        title: "The Magistrat’s Church",
        priority: 20,
        prerequisiteGroups: [
          {
            id: "the-magistrates-church",
            title: "The Magistrat’s Church",
            allOf: [
              {
                kind: "node-value",
                nodeId: "council-oversight",
                comparison: "at-least",
                value: 0.75,
              },
              {
                kind: "node-value",
                nodeId: "worship-reform",
                comparison: "at-least",
                value: 0.7,
              },
              {
                kind: "node-value",
                nodeId: "civic-trust",
                comparison: "at-least",
                value: 0.57,
              },
              {
                kind: "node-value",
                nodeId: "evangelicals-satisfaction",
                comparison: "at-least",
                value: 0.65,
              },
              {
                kind: "node-value",
                nodeId: "money",
                comparison: "at-least",
                value: 10,
              },
            ],
          },
        ],
        narrative:
          "The common church emerges with clear evangelical direction and dependable civic support. Parish practice is easier to coordinate, but pastors and independent congregations remember the limits imposed on them. The settlement secures an institution, not unanimous consent. Its success cannot be taken as proof that dissenting consciences ceased to matter.",
      },
      {
        id: "a-negotiated-church",
        title: "A Negotiated Church",
        priority: 10,
        prerequisiteGroups: [
          {
            id: "a-negotiated-church",
            title: "A Negotiated Church",
            allOf: [
              {
                kind: "node-value",
                nodeId: "church-unity",
                comparison: "at-least",
                value: 0.55,
              },
              {
                kind: "node-value",
                nodeId: "civic-trust",
                comparison: "at-least",
                value: 0.48,
              },
              {
                kind: "node-value",
                nodeId: "money",
                comparison: "at-least",
                value: 10,
              },
            ],
          },
        ],
        narrative:
          "The review finds a church still able to gather, teach, provide care, and negotiate its differences. It has neither the widest refuge nor the most confident diplomatic position, but its obligations remain credible. Different constituencies carry different memories of your choices. The work passes to successors with room for further change.",
      },
    ],
    fallbackEnding: {
      id: "unfinished-settlement",
      title: "An Unfinished Settlement",
      narrative:
        "The long review finds common work still standing, but without enough trust or financial room for a durable settlement. Some households have found refuge, others instruction, and others a reason to withdraw. Your successors inherit these unequal gains and unresolved obligations. This alternate outcome is not a historical verdict on Strasbourg in 1548.",
    },
    reportNodeIds: [
      "money",
      "authority",
      "church-unity",
      "civic-trust",
      "teaching-quality",
      "relief-reach",
      "external-security",
      "refugee-integration",
      "household-hardship",
      "anabaptists-satisfaction",
      "traditionalists-satisfaction",
    ],
  },
  nodes: strasbourgNodes,
  effects: strasbourgEffects,
  events: strasbourgEvents,
  dilemmas: strasbourgDilemmas,
} satisfies ScenarioDefinition;
