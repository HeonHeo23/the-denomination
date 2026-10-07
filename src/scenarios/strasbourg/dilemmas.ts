import type { DilemmaDefinition } from "../../simulation";

export const strasbourgDilemmas = [
  {
    kind: "dilemma",
    id: "married-ministry",
    title: "A Defense of Married Ministry",
    description:
      "Historical reference: Katharina Schütz Zell defended clerical marriage in print in 1524. Fictional playable situation: A printer seeks support for a defense of married clergy; anxious parish households ask for a hearing. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "clerical-marriage",
        coefficient: 1,
      },
      {
        source: "teaching-quality",
        coefficient: 0.2,
      },
    ],
    threshold: 0.58,
    cooldownTurns: 100,
    choices: [
      {
        id: "print",
        label: "Support the defense",
        description:
          "Pay 5 Money; evangelical confidence rises but old-faith households feel dismissed.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: 0.09,
            decay: 0.6,
            label: "A defense circulated",
          },
          {
            kind: "grudge",
            target: "traditionalists-satisfaction",
            magnitude: -0.05,
            decay: 0.6,
            label: "Inherited expectations challenged",
          },
        ],
      },
      {
        id: "hear",
        label: "Hold parish conversations",
        description:
          "Spend 3 Authority to improve teaching and reassure old-faith neighbors.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "teaching-quality",
            magnitude: 0.05,
            decay: 0.6,
            label: "Questions heard in person",
          },
          {
            kind: "grudge",
            target: "traditionalists-satisfaction",
            magnitude: 0.03,
            decay: 0.6,
            label: "A patient hearing",
          },
        ],
      },
      {
        id: "private",
        label: "Leave publication to private sponsors",
        description:
          "Preserve funds; pastors lose confidence in official support while the Chapter welcomes restraint.",
        consequences: [
          {
            kind: "grudge",
            target: "pastors-satisfaction",
            magnitude: -0.07,
            decay: 0.6,
            label: "Official support withheld",
          },
          {
            kind: "grudge",
            target: "cathedral-chapter-satisfaction",
            magnitude: 0.04,
            decay: 0.6,
            label: "Institutional restraint",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "kenzingen-hospitality",
    title: "Hospitality at the Common Table",
    description:
      "Historical reference: The Zells sheltered displaced believers from Kenzingen in 1524. Fictional playable situation: Displaced households need food before their beliefs have been examined. Existing hosts cannot carry every obligation. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "refugee-reception",
        coefficient: 1,
      },
      {
        source: "relief-reach",
        coefficient: 0.2,
      },
    ],
    threshold: 0.58,
    cooldownTurns: 100,
    choices: [
      {
        id: "lodging",
        label: "Fund common lodging",
        description: "Pay 6 Money to improve integration and relief.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "refugee-integration",
            magnitude: 0.08,
            decay: 0.6,
            label: "Lodging without delay",
          },
          {
            kind: "grudge",
            target: "relief-reach",
            magnitude: 0.04,
            decay: 0.6,
            label: "A place at the table",
          },
        ],
      },
      {
        id: "hosts",
        label: "Coordinate household hosts",
        description:
          "Spend 3 Authority; integration improves, but guild hosts bear a burden.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "refugee-integration",
            magnitude: 0.05,
            decay: 0.6,
            label: "Hosts coordinated",
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Extra household obligations",
          },
        ],
      },
      {
        id: "limit",
        label: "Limit the common obligation",
        description:
          "Preserve funds; refugee satisfaction and charitable confidence fall.",
        consequences: [
          {
            kind: "grudge",
            target: "french-refugees-satisfaction",
            magnitude: -0.08,
            decay: 0.6,
            label: "Doors left closed",
          },
          {
            kind: "grudge",
            target: "charitable-confidence",
            magnitude: -0.04,
            decay: 0.6,
            label: "Hospitality narrowed",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "parish-call",
    title: "A Parish Requests Its Preacher",
    description:
      "Historical reference: St. Aurelia’s parish sought Martin Bucer as its preacher in 1524. Fictional playable situation: A congregation nominates a preacher whom civic officers consider insufficiently tested. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "parish-appointments",
        coefficient: 1,
      },
      {
        source: "rural-connection",
        coefficient: 0.2,
      },
    ],
    threshold: 0.58,
    cooldownTurns: 100,
    choices: [
      {
        id: "trial",
        label: "Fund a supervised appointment",
        description: "Pay 4 Money; coverage and parish confidence improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.06,
            decay: 0.6,
            label: "A supported appointment",
          },
          {
            kind: "grudge",
            target: "rural-parishes-satisfaction",
            magnitude: 0.04,
            decay: 0.6,
            label: "A parish voice heard",
          },
        ],
      },
      {
        id: "consult",
        label: "Negotiate with the council",
        description:
          "Spend 3 Authority; local confidence rises while the Magistrat accepts a modest loss of control.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "rural-parishes-satisfaction",
            magnitude: 0.05,
            decay: 0.6,
            label: "A negotiated call",
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Appointment discretion shared",
          },
        ],
      },
      {
        id: "appoint",
        label: "Uphold the official nominee",
        description:
          "Gain 2 Authority; the Magistrat approves but parish participation loses credibility.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: 2,
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: 0.04,
            decay: 0.6,
            label: "A settled appointment",
          },
          {
            kind: "grudge",
            target: "rural-parishes-satisfaction",
            magnitude: -0.08,
            decay: 0.6,
            label: "Local petition rejected",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "rural-grievances",
    title: "Petitions from the Villages",
    description:
      "Historical reference: The Peasants’ War reached Alsace in 1525; rural demands included a voice in pastoral appointments. Fictional playable situation: Connected villages ask for pastoral attention and relief from burdens. The common church can mediate but cannot settle all rural lordship disputes. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "rural-ministry",
        coefficient: 1,
      },
      {
        source: "household-hardship",
        coefficient: 0.2,
      },
    ],
    threshold: 0.58,
    cooldownTurns: 100,
    choices: [
      {
        id: "visit",
        label: "Send a relief and visitation party",
        description:
          "Pay 5 Money to improve rural connection and reduce hardship.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "rural-connection",
            magnitude: 0.07,
            decay: 0.6,
            label: "Village visits",
          },
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: -0.04,
            decay: 0.6,
            label: "Needs answered",
          },
        ],
      },
      {
        id: "mediate",
        label: "Offer pastoral mediation",
        description:
          "Spend 3 Authority; rural confidence improves but council officers resent the commitment.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "rural-parishes-satisfaction",
            magnitude: 0.06,
            decay: 0.6,
            label: "Petitions acknowledged",
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Another difficult negotiation",
          },
        ],
      },
      {
        id: "refer",
        label: "Refer grievances to civil authorities",
        description:
          "Save the church’s funds; rural trust falls while pastoral capacity receives temporary breathing room.",
        consequences: [
          {
            kind: "grudge",
            target: "rural-parishes-satisfaction",
            magnitude: -0.08,
            decay: 0.6,
            label: "Petitions returned",
          },
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.03,
            decay: 0.6,
            label: "Existing work protected",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "inherited-worship",
    title: "An Inherited Rite at the Parish Door",
    description:
      "Historical reference: Strasbourg suspended the Mass in 1529. Fictional playable situation: A parish disputes the withdrawal of familiar worship. Your response addresses this congregation, not a citywide historical abolition. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "worship-reform",
        coefficient: 1,
      },
      {
        source: "confessional-friction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.58,
    cooldownTurns: 100,
    choices: [
      {
        id: "accompany",
        label: "Fund an accompanied transition",
        description:
          "Pay 5 Money to calm street pressure and protect participation.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "street-unrest",
            magnitude: -0.08,
            decay: 0.6,
            label: "A patient transition",
          },
          {
            kind: "grudge",
            target: "worship-participation",
            magnitude: 0.04,
            decay: 0.6,
            label: "Neighbors remain present",
          },
        ],
      },
      {
        id: "hearing",
        label: "Negotiate a temporary accommodation",
        description:
          "Spend 3 Authority; old-faith confidence improves while evangelicals resent delay.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "traditionalists-satisfaction",
            magnitude: 0.06,
            decay: 0.6,
            label: "Time to adjust",
          },
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Reform postponed",
          },
        ],
      },
      {
        id: "proclaim",
        label: "Issue a firm instruction",
        description:
          "Gain 2 Authority and evangelical confidence; old-faith satisfaction and parish peace decline.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: 2,
          },
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: 0.06,
            decay: 0.6,
            label: "A clear instruction",
          },
          {
            kind: "grudge",
            target: "traditionalists-satisfaction",
            magnitude: -0.09,
            decay: 0.6,
            label: "A familiar rite withdrawn",
          },
          {
            kind: "grudge",
            target: "public-order",
            magnitude: -0.03,
            decay: 0.6,
            label: "A disputed proclamation",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "devotional-work",
    title: "The Cost of Removing an Image",
    description:
      "Historical reference: Strasbourg suspended the Mass in 1529. Fictional playable situation: Craftspeople ask what will become of a devotional work; reforming neighbors insist its public place must change. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "devotional-images",
        coefficient: 1,
      },
      {
        source: "confessional-friction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "store",
        label: "Pay for careful removal and storage",
        description:
          "Pay 4 Money; guild confidence improves and image controversy subsides.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: 0.05,
            decay: 0.6,
            label: "Craft treated with care",
          },
          {
            kind: "grudge",
            target: "image-controversy",
            magnitude: -0.08,
            decay: 0.6,
            label: "An orderly removal",
          },
        ],
      },
      {
        id: "explain",
        label: "Arrange a parish explanation",
        description:
          "Spend 3 Authority; controversy eases, but reforming households dislike delay.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "image-controversy",
            magnitude: -0.05,
            decay: 0.6,
            label: "The parish hears reasons",
          },
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Another delay",
          },
        ],
      },
      {
        id: "remove",
        label: "Order immediate removal",
        description:
          "Preserve funds; evangelicals gain confidence while traditionalists and guild craftspeople lose it.",
        consequences: [
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: 0.06,
            decay: 0.6,
            label: "Removal completed",
          },
          {
            kind: "grudge",
            target: "traditionalists-satisfaction",
            magnitude: -0.09,
            decay: 0.6,
            label: "A devotional loss",
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Work discarded",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "shared-table",
    title: "Disagreement at the Lord’s Table",
    description:
      "Historical reference: The Marburg Colloquy of 1529 exposed disagreement over the Lord’s Supper. Fictional playable situation: A proposed statement of communion draws objections from neighboring evangelical churches. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "sacramental-alignment",
        coefficient: 1,
      },
      {
        source: "doctrinal-alignment",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "delegation",
        label: "Support a theological delegation",
        description:
          "Pay 5 Money; external security and shared language improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: 0.07,
            decay: 0.6,
            label: "Talks remain open",
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: 0.04,
            decay: 0.6,
            label: "Terms clarified",
          },
        ],
      },
      {
        id: "letters",
        label: "Exchange carefully argued letters",
        description:
          "Spend 3 Authority; unity improves while spiritualist readers dislike the emphasis on formulas.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "church-unity",
            magnitude: 0.05,
            decay: 0.6,
            label: "Arguments heard",
          },
          {
            kind: "grudge",
            target: "spiritualists-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Words made a test",
          },
        ],
      },
      {
        id: "separate",
        label: "Affirm a distinct local position",
        description:
          "Preserve funds; evangelical confidence rises but external security falls.",
        consequences: [
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: 0.06,
            decay: 0.6,
            label: "Convictions stated",
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: -0.08,
            decay: 0.6,
            label: "Partners hesitate",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "confession-draft",
    title: "Drafting a Common Confession",
    description:
      "Historical reference: Bucer and Capito helped formulate the Tetrapolitan Confession in 1530. Fictional playable situation: Pastors request a public statement while independent congregations fear a new condition of residence. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "confessional-subscription",
        coefficient: 1,
      },
      {
        source: "doctrinal-alignment",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "commentary",
        label: "Publish a statement with explanations",
        description: "Pay 4 Money; teaching and common language improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "teaching-quality",
            magnitude: 0.05,
            decay: 0.6,
            label: "A confession explained",
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: 0.05,
            decay: 0.6,
            label: "Shared terms",
          },
        ],
      },
      {
        id: "exceptions",
        label: "Negotiate room for conscientious exceptions",
        description:
          "Spend 4 Authority; Anabaptists gain satisfaction while public agreement weakens slightly.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "anabaptists-satisfaction",
            magnitude: 0.07,
            decay: 0.6,
            label: "Exceptions acknowledged",
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: -0.03,
            decay: 0.6,
            label: "Unequal subscription",
          },
        ],
      },
      {
        id: "require",
        label: "Require unqualified assent",
        description:
          "Gain 2 Authority; common language strengthens but Anabaptists and Spiritualists lose confidence.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: 2,
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: 0.06,
            decay: 0.6,
            label: "An unambiguous requirement",
          },
          {
            kind: "grudge",
            target: "anabaptists-satisfaction",
            magnitude: -0.09,
            decay: 0.6,
            label: "Assent under pressure",
          },
          {
            kind: "grudge",
            target: "spiritualists-satisfaction",
            magnitude: -0.06,
            decay: 0.6,
            label: "Conscience constrained",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "alliance-dues",
    title: "The Price of an Evangelical Alliance",
    description:
      "Historical reference: The Schmalkaldic League formed in 1531 to defend evangelical interests. Fictional playable situation: Partners request a contribution to common defense arrangements. The church can support diplomacy, not direct an army. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "evangelical-diplomacy",
        coefficient: 1,
      },
      {
        source: "diplomatic-obligations",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "pay",
        label: "Honor the requested contribution",
        description:
          "Pay 6 Money to strengthen external security and merchant confidence.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: 0.08,
            decay: 0.6,
            label: "An obligation honored",
          },
          {
            kind: "grudge",
            target: "merchants-satisfaction",
            magnitude: 0.03,
            decay: 0.6,
            label: "Routes feel less exposed",
          },
        ],
      },
      {
        id: "negotiate",
        label: "Negotiate a smaller commitment",
        description:
          "Spend 4 Authority; obligations ease, but partners become less confident.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "diplomatic-obligations",
            magnitude: -0.07,
            decay: 0.6,
            label: "A smaller undertaking",
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: -0.02,
            decay: 0.6,
            label: "Partners wait",
          },
        ],
      },
      {
        id: "decline",
        label: "Decline the additional obligation",
        description:
          "Preserve funds; external security and the Magistrat’s satisfaction decline.",
        consequences: [
          {
            kind: "grudge",
            target: "external-security",
            magnitude: -0.09,
            decay: 0.6,
            label: "An unanswered request",
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: -0.04,
            decay: 0.6,
            label: "A weakened negotiation",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "wardens-remit",
    title: "The Kirchenpfleger’s Remit",
    description:
      "Historical reference: Strasbourg instituted Kirchenpfleger in 1531. Fictional playable situation: Lay wardens want access to parish accounts and teaching. Pastors and dissenting neighbors disagree about the limits. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "lay-eldership",
        coefficient: 1,
      },
      {
        source: "administrative-reliability",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "train",
        label: "Fund training for the wardens",
        description:
          "Pay 4 Money; administration improves without an additional grant of power.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "administrative-reliability",
            magnitude: 0.08,
            decay: 0.6,
            label: "Wardens prepared",
          },
        ],
      },
      {
        id: "define",
        label: "Define a negotiated remit",
        description:
          "Spend 3 Authority; pastors gain confidence while the Magistrat accepts limits.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "pastors-satisfaction",
            magnitude: 0.06,
            decay: 0.6,
            label: "Limits to inspection",
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "A narrower remit",
          },
        ],
      },
      {
        id: "extend",
        label: "Extend inspection powers",
        description:
          "Gain 2 Authority and administrative reliability; Anabaptist confidence falls.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: 2,
          },
          {
            kind: "grudge",
            target: "administrative-reliability",
            magnitude: 0.04,
            decay: 0.6,
            label: "Broad inspection powers",
          },
          {
            kind: "grudge",
            target: "anabaptists-satisfaction",
            magnitude: -0.08,
            decay: 0.6,
            label: "Scrutiny without consent",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "synodal-papers",
    title: "Papers for a Common Assembly",
    description:
      "Historical reference: Strasbourg’s 1533 synod addressed doctrine and church organization. Fictional playable situation: Delegates arrive with conflicting proposals about teaching, care, and parish discipline. A common account of the disagreement is needed. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "council-oversight",
        coefficient: 1,
      },
      {
        source: "institutional-legitimacy",
        coefficient: 0.2,
      },
    ],
    threshold: 0.58,
    cooldownTurns: 100,
    choices: [
      {
        id: "record",
        label: "Pay for records and interpreters",
        description:
          "Pay 4 Money; legitimacy and doctrinal understanding improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "institutional-legitimacy",
            magnitude: 0.06,
            decay: 0.6,
            label: "Delegates understood",
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: 0.03,
            decay: 0.6,
            label: "Disagreements recorded",
          },
        ],
      },
      {
        id: "moderate",
        label: "Broker a limited common statement",
        description:
          "Spend 3 Authority to strengthen unity without settling every question.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "church-unity",
            magnitude: 0.06,
            decay: 0.6,
            label: "A workable common statement",
          },
        ],
      },
      {
        id: "close",
        label: "Close discussion on the council’s terms",
        description:
          "Gain 2 Authority; the Magistrat approves while pastors lose autonomy.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: 2,
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: 0.04,
            decay: 0.6,
            label: "Discussion closed",
          },
          {
            kind: "grudge",
            target: "pastoral-autonomy",
            magnitude: -0.08,
            decay: 0.6,
            label: "Terms imposed",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "parish-ordinance",
    title: "Applying a Church Ordinance",
    description:
      "Historical reference: Strasbourg’s church ordinance of 1534 strengthened its common ecclesiastical order. Fictional playable situation: A parish asks whether the common rule can accommodate its existing practice. Uniformity would simplify administration but disrupt trusted arrangements. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "parish-visitation",
        coefficient: 1,
      },
      {
        source: "administrative-reliability",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "assist",
        label: "Pay for local assistance",
        description: "Pay 4 Money; coverage and reliability improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.06,
            decay: 0.6,
            label: "Rules made workable",
          },
          {
            kind: "grudge",
            target: "administrative-reliability",
            magnitude: 0.04,
            decay: 0.6,
            label: "Local assistance",
          },
        ],
      },
      {
        id: "adapt",
        label: "Allow a supervised adaptation",
        description:
          "Spend 3 Authority; rural connection improves while common language becomes less exact.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "rural-connection",
            magnitude: 0.06,
            decay: 0.6,
            label: "A local adaptation",
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: -0.03,
            decay: 0.6,
            label: "A less uniform practice",
          },
        ],
      },
      {
        id: "enforce",
        label: "Enforce the ordinary rule",
        description:
          "Preserve funds; reliability improves but rural parishioners lose satisfaction.",
        consequences: [
          {
            kind: "grudge",
            target: "administrative-reliability",
            magnitude: 0.05,
            decay: 0.6,
            label: "A uniform procedure",
          },
          {
            kind: "grudge",
            target: "rural-parishes-satisfaction",
            magnitude: -0.08,
            decay: 0.6,
            label: "Custom set aside",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "concord-correspondence",
    title: "Correspondence toward Concord",
    description:
      "Historical reference: Bucer and Capito participated in the Wittenberg Concord of 1536. Fictional playable situation: An evangelical partner proposes language that would widen cooperation while narrowing the room for a distinct local interpretation. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "sacramental-alignment",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "external-security",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "conference",
        label: "Finance a conference of readers",
        description:
          "Pay 5 Money; security improves and confessional friction eases.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: 0.07,
            decay: 0.6,
            label: "A wider conversation",
          },
          {
            kind: "grudge",
            target: "confessional-friction",
            magnitude: -0.04,
            decay: 0.6,
            label: "An interpretation clarified",
          },
        ],
      },
      {
        id: "reserve",
        label: "Accept cooperation with reservations",
        description:
          "Spend 3 Authority; security improves but doctrinal alignment temporarily weakens.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: 0.04,
            decay: 0.6,
            label: "Cooperation with reservations",
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: -0.03,
            decay: 0.6,
            label: "Reservations remain",
          },
        ],
      },
      {
        id: "refuse",
        label: "Defend local independence",
        description:
          "Preserve funds; autonomy rises but external security falls.",
        consequences: [
          {
            kind: "grudge",
            target: "pastoral-autonomy",
            magnitude: 0.06,
            decay: 0.6,
            label: "Local interpretation protected",
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: -0.08,
            decay: 0.6,
            label: "A missed agreement",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "gymnasium-teachers",
    title: "Teachers for an Ambitious School",
    description:
      "Historical reference: Johannes Sturm led Strasbourg’s new Gymnasium in 1538. Fictional playable situation: A school proposes a broader course of study. Pastors worry that scarce teachers will be drawn away from parish work. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "schooling",
        coefficient: 1,
      },
      {
        source: "literacy",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "endow",
        label: "Fund an additional teacher",
        description: "Pay 6 Money; literacy and teaching quality improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "literacy",
            magnitude: 0.07,
            decay: 0.6,
            label: "A teacher retained",
          },
          {
            kind: "grudge",
            target: "teaching-quality",
            magnitude: 0.04,
            decay: 0.6,
            label: "A broader course",
          },
        ],
      },
      {
        id: "share",
        label: "Coordinate a shared teaching rota",
        description:
          "Spend 3 Authority; literacy improves at a temporary cost to pastoral coverage.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "literacy",
            magnitude: 0.05,
            decay: 0.6,
            label: "A shared rota",
          },
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: -0.03,
            decay: 0.6,
            label: "Hours divided",
          },
        ],
      },
      {
        id: "narrow",
        label: "Keep a narrower curriculum",
        description:
          "Preserve funds and parish coverage; learning loses momentum.",
        consequences: [
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.04,
            decay: 0.6,
            label: "Parish hours protected",
          },
          {
            kind: "grudge",
            target: "literacy",
            magnitude: -0.06,
            decay: 0.6,
            label: "A narrower course",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "french-congregation",
    title: "Worship in a Refugee Household’s Language",
    description:
      "Historical reference: Calvin ministered to Strasbourg’s French congregation during 1538–1541. Fictional playable situation: French-speaking households seek a regular gathering with understandable preaching, while city congregations already lack staff. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "refugee-reception",
        coefficient: 1,
      },
      {
        source: "refugee-integration",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "support",
        label: "Provide a preacher and meeting place",
        description:
          "Pay 6 Money; refugee satisfaction and integration improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "french-refugees-satisfaction",
            magnitude: 0.09,
            decay: 0.6,
            label: "Worship understood",
          },
          {
            kind: "grudge",
            target: "refugee-integration",
            magnitude: 0.05,
            decay: 0.6,
            label: "A meeting place secured",
          },
        ],
      },
      {
        id: "translate",
        label: "Arrange interpretation and shared services",
        description:
          "Spend 3 Authority; integration improves while pastors carry more work.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "refugee-integration",
            magnitude: 0.05,
            decay: 0.6,
            label: "Interpretation arranged",
          },
          {
            kind: "grudge",
            target: "pastors-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "A heavier rota",
          },
        ],
      },
      {
        id: "informal",
        label: "Rely on informal household gatherings",
        description:
          "Preserve funds; pastoral autonomy rises but refugee satisfaction falls.",
        consequences: [
          {
            kind: "grudge",
            target: "pastoral-autonomy",
            magnitude: 0.03,
            decay: 0.6,
            label: "Households organize",
          },
          {
            kind: "grudge",
            target: "french-refugees-satisfaction",
            magnitude: -0.07,
            decay: 0.6,
            label: "Common provision absent",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "sickroom-demand",
    title: "A Sudden Burden of Care",
    description:
      "Historical reference: The plague of 1541 killed Wolfgang Capito. Fictional playable situation: Illness increases the demands on carers and clergy. This fictional local emergency does not announce the historical plague. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "hospital-provision",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "household-hardship",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "staff",
        label: "Pay temporary carers",
        description: "Pay 6 Money; hospital capacity rises and hardship eases.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "hospital-capacity",
            magnitude: 0.09,
            decay: 0.6,
            label: "Carers hired",
          },
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: -0.04,
            decay: 0.6,
            label: "Neighbors accompanied",
          },
        ],
      },
      {
        id: "volunteers",
        label: "Coordinate voluntary care",
        description:
          "Spend 3 Authority; care improves but guild households take on extra work.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "hospital-capacity",
            magnitude: 0.05,
            decay: 0.6,
            label: "Care coordinated",
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Hours taken from work",
          },
        ],
      },
      {
        id: "ration",
        label: "Preserve the ordinary provision",
        description:
          "Preserve resources; unmet hardship rises and charitable confidence falls.",
        consequences: [
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: 0.07,
            decay: 0.6,
            label: "Care deferred",
          },
          {
            kind: "grudge",
            target: "charitable-confidence",
            magnitude: -0.06,
            decay: 0.6,
            label: "Promises exceed provision",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "disrupted-routes",
    title: "Disrupted Routes and Displaced Neighbors",
    description:
      "Historical reference: The Schmalkaldic War of 1546–1547 ended in imperial victory. Fictional playable situation: Reports of insecurity interrupt ordinary journeys and send new appeals for help. The church must decide where limited reserves can matter. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "evangelical-diplomacy",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "imperial-exposure",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "relief",
        label: "Fund emergency provision",
        description: "Pay 6 Money to secure supplies and lessen hardship.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "provisioning-security",
            magnitude: 0.08,
            decay: 0.6,
            label: "Supplies secured",
          },
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: -0.04,
            decay: 0.6,
            label: "Emergency aid",
          },
        ],
      },
      {
        id: "routes",
        label: "Coordinate contacts through other cities",
        description:
          "Spend 4 Authority; security improves, but diplomatic obligations grow.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: 0.06,
            decay: 0.6,
            label: "Contacts reconnected",
          },
          {
            kind: "grudge",
            target: "diplomatic-obligations",
            magnitude: 0.03,
            decay: 0.6,
            label: "Help carries obligations",
          },
        ],
      },
      {
        id: "local",
        label: "Concentrate on existing parishes",
        description:
          "Preserve funds and local coverage; refugees and external partners lose confidence.",
        consequences: [
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.04,
            decay: 0.6,
            label: "Existing parishes protected",
          },
          {
            kind: "grudge",
            target: "french-refugees-satisfaction",
            magnitude: -0.07,
            decay: 0.6,
            label: "New appeals declined",
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: -0.04,
            decay: 0.6,
            label: "A city looks inward",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "outside-settlement",
    title: "Pressure for an Outside Religious Settlement",
    description:
      "Historical reference: The Augsburg Interim of 1548 imposed an imperial religious settlement. Fictional playable situation: An outside authority seeks concessions that the council considers useful for security and pastors consider damaging to their commitments. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "council-oversight",
        coefficient: 1,
      },
      {
        source: "external-security",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "defense",
        label: "Finance a carefully argued response",
        description:
          "Pay 6 Money; security and evangelical confidence improve modestly.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: 0.05,
            decay: 0.6,
            label: "A response prepared",
          },
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: 0.05,
            decay: 0.6,
            label: "Commitments defended",
          },
        ],
      },
      {
        id: "accommodate",
        label: "Negotiate a limited accommodation",
        description:
          "Spend 3 Authority; security improves while evangelical satisfaction falls.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: 0.07,
            decay: 0.6,
            label: "A limited accommodation",
          },
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: -0.05,
            decay: 0.6,
            label: "Concessions accepted",
          },
        ],
      },
      {
        id: "resist",
        label: "Refuse the proposed concessions",
        description:
          "Preserve funds; evangelical satisfaction rises and security deteriorates.",
        consequences: [
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: 0.08,
            decay: 0.6,
            label: "A refusal on principle",
          },
          {
            kind: "grudge",
            target: "external-security",
            magnitude: -0.1,
            decay: 0.6,
            label: "Outside pressure increases",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "dissenting-engineer",
    title: "A Skilled Worker’s Conscience",
    description:
      "Historical reference: Pilgram Marpeck worked for Strasbourg and defended his beliefs in hearings during 1531–1532 before exclusion. Fictional playable situation: A skilled worker useful to common provision refuses an expected religious profession. Officials ask whether employment implies endorsement. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "religious-forbearance",
        coefficient: 1,
      },
      {
        source: "anabaptists-satisfaction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "retain",
        label: "Retain the worker under a civil agreement",
        description:
          "Pay 4 Money; provision improves and Anabaptists gain confidence.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "provisioning-security",
            magnitude: 0.05,
            decay: 0.6,
            label: "Skill retained",
          },
          {
            kind: "grudge",
            target: "anabaptists-satisfaction",
            magnitude: 0.08,
            decay: 0.6,
            label: "Employment without subscription",
          },
        ],
      },
      {
        id: "hearing",
        label: "Arrange a hearing with clear limits",
        description:
          "Spend 3 Authority; legitimacy improves while the Magistrat dislikes the delay.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "institutional-legitimacy",
            magnitude: 0.05,
            decay: 0.6,
            label: "A conscience heard",
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "An unsettled appointment",
          },
        ],
      },
      {
        id: "exclude",
        label: "Require conformity for the position",
        description:
          "Gain 2 Authority; Anabaptist satisfaction and provision decline.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: 2,
          },
          {
            kind: "grudge",
            target: "anabaptists-satisfaction",
            magnitude: -0.1,
            decay: 0.6,
            label: "Employment made conditional",
          },
          {
            kind: "grudge",
            target: "provisioning-security",
            magnitude: -0.04,
            decay: 0.6,
            label: "Useful skill lost",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "spiritualist-pamphlet",
    title: "A Pamphlet about Inward Faith",
    description:
      "Historical reference: Strasbourg printers circulated evangelical pamphlets during the early Reformation. Fictional playable situation: A tract questions whether outward formulas can bind conscience. Readers want access; teachers fear confusion. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "vernacular-printing",
        coefficient: 1,
      },
      {
        source: "print-circulation",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "reply",
        label: "Publish a reasoned response",
        description:
          "Pay 4 Money; teaching improves and Spiritualists feel heard.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "teaching-quality",
            magnitude: 0.06,
            decay: 0.6,
            label: "An argument answered",
          },
          {
            kind: "grudge",
            target: "spiritualists-satisfaction",
            magnitude: 0.04,
            decay: 0.6,
            label: "Readers treated seriously",
          },
        ],
      },
      {
        id: "discussion",
        label: "Arrange an open reading and discussion",
        description:
          "Spend 3 Authority; friction eases, but teachers carry extra obligations.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "confessional-friction",
            magnitude: -0.06,
            decay: 0.6,
            label: "A disputed text discussed",
          },
          {
            kind: "grudge",
            target: "pastors-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Another public discussion",
          },
        ],
      },
      {
        id: "suppress",
        label: "Withdraw official distribution",
        description:
          "Preserve funds; alignment rises but Spiritualist confidence falls.",
        consequences: [
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: 0.04,
            decay: 0.6,
            label: "Distribution restricted",
          },
          {
            kind: "grudge",
            target: "spiritualists-satisfaction",
            magnitude: -0.09,
            decay: 0.6,
            label: "A text suppressed",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "convent-property",
    title: "A Convent’s Existing Obligation",
    description:
      "Historical reference: Dominican convent communities in Reformation Strasbourg resisted demands for religious conformity. Fictional playable situation: A convent argues that income earmarked for common ministry already supports its members and dependants. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "endowment-allocation",
        coefficient: 1,
      },
      {
        source: "charitable-confidence",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "compensate",
        label: "Fund a transitional allowance",
        description:
          "Pay 5 Money; convent confidence improves and friction eases.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "dominican-convents-satisfaction",
            magnitude: 0.09,
            decay: 0.6,
            label: "An obligation acknowledged",
          },
          {
            kind: "grudge",
            target: "confessional-friction",
            magnitude: -0.03,
            decay: 0.6,
            label: "A negotiated allowance",
          },
        ],
      },
      {
        id: "audit",
        label: "Review the competing claims",
        description:
          "Spend 3 Authority; reliability improves while the Cathedral Chapter resents scrutiny.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "administrative-reliability",
            magnitude: 0.05,
            decay: 0.6,
            label: "Claims examined",
          },
          {
            kind: "grudge",
            target: "cathedral-chapter-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Property claims scrutinized",
          },
        ],
      },
      {
        id: "redirect",
        label: "Proceed with the redirection",
        description:
          "Receive 3 Money from this disputed payment; convent confidence and legitimacy decline.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: 3,
          },
          {
            kind: "grudge",
            target: "dominican-convents-satisfaction",
            magnitude: -0.1,
            decay: 0.6,
            label: "Inherited obligations displaced",
          },
          {
            kind: "grudge",
            target: "institutional-legitimacy",
            magnitude: -0.04,
            decay: 0.6,
            label: "A claim left unanswered",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "assessment-petition",
    title: "A Petition against the Common Assessment",
    description:
      "Historical reference: Strasbourg instituted Kirchenpfleger in 1531. Fictional playable situation: Guild households say the common assessment falls unevenly and ask for relief before another collection. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "common-assessments",
        coefficient: 1,
      },
      {
        source: "household-hardship",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "remit",
        label: "Grant a limited remission",
        description: "Pay 5 Money; guild confidence rises and hardship eases.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: 0.08,
            decay: 0.6,
            label: "A burden remitted",
          },
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: -0.04,
            decay: 0.6,
            label: "A lighter collection",
          },
        ],
      },
      {
        id: "schedule",
        label: "Negotiate collection dates",
        description:
          "Spend 3 Authority; guild confidence improves without immediate relief.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: 0.05,
            decay: 0.6,
            label: "Collection made predictable",
          },
        ],
      },
      {
        id: "collect",
        label: "Collect the full assessment",
        description: "Gain 3 Money; guild and merchant satisfaction fall.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: 3,
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: -0.09,
            decay: 0.6,
            label: "A petition rejected",
          },
          {
            kind: "grudge",
            target: "merchants-satisfaction",
            magnitude: -0.04,
            decay: 0.6,
            label: "An inflexible collection",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "unclear-accounts",
    title: "Unclear Accounts at a Common Fund",
    description:
      "Historical reference: Strasbourg instituted Kirchenpfleger in 1531. Fictional playable situation: Different stewards report incompatible balances. No theft is established, but confidence cannot rest on assurances alone. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "financial-auditing",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "administrative-reliability",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "review",
        label: "Pay an independent clerk to review the books",
        description:
          "Pay 4 Money; reliability and charitable confidence improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "administrative-reliability",
            magnitude: 0.08,
            decay: 0.6,
            label: "Accounts reconciled",
          },
          {
            kind: "grudge",
            target: "charitable-confidence",
            magnitude: 0.04,
            decay: 0.6,
            label: "A credible account",
          },
        ],
      },
      {
        id: "stewards",
        label: "Convene the stewards",
        description:
          "Spend 3 Authority; reliability improves but civic trust briefly falls while the dispute remains visible.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "administrative-reliability",
            magnitude: 0.05,
            decay: 0.6,
            label: "Stewards compare records",
          },
          {
            kind: "grudge",
            target: "civic-trust",
            magnitude: -0.02,
            decay: 0.6,
            label: "An acknowledged discrepancy",
          },
        ],
      },
      {
        id: "assure",
        label: "Accept the existing assurances",
        description:
          "Preserve funds; charitable confidence and legitimacy fall.",
        consequences: [
          {
            kind: "grudge",
            target: "charitable-confidence",
            magnitude: -0.08,
            decay: 0.6,
            label: "Assurances without records",
          },
          {
            kind: "grudge",
            target: "institutional-legitimacy",
            magnitude: -0.04,
            decay: 0.6,
            label: "An unanswered discrepancy",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "grain-contract",
    title: "An Expensive Grain Contract",
    description:
      "Historical reference: The Peasants’ War reached Alsace in 1525; rural demands included a voice in pastoral appointments. Fictional playable situation: Suppliers offer dependable delivery at a price that will displace other ministry. Merchants object to the proposed terms. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "grain-purchasing",
        coefficient: 1,
      },
      {
        source: "provisioning-security",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "buy",
        label: "Pay for reliable delivery",
        description: "Pay 5 Money; provisioning improves and hardship eases.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "provisioning-security",
            magnitude: 0.09,
            decay: 0.6,
            label: "Delivery secured",
          },
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: -0.03,
            decay: 0.6,
            label: "Bread within reach",
          },
        ],
      },
      {
        id: "broker",
        label: "Broker a smaller agreement",
        description:
          "Spend 3 Authority; provision improves but merchants lose satisfaction.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "provisioning-security",
            magnitude: 0.05,
            decay: 0.6,
            label: "A smaller contract",
          },
          {
            kind: "grudge",
            target: "merchants-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Margins squeezed",
          },
        ],
      },
      {
        id: "market",
        label: "Leave delivery to ordinary trade",
        description:
          "Preserve funds; merchants approve but provision becomes less secure.",
        consequences: [
          {
            kind: "grudge",
            target: "merchants-satisfaction",
            magnitude: 0.05,
            decay: 0.6,
            label: "Ordinary trade protected",
          },
          {
            kind: "grudge",
            target: "provisioning-security",
            magnitude: -0.07,
            decay: 0.6,
            label: "A guarantee forgone",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "school-or-parish",
    title: "School Hours or Parish Hours?",
    description:
      "Historical reference: Johannes Sturm led Strasbourg’s new Gymnasium in 1538. Fictional playable situation: The same trained people are wanted for lessons and visitation. Both petitions describe needs that cannot be met by an order alone. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "pastoral-training",
        coefficient: 1,
      },
      {
        source: "pastoral-coverage",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "assistant",
        label: "Fund an assistant",
        description: "Pay 5 Money to improve teaching and coverage.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "teaching-quality",
            magnitude: 0.05,
            decay: 0.6,
            label: "An assistant hired",
          },
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.05,
            decay: 0.6,
            label: "Hours added",
          },
        ],
      },
      {
        id: "rota",
        label: "Agree on a shared rota",
        description:
          "Spend 3 Authority; coverage improves but learning slows temporarily.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.05,
            decay: 0.6,
            label: "A workable rota",
          },
          {
            kind: "grudge",
            target: "literacy",
            magnitude: -0.03,
            decay: 0.6,
            label: "Lessons reduced",
          },
        ],
      },
      {
        id: "parish",
        label: "Prioritize the parish",
        description: "Preserve funds; coverage rises while literacy falls.",
        consequences: [
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.06,
            decay: 0.6,
            label: "Parish work comes first",
          },
          {
            kind: "grudge",
            target: "literacy",
            magnitude: -0.07,
            decay: 0.6,
            label: "Instruction interrupted",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "psalm-books",
    title: "Books for Congregational Song",
    description:
      "Historical reference: Calvin ministered to Strasbourg’s French congregation during 1538–1541. Fictional playable situation: Households request inexpensive songbooks. A shared repertoire can invite participation but also displace familiar practice. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "congregational-singing",
        coefficient: 1,
      },
      {
        source: "worship-participation",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "books",
        label: "Subsidize a modest edition",
        description: "Pay 4 Money; worship participation and literacy improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "worship-participation",
            magnitude: 0.07,
            decay: 0.6,
            label: "Books within reach",
          },
          {
            kind: "grudge",
            target: "literacy",
            magnitude: 0.03,
            decay: 0.6,
            label: "Reading through song",
          },
        ],
      },
      {
        id: "teach",
        label: "Organize shared singing lessons",
        description:
          "Spend 3 Authority; participation improves, but pastors lose preparation time.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "worship-participation",
            magnitude: 0.05,
            decay: 0.6,
            label: "Songs learned together",
          },
          {
            kind: "grudge",
            target: "pastors-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Preparation time reduced",
          },
        ],
      },
      {
        id: "donations",
        label: "Rely on private purchases",
        description:
          "Preserve funds; participation falls while merchant sellers welcome ordinary sales.",
        consequences: [
          {
            kind: "grudge",
            target: "worship-participation",
            magnitude: -0.06,
            decay: 0.6,
            label: "Books beyond some households",
          },
          {
            kind: "grudge",
            target: "merchants-satisfaction",
            magnitude: 0.03,
            decay: 0.6,
            label: "Private sales continue",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "catechism-dispute",
    title: "A Household Questions the Catechism",
    description:
      "Historical reference: Strasbourg’s church ordinance of 1534 strengthened its common ecclesiastical order. Fictional playable situation: A prescribed answer is challenged by a household that values inward conviction. Teachers want a consistent rule. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "catechetical-instruction",
        coefficient: 1,
      },
      {
        source: "doctrinal-alignment",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "explain",
        label: "Fund explanatory lessons",
        description: "Pay 4 Money; teaching improves and friction falls.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "teaching-quality",
            magnitude: 0.07,
            decay: 0.6,
            label: "A difficult answer explained",
          },
          {
            kind: "grudge",
            target: "confessional-friction",
            magnitude: -0.04,
            decay: 0.6,
            label: "Questions answered",
          },
        ],
      },
      {
        id: "latitude",
        label: "Allow a supervised exception",
        description:
          "Spend 3 Authority; Spiritualists gain confidence while alignment weakens.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "spiritualists-satisfaction",
            magnitude: 0.07,
            decay: 0.6,
            label: "Room for conscience",
          },
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: -0.04,
            decay: 0.6,
            label: "An exception remains",
          },
        ],
      },
      {
        id: "standard",
        label: "Require the standard answer",
        description:
          "Preserve funds; alignment rises while Spiritualist satisfaction falls.",
        consequences: [
          {
            kind: "grudge",
            target: "doctrinal-alignment",
            magnitude: 0.05,
            decay: 0.6,
            label: "A common answer",
          },
          {
            kind: "grudge",
            target: "spiritualists-satisfaction",
            magnitude: -0.09,
            decay: 0.6,
            label: "Conscience overruled",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "thin-common-table",
    title: "Too Little at the Common Table",
    description:
      "Historical reference: The Zells sheltered displaced believers from Kenzingen in 1524. Fictional playable situation: Stewards must divide inadequate provision between familiar households and people newly asking for help. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "poor-relief",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "household-hardship",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "supplement",
        label: "Buy an emergency supplement",
        description: "Pay 6 Money to improve relief and ease hardship.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -6,
          },
          {
            kind: "grudge",
            target: "relief-reach",
            magnitude: 0.09,
            decay: 0.6,
            label: "An emergency supplement",
          },
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: -0.04,
            decay: 0.6,
            label: "Needs met this season",
          },
        ],
      },
      {
        id: "coordinate",
        label: "Coordinate existing private aid",
        description:
          "Spend 3 Authority; relief improves while charitable volunteers tire.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "relief-reach",
            magnitude: 0.05,
            decay: 0.6,
            label: "Gifts coordinated",
          },
          {
            kind: "grudge",
            target: "guilds-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Volunteers carry more",
          },
        ],
      },
      {
        id: "ration",
        label: "Restrict the common entitlement",
        description:
          "Preserve funds; hardship rises and refugee confidence falls.",
        consequences: [
          {
            kind: "grudge",
            target: "household-hardship",
            magnitude: 0.07,
            decay: 0.6,
            label: "A narrower entitlement",
          },
          {
            kind: "grudge",
            target: "french-refugees-satisfaction",
            magnitude: -0.07,
            decay: 0.6,
            label: "Those newest receive least",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "chapter-negotiation",
    title: "The Cathedral Chapter Requests Guarantees",
    description:
      "Historical reference: Strasbourg suspended the Mass in 1529. Fictional playable situation: Clerical representatives seek assurances about worship and inherited obligations. Evangelical parishioners fear that guarantees will become a veto over reform. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "worship-reform",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "cathedral-chapter-satisfaction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "settle",
        label: "Fund a limited settlement of obligations",
        description:
          "Pay 5 Money; Chapter confidence improves and friction falls.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -5,
          },
          {
            kind: "grudge",
            target: "cathedral-chapter-satisfaction",
            magnitude: 0.08,
            decay: 0.6,
            label: "Obligations acknowledged",
          },
          {
            kind: "grudge",
            target: "confessional-friction",
            magnitude: -0.04,
            decay: 0.6,
            label: "A defined settlement",
          },
        ],
      },
      {
        id: "hearing",
        label: "Offer a hearing without a veto",
        description:
          "Spend 3 Authority; legitimacy rises while evangelicals worry about delay.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "institutional-legitimacy",
            magnitude: 0.06,
            decay: 0.6,
            label: "A hearing without a veto",
          },
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "Another negotiation",
          },
        ],
      },
      {
        id: "refuse",
        label: "Refuse special guarantees",
        description:
          "Preserve funds; evangelical confidence rises but Chapter satisfaction falls.",
        consequences: [
          {
            kind: "grudge",
            target: "evangelicals-satisfaction",
            magnitude: 0.05,
            decay: 0.6,
            label: "No special veto",
          },
          {
            kind: "grudge",
            target: "cathedral-chapter-satisfaction",
            magnitude: -0.1,
            decay: 0.6,
            label: "Guarantees refused",
          },
        ],
      },
    ],
  },
  {
    kind: "dilemma",
    id: "parish-discretion",
    title: "A Pastor Resists Close Supervision",
    description:
      "Historical reference: Strasbourg’s 1533 synod addressed doctrine and church organization. Fictional playable situation: A pastor says municipal supervision prevents a timely response to parish needs. Council officers fear inconsistent practice. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "council-oversight",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "pastoral-autonomy",
        coefficient: 0.2,
      },
    ],
    threshold: 0.78,
    cooldownTurns: 100,
    choices: [
      {
        id: "support",
        label: "Fund a locally supervised pilot",
        description: "Pay 4 Money; coverage and autonomy improve.",
        consequences: [
          {
            kind: "resource",
            target: "money",
            amount: -4,
          },
          {
            kind: "grudge",
            target: "pastoral-coverage",
            magnitude: 0.05,
            decay: 0.6,
            label: "Local initiative supported",
          },
          {
            kind: "grudge",
            target: "pastoral-autonomy",
            magnitude: 0.05,
            decay: 0.6,
            label: "Room to act",
          },
        ],
      },
      {
        id: "mediate",
        label: "Negotiate a defined area of discretion",
        description:
          "Spend 3 Authority; pastors gain confidence while the Magistrat accepts a concession.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: -3,
          },
          {
            kind: "grudge",
            target: "pastors-satisfaction",
            magnitude: 0.06,
            decay: 0.6,
            label: "Discretion defined",
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: -0.03,
            decay: 0.6,
            label: "A concession to pastors",
          },
        ],
      },
      {
        id: "centralize",
        label: "Uphold common supervision",
        description:
          "Gain 2 Authority; the Magistrat approves while pastors lose confidence.",
        consequences: [
          {
            kind: "resource",
            target: "authority",
            amount: 2,
          },
          {
            kind: "grudge",
            target: "magistrat-satisfaction",
            magnitude: 0.04,
            decay: 0.6,
            label: "Supervision affirmed",
          },
          {
            kind: "grudge",
            target: "pastors-satisfaction",
            magnitude: -0.08,
            decay: 0.6,
            label: "Initiative refused",
          },
        ],
      },
    ],
  },
] satisfies readonly DilemmaDefinition[];
