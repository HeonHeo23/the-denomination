import type { EventDefinition } from "../../simulation";

export const strasbourgEvents = [
  {
    kind: "event",
    id: "household-bequest",
    title: "A Gift for Household Relief",
    description:
      "Historical reference: The Zells sheltered displaced believers from Kenzingen in 1524. Fictional playable situation: A supporter entrusts a small gift to the common relief fund. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "poor-relief",
        coefficient: 1,
      },
      {
        source: "charitable-confidence",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: 3,
      },
      {
        kind: "grudge",
        target: "relief-reach",
        magnitude: 0.025,
        decay: 0.6,
        label: "A small gift reaches households",
      },
    ],
  },
  {
    kind: "event",
    id: "audited-collection",
    title: "A Collection with Clear Accounts",
    description:
      "Historical reference: Strasbourg instituted Kirchenpfleger in 1531. Fictional playable situation: Published accounts encourage a modest extra collection. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "financial-auditing",
        coefficient: 1,
      },
      {
        source: "administrative-reliability",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: 2,
      },
      {
        kind: "grudge",
        target: "charitable-confidence",
        magnitude: 0.025,
        decay: 0.6,
        label: "Accounts inspire a collection",
      },
    ],
  },
  {
    kind: "event",
    id: "school-readers",
    title: "New Readers at Parish Lessons",
    description:
      "Historical reference: Johannes Sturm led Strasbourg’s new Gymnasium in 1538. Fictional playable situation: A group of learners begins assisting others with religious texts. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "print-circulation",
        magnitude: 0.035,
        decay: 0.6,
        label: "Readers help readers",
      },
    ],
  },
  {
    kind: "event",
    id: "trained-preacher",
    title: "A Prepared Preacher Takes Up Work",
    description:
      "Historical reference: St. Aurelia’s parish sought Martin Bucer as its preacher in 1524. Fictional playable situation: A newly prepared minister eases the pressure on neighboring parishes. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "pastoral-training",
        coefficient: 1,
      },
      {
        source: "teaching-quality",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "pastoral-coverage",
        magnitude: 0.04,
        decay: 0.6,
        label: "A minister ready to serve",
      },
    ],
  },
  {
    kind: "event",
    id: "shared-psalm",
    title: "A Psalm Learned across Households",
    description:
      "Historical reference: Calvin ministered to Strasbourg’s French congregation during 1538–1541. Fictional playable situation: A common song gives households a way to participate together. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "church-unity",
        magnitude: 0.03,
        decay: 0.6,
        label: "A shared song",
      },
    ],
  },
  {
    kind: "event",
    id: "teaching-request",
    title: "Requests for More Instruction",
    description:
      "Historical reference: Strasbourg’s church ordinance of 1534 strengthened its common ecclesiastical order. Fictional playable situation: Successful instruction brings a request for additional copies and lessons. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "catechetical-instruction",
        coefficient: 1,
      },
      {
        source: "teaching-quality",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: -1,
      },
      {
        kind: "grudge",
        target: "doctrinal-alignment",
        magnitude: 0.035,
        decay: 0.6,
        label: "Questions bring further lessons",
      },
    ],
  },
  {
    kind: "event",
    id: "guild-delivery",
    title: "A Delivery Organized by Guild Neighbors",
    description:
      "Historical reference: The Peasants’ War reached Alsace in 1525; rural demands included a voice in pastoral appointments. Fictional playable situation: Guild contacts help a relief steward complete a difficult delivery. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "provisioning-security",
        magnitude: 0.035,
        decay: 0.6,
        label: "A delivery completed",
      },
      {
        kind: "grudge",
        target: "guilds-satisfaction",
        magnitude: 0.02,
        decay: 0.6,
        label: "Useful work recognized",
      },
    ],
  },
  {
    kind: "event",
    id: "hospital-watch",
    title: "A Hospital Watch Filled",
    description:
      "Historical reference: The plague of 1541 killed Wolfgang Capito. Fictional playable situation: Carers fill an otherwise uncovered watch and need ordinary supplies. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "hospital-provision",
        coefficient: 1,
      },
      {
        source: "hospital-capacity",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: -1,
      },
      {
        kind: "grudge",
        target: "hospital-capacity",
        magnitude: 0.04,
        decay: 0.6,
        label: "A watch covered",
      },
    ],
  },
  {
    kind: "event",
    id: "refugee-work",
    title: "New Neighbors Join Common Work",
    description:
      "Historical reference: Calvin ministered to Strasbourg’s French congregation during 1538–1541. Fictional playable situation: Newly accommodated households join the work of a local congregation. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "french-refugees-satisfaction",
        magnitude: 0.04,
        decay: 0.6,
        label: "A place in common work",
      },
      {
        kind: "grudge",
        target: "institutional-legitimacy",
        magnitude: 0.02,
        decay: 0.6,
        label: "Hospitality becomes belonging",
      },
    ],
  },
  {
    kind: "event",
    id: "rural-letter",
    title: "A Letter of Thanks from a Village",
    description:
      "Historical reference: St. Aurelia’s parish sought Martin Bucer as its preacher in 1524. Fictional playable situation: A connected village reports that regular ministry has resumed. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "rural-ministry",
        coefficient: 1,
      },
      {
        source: "rural-connection",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "rural-parishes-satisfaction",
        magnitude: 0.04,
        decay: 0.6,
        label: "Regular ministry returns",
      },
    ],
  },
  {
    kind: "event",
    id: "diplomatic-contact",
    title: "A Useful Contact in Another City",
    description:
      "Historical reference: Bucer and Capito participated in the Wittenberg Concord of 1536. Fictional playable situation: Correspondence opens a practical route for cooperation. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "evangelical-diplomacy",
        coefficient: 1,
      },
      {
        source: "external-security",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "external-security",
        magnitude: 0.035,
        decay: 0.6,
        label: "A useful correspondence",
      },
    ],
  },
  {
    kind: "event",
    id: "parish-hearing",
    title: "A Parish Hearing Settles an Appointment",
    description:
      "Historical reference: St. Aurelia’s parish sought Martin Bucer as its preacher in 1524. Fictional playable situation: Consultation resolves an appointment dispute without a simulated vote. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "parish-appointments",
        coefficient: 1,
      },
      {
        source: "institutional-legitimacy",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "pastoral-coverage",
        magnitude: 0.03,
        decay: 0.6,
        label: "An appointment accepted",
      },
      {
        kind: "resource",
        target: "authority",
        amount: 1,
      },
    ],
  },
  {
    kind: "event",
    id: "image-petition",
    title: "A Petition over Devotional Images",
    description:
      "Historical reference: Strasbourg suspended the Mass in 1529. Fictional playable situation: Neighbors protest the treatment of an image and interrupt parish work. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: -2,
      },
      {
        kind: "grudge",
        target: "traditionalists-satisfaction",
        magnitude: -0.035,
        decay: 0.6,
        label: "A disputed removal",
      },
    ],
  },
  {
    kind: "event",
    id: "subscription-refusal",
    title: "A Household Refuses Subscription",
    description:
      "Historical reference: Bucer and Capito helped formulate the Tetrapolitan Confession in 1530. Fictional playable situation: A household cannot assent to the required statement and withdraws from a common meeting. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "confessional-subscription",
        coefficient: 1,
      },
      {
        source: "confessional-friction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "anabaptists-satisfaction",
        magnitude: -0.035,
        decay: 0.6,
        label: "Subscription refused",
      },
      {
        kind: "grudge",
        target: "church-unity",
        magnitude: -0.02,
        decay: 0.6,
        label: "A household stays away",
      },
    ],
  },
  {
    kind: "event",
    id: "assessment-arrears",
    title: "Arrears in a Common Assessment",
    description:
      "Historical reference: Strasbourg instituted Kirchenpfleger in 1531. Fictional playable situation: Several assessed households ask for time to pay. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: -2,
      },
      {
        kind: "grudge",
        target: "guilds-satisfaction",
        magnitude: -0.025,
        decay: 0.6,
        label: "Collection strains households",
      },
    ],
  },
  {
    kind: "event",
    id: "endowment-appeal",
    title: "An Appeal over Endowment Income",
    description:
      "Historical reference: Dominican convent communities in Reformation Strasbourg resisted demands for religious conformity. Fictional playable situation: A corporate religious community contests the use of a payment. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "endowment-allocation",
        coefficient: 1,
      },
      {
        source: "confessional-friction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: -2,
      },
      {
        kind: "grudge",
        target: "cathedral-chapter-satisfaction",
        magnitude: -0.03,
        decay: 0.6,
        label: "An inherited payment contested",
      },
    ],
  },
  {
    kind: "event",
    id: "unpaid-carers",
    title: "Carers Stretch Thin Provision",
    description:
      "Historical reference: The plague of 1541 killed Wolfgang Capito. Fictional playable situation: Carers cover more need than ordinary provision supports. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "household-hardship",
        magnitude: 0.04,
        decay: 0.6,
        label: "Carers stretched",
      },
      {
        kind: "grudge",
        target: "charitable-confidence",
        magnitude: -0.025,
        decay: 0.6,
        label: "Care falls short",
      },
    ],
  },
  {
    kind: "event",
    id: "thin-visitation",
    title: "A Parish Goes without a Visit",
    description:
      "Historical reference: Strasbourg’s church ordinance of 1534 strengthened its common ecclesiastical order. Fictional playable situation: A request for help remains unanswered while ministers attend to other work. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "parish-visitation",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "pastoral-shortage",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "pastoral-coverage",
        magnitude: -0.04,
        decay: 0.6,
        label: "A visit missed",
      },
    ],
  },
  {
    kind: "event",
    id: "pamphlet-quarrel",
    title: "A Quarrel Spreads through Pamphlets",
    description:
      "Historical reference: Strasbourg printers circulated evangelical pamphlets during the early Reformation. Fictional playable situation: Competing texts circulate faster than teachers can answer them. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "confessional-friction",
        magnitude: 0.04,
        decay: 0.6,
        label: "A dispute in print",
      },
    ],
  },
  {
    kind: "event",
    id: "closed-doors",
    title: "Peaceful Dissenters Find Doors Closed",
    description:
      "Historical reference: Pilgram Marpeck worked for Strasbourg and defended his beliefs in hearings during 1531–1532 before exclusion. Fictional playable situation: Religious requirements exclude neighbors from ordinary companionship. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "religious-forbearance",
        coefficient: -1,
        intercept: 1,
      },
      {
        source: "confessional-friction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "anabaptists-satisfaction",
        magnitude: -0.04,
        decay: 0.6,
        label: "Companionship denied",
      },
      {
        kind: "grudge",
        target: "spiritualists-satisfaction",
        magnitude: -0.025,
        decay: 0.6,
        label: "A narrower public fellowship",
      },
    ],
  },
  {
    kind: "event",
    id: "distant-council",
    title: "Council Officers Question Parish Practice",
    description:
      "Historical reference: Strasbourg’s 1533 synod addressed doctrine and church organization. Fictional playable situation: Weak coordination leads officers to question whether the common church can keep its undertakings. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "magistrat-satisfaction",
        magnitude: -0.04,
        decay: 0.6,
        label: "Uneven parish arrangements",
      },
    ],
  },
  {
    kind: "event",
    id: "unprotected-messenger",
    title: "An Unprotected Messenger’s Journey",
    description:
      "Historical reference: The Schmalkaldic War of 1546–1547 ended in imperial victory. Fictional playable situation: A messenger encounters obstacles for which local contacts can offer little assistance. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "resource",
        target: "money",
        amount: -2,
      },
      {
        kind: "grudge",
        target: "external-security",
        magnitude: -0.025,
        decay: 0.6,
        label: "Contacts cannot help",
      },
    ],
  },
  {
    kind: "event",
    id: "wardens-dispute",
    title: "Wardens and Pastors Disagree",
    description:
      "Historical reference: Strasbourg instituted Kirchenpfleger in 1531. Fictional playable situation: An inspection uncovers a disagreement about who should decide a pastoral matter. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
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
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "pastors-satisfaction",
        magnitude: -0.03,
        decay: 0.6,
        label: "An intrusive inspection",
      },
      {
        kind: "grudge",
        target: "administrative-reliability",
        magnitude: 0.02,
        decay: 0.6,
        label: "An ambiguity recorded",
      },
    ],
  },
  {
    kind: "event",
    id: "marriage-scrutiny",
    title: "A Clerical Household Faces Scrutiny",
    description:
      "Historical reference: Katharina Schütz Zell defended clerical marriage in print in 1524. Fictional playable situation: A married clerical household becomes the subject of neighborhood argument. This is an adapted pressure, not a reenactment or a claim that the dated event has occurred in this campaign.",
    influences: [
      {
        source: "clerical-marriage",
        coefficient: 1,
      },
      {
        source: "confessional-friction",
        coefficient: 0.2,
      },
    ],
    threshold: 0.79,
    cooldownTurns: 5,
    consequences: [
      {
        kind: "grudge",
        target: "traditionalists-satisfaction",
        magnitude: -0.025,
        decay: 0.6,
        label: "An inherited expectation challenged",
      },
      {
        kind: "grudge",
        target: "pastors-satisfaction",
        magnitude: 0.02,
        decay: 0.6,
        label: "Colleagues stand together",
      },
    ],
  },
] satisfies readonly EventDefinition[];
