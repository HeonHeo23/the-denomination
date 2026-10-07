import type { NodeDefinition } from "../../simulation";

export const strasbourgNodes = [
  {
    id: "worship-reform",
    type: "stance",
    name: "Worship Reform",
    description:
      "Inherited rites (0) to evangelical reordering (1). Clear reform wins evangelical confidence but estranges adherents of the old faith.",
    category: "Worship and Practice",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "devotional-images",
    type: "stance",
    name: "Treatment of Devotional Images",
    description:
      "Protected inherited images (0) to extensive removal (1). Removal satisfies iconoclastic conviction but risks loss of artistic work and neighborhood peace.",
    category: "Worship and Practice",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "sacramental-alignment",
    type: "stance",
    name: "Sacramental Alignment",
    description:
      "Swiss-oriented interpretation (0) to agreement with Lutheran sacramental language (1). This is a diplomatic-theological abstraction, not a ranking of true belief.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "congregational-singing",
    type: "stance",
    name: "Congregational Singing",
    description:
      "Provision of vernacular psalms and collective song. Participation improves at the cost of teaching time and money.",
    category: "Worship and Practice",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "catechetical-instruction",
    type: "stance",
    name: "Catechetical Instruction",
    description:
      "Regular instruction for households. Shared vocabulary strengthens teaching, but a prescribed curriculum can alienate spiritualist circles.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "clerical-marriage",
    type: "stance",
    name: "Clerical Marriage",
    description:
      "Restrained public endorsement (0) to strong institutional support (1). Support reassures evangelical clergy while challenging old-faith expectations.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "council-oversight",
    type: "stance",
    name: "Council Oversight",
    description:
      "Parish discretion (0) to close supervision by the Strasbourg Magistrat (1). Civic protection competes with pastoral and congregational autonomy.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "religious-forbearance",
    type: "stance",
    name: "Religious Forbearance",
    description:
      "Strict conformity (0) to protection of peaceful dissent (1). Legal acceptance is separate from funding refugee accommodation.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "lay-eldership",
    type: "stance",
    name: "Lay Eldership",
    description:
      "Provision for lay oversight associated historically with the Kirchenpfleger. Accountability improves, but dissenters feel the scrutiny.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "parish-visitation",
    type: "stance",
    name: "Parish Visitation",
    description:
      "Fund visits to inspect teaching and hear parish difficulties. Better coverage costs money and can intrude on convent life.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "confessional-subscription",
    type: "stance",
    name: "Confessional Subscription",
    description:
      "Loose common profession (0) to detailed required subscription (1). Agreement becomes clearer while conscientious dissent becomes harder to accommodate.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "parish-appointments",
    type: "stance",
    name: "Parish Participation in Appointments",
    description:
      "Appointment from above (0) to substantial parish consultation (1). Consultation earns local confidence but weakens the Magistrat’s control; no voting procedure is simulated.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "poor-relief",
    type: "stance",
    name: "Common Poor Relief",
    description:
      "Regular support for needy households. Reliable care builds charitable confidence while increasing annual commitments.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "refugee-reception",
    type: "stance",
    name: "Refugee Reception",
    description:
      "Practical provision for displaced households, language needs, and lodging. Hospitality improves integration but can stretch housing and money.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "hospital-provision",
    type: "stance",
    name: "Hospital Provision",
    description:
      "Sustained care for sick and vulnerable neighbors. Staffing is expensive even in years without extraordinary demand.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "grain-purchasing",
    type: "stance",
    name: "Emergency Grain Purchasing",
    description:
      "Regular purchasing arrangements against shortages. This measures provision, not a separate grain Resource; merchants bear some of the intervention’s cost.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "common-assessments",
    type: "stance",
    name: "Common Assessments",
    description:
      "Light contributions (0) to heavy assessments (1). Assessments fund common work but reduce the satisfaction and disposable means of contributing households.",
    category: "Finance and Assets",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "endowment-allocation",
    type: "stance",
    name: "Endowment Allocation",
    description:
      "Preserve inherited uses (0) to redirect ecclesiastical income toward common ministry (1). Redirected income is recurring, not a repeatable confiscation payout.",
    category: "Finance and Assets",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
  },
  {
    id: "pastoral-training",
    type: "stance",
    name: "Pastoral Training",
    description:
      "Preparation of preachers and parish teachers. Trained ministry develops slowly and requires continuing salaries.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "schooling",
    type: "stance",
    name: "Schooling",
    description:
      "Support elementary and advanced instruction, with the later Gymnasium as a historical reference. Skills spread slowly; teachers must be paid immediately.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "vernacular-printing",
    type: "stance",
    name: "Vernacular Printing",
    description:
      "Support circulation of sermons, instruction, and pamphlets. Access widens while uncoordinated controversy becomes harder to contain.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "evangelical-diplomacy",
    type: "stance",
    name: "Evangelical Diplomacy",
    description:
      "Fund negotiations with evangelical cities and princes. Protection improves, but alliances bring obligations as well as envoys’ expenses.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "financial-auditing",
    type: "stance",
    name: "Financial Auditing",
    description:
      "Support clear accounts and oversight of common funds. Reliable administration increases trust but costs money and time.",
    category: "Finance and Assets",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "rural-ministry",
    type: "stance",
    name: "Rural Ministry",
    description:
      "Provision for connected rural parishes rather than control of all Alsace. Outreach extends coverage but competes with city ministry for staff.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: false,
    },
    control: {
      kind: "continuous",
      step: 0.05,
    },
    cost: {
      resourceId: "authority",
      base: 1,
      perPoint: 10,
      maxChange: 0.25,
    },
    enactmentCost: {
      resourceId: "authority",
      amount: 5,
    },
    repealCost: {
      resourceId: "authority",
      amount: 3,
    },
  },
  {
    id: "teaching-quality",
    type: "indicator",
    name: "Teaching Quality",
    description: "Preparation and clarity of parish teaching.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.505,
      isActive: true,
      isForced: true,
    },
    baseline: 0.18,
  },
  {
    id: "relief-reach",
    type: "indicator",
    name: "Relief Reach",
    description: "The reach of regular support to people in need.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.495,
      isActive: true,
      isForced: true,
    },
    baseline: 0.18,
  },
  {
    id: "civic-trust",
    type: "indicator",
    name: "Civic Trust",
    description: "Confidence that common leadership can keep its promises.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5632,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "church-unity",
    type: "indicator",
    name: "Church Unity",
    description:
      "Willingness to retain common institutions despite disagreement.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.68026,
      isActive: true,
      isForced: true,
    },
    baseline: 0.24,
  },
  {
    id: "external-security",
    type: "indicator",
    name: "External Security",
    description:
      "Diplomatic protection, not military strength or guaranteed imperial toleration.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.6447,
      isActive: true,
      isForced: true,
    },
    baseline: 0.24,
  },
  {
    id: "revenue",
    type: "indicator",
    name: "Annual Receipts",
    description:
      "Abstract Money received annually. These values are not reconstructed guilders.",
    category: "Finance and Assets",
    domain: {
      min: 0,
      max: 60,
      clamp: true,
    },
    initial: {
      value: 21.047466,
      isActive: true,
      isForced: true,
    },
    baseline: 10,
  },
  {
    id: "expenditure",
    type: "indicator",
    name: "Annual Commitments",
    description:
      "Recurring Money commitments; changes reach the balance through the following snapshot.",
    category: "Finance and Assets",
    domain: {
      min: 0,
      max: 60,
      clamp: true,
    },
    initial: {
      value: 24.452338,
      isActive: true,
      isForced: true,
    },
    baseline: 13.5,
  },
  {
    id: "literacy",
    type: "indicator",
    name: "Literacy and Learning",
    description:
      "Access to reading and instruction; an index rather than a measured literacy rate.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.477161,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "print-circulation",
    type: "indicator",
    name: "Print Circulation",
    description:
      "Reach of vernacular religious texts through readers and public reading.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.482259,
      isActive: true,
      isForced: true,
    },
    baseline: 0.15,
  },
  {
    id: "pastoral-coverage",
    type: "indicator",
    name: "Pastoral Coverage",
    description:
      "Availability of prepared ministers across connected congregations.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.571,
      isActive: true,
      isForced: true,
    },
    baseline: 0.18,
  },
  {
    id: "administrative-reliability",
    type: "indicator",
    name: "Administrative Reliability",
    description:
      "Ability to account for funds and follow through on common decisions.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.54,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "household-hardship",
    type: "indicator",
    name: "Household Hardship",
    description: "Unmet household needs; higher values indicate more hardship.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.483762,
      isActive: true,
      isForced: true,
    },
    baseline: 0.72,
  },
  {
    id: "refugee-integration",
    type: "indicator",
    name: "Refugee Integration",
    description: "Access to lodging, common work, and religious companionship.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5093,
      isActive: true,
      isForced: true,
    },
    baseline: 0.15,
  },
  {
    id: "hospital-capacity",
    type: "indicator",
    name: "Hospital Capacity",
    description:
      "Provision for care, not a separate stock of beds or medicine.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.526316,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "provisioning-security",
    type: "indicator",
    name: "Provisioning Security",
    description: "Reliability of essential provisions during local disruption.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5829,
      isActive: true,
      isForced: true,
    },
    baseline: 0.25,
  },
  {
    id: "doctrinal-alignment",
    type: "indicator",
    name: "Shared Doctrinal Language",
    description:
      "Agreement within the public church; high agreement need not mean freedom for dissenters.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.515,
      isActive: true,
      isForced: true,
    },
    baseline: 0.3,
  },
  {
    id: "diplomatic-obligations",
    type: "indicator",
    name: "Diplomatic Obligations",
    description:
      "Commitments accompanying external protection; higher values add fiscal pressure.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.385,
      isActive: true,
      isForced: true,
    },
    baseline: 0.1,
  },
  {
    id: "charitable-confidence",
    type: "indicator",
    name: "Charitable Confidence",
    description:
      "Confidence that contributions reach those for whom they were intended.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.513158,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "worship-participation",
    type: "indicator",
    name: "Worship Participation",
    description:
      "Participation encouraged by understandable worship and local confidence.",
    category: "Worship and Practice",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.525,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "pastoral-autonomy",
    type: "indicator",
    name: "Pastoral Autonomy",
    description:
      "Room for pastors and parishes to act without close municipal direction.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.45,
      isActive: true,
      isForced: true,
    },
    baseline: 0.6,
  },
  {
    id: "rural-connection",
    type: "indicator",
    name: "Rural Connection",
    description:
      "Strength of relationships with connected rural congregations.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.570332,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "confessional-friction",
    type: "indicator",
    name: "Confessional Friction",
    description:
      "Pressure created by public requirements and divergent convictions.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.4,
      isActive: true,
      isForced: true,
    },
    baseline: 0.25,
  },
  {
    id: "institutional-legitimacy",
    type: "indicator",
    name: "Institutional Legitimacy",
    description:
      "Recognition of common leadership across different social constituencies.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.680097,
      isActive: true,
      isForced: true,
    },
    baseline: 0.2,
  },
  {
    id: "public-order",
    type: "indicator",
    name: "Parish Peace",
    description: "Ability to gather and serve without organized confrontation.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.666617,
      isActive: true,
      isForced: true,
    },
    baseline: 0.3,
  },
  {
    id: "evangelicals-membership",
    type: "faction",
    name: "Evangelical Parishioners: Membership",
    description:
      "Households attached to evangelical preaching; neither a unified party nor identical with the pastors. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.43,
      isActive: true,
      isForced: true,
    },
    baseline: 0.35,
    factionCategory: "theological",
    constraintId: "religious-households",
  },
  {
    id: "evangelicals-satisfaction",
    type: "faction",
    name: "Evangelical Parishioners: Satisfaction",
    description:
      "Households attached to evangelical preaching; neither a unified party nor identical with the pastors.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.576,
      isActive: true,
      isForced: true,
    },
    baseline: 0.3,
    factionCategory: "theological",
  },
  {
    id: "traditionalists-membership",
    type: "faction",
    name: "Adherents of the Old Faith: Membership",
    description:
      "Lay households attached to inherited Catholic worship; distinct from the Cathedral Chapter and convents. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5,
      isActive: true,
      isForced: true,
    },
    baseline: 0.46,
    factionCategory: "theological",
    constraintId: "religious-households",
  },
  {
    id: "traditionalists-satisfaction",
    type: "faction",
    name: "Adherents of the Old Faith: Satisfaction",
    description:
      "Lay households attached to inherited Catholic worship; distinct from the Cathedral Chapter and convents.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.45,
      isActive: true,
      isForced: true,
    },
    baseline: 0.7,
    factionCategory: "theological",
  },
  {
    id: "anabaptists-membership",
    type: "faction",
    name: "Anabaptist Congregations: Membership",
    description:
      "Later-emerging congregations, including the milieu of Pilgram Marpeck. This group does not equate all Anabaptists with Melchior Hoffman or Münster. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0,
      isActive: true,
      isForced: true,
    },
    baseline: 0,
    factionCategory: "theological",
    constraintId: "religious-households",
  },
  {
    id: "anabaptists-satisfaction",
    type: "faction",
    name: "Anabaptist Congregations: Satisfaction",
    description:
      "Later-emerging congregations, including the milieu of Pilgram Marpeck. This group does not equate all Anabaptists with Melchior Hoffman or Münster.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.44,
      isActive: true,
      isForced: true,
    },
    baseline: 0.4,
    factionCategory: "theological",
  },
  {
    id: "spiritualists-membership",
    type: "faction",
    name: "Spiritualist Circles: Membership",
    description:
      "A simplified constituency around inward religious conviction, with Caspar Schwenckfeld as a historical reference; not a single organized church. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0,
      isActive: true,
      isForced: true,
    },
    baseline: 0,
    factionCategory: "theological",
    constraintId: "religious-households",
  },
  {
    id: "spiritualists-satisfaction",
    type: "faction",
    name: "Spiritualist Circles: Satisfaction",
    description:
      "A simplified constituency around inward religious conviction, with Caspar Schwenckfeld as a historical reference; not a single organized church.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.465,
      isActive: true,
      isForced: true,
    },
    baseline: 0.45,
    factionCategory: "theological",
  },
  {
    id: "magistrat-membership",
    type: "faction",
    name: "Strasbourg Magistrat: Membership",
    description:
      "Municipal governors and their supporting networks. Membership is constituency presence, not the proportion of residents holding office. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.2,
      isActive: true,
      isForced: true,
    },
    baseline: 0.17500000000000002,
    factionCategory: "institutional",
  },
  {
    id: "magistrat-satisfaction",
    type: "faction",
    name: "Strasbourg Magistrat: Satisfaction",
    description:
      "Municipal governors and their supporting networks. Membership is constituency presence, not the proportion of residents holding office.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.56,
      isActive: true,
      isForced: true,
    },
    baseline: 0.3,
    factionCategory: "institutional",
  },
  {
    id: "cathedral-chapter-membership",
    type: "faction",
    name: "Cathedral Chapter: Membership",
    description:
      "The cathedral’s corporate clerical institution and its supporting network; not a synonym for all Catholic households. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.15,
      isActive: true,
      isForced: true,
    },
    baseline: 0.125,
    factionCategory: "institutional",
  },
  {
    id: "cathedral-chapter-satisfaction",
    type: "faction",
    name: "Cathedral Chapter: Satisfaction",
    description:
      "The cathedral’s corporate clerical institution and its supporting network; not a synonym for all Catholic households.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.525,
      isActive: true,
      isForced: true,
    },
    baseline: 0.75,
    factionCategory: "institutional",
  },
  {
    id: "pastors-membership",
    type: "faction",
    name: "Evangelical Pastors: Membership",
    description:
      "Preachers and the networks sustaining their ministry, including the historical work of Bucer, Capito, Hedio, and Zell. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.12,
      isActive: true,
      isForced: true,
    },
    baseline: 0.095,
    factionCategory: "institutional",
  },
  {
    id: "pastors-satisfaction",
    type: "faction",
    name: "Evangelical Pastors: Satisfaction",
    description:
      "Preachers and the networks sustaining their ministry, including the historical work of Bucer, Capito, Hedio, and Zell.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.61,
      isActive: true,
      isForced: true,
    },
    baseline: 0.3,
    factionCategory: "institutional",
  },
  {
    id: "guilds-membership",
    type: "faction",
    name: "Guild Households: Membership",
    description:
      "Artisan households balancing religious conviction, assessments, common provision, and neighborhood peace. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.55,
      isActive: true,
      isForced: true,
    },
    baseline: 0.525,
    factionCategory: "demographic",
  },
  {
    id: "guilds-satisfaction",
    type: "faction",
    name: "Guild Households: Satisfaction",
    description:
      "Artisan households balancing religious conviction, assessments, common provision, and neighborhood peace.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.551823,
      isActive: true,
      isForced: true,
    },
    baseline: 0.42,
    factionCategory: "demographic",
  },
  {
    id: "merchants-membership",
    type: "faction",
    name: "Merchant Households: Membership",
    description:
      "Households dependent on trade and reliable civic arrangements, with diverse religious loyalties. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.25,
      isActive: true,
      isForced: true,
    },
    baseline: 0.225,
    factionCategory: "demographic",
  },
  {
    id: "merchants-satisfaction",
    type: "faction",
    name: "Merchant Households: Satisfaction",
    description:
      "Households dependent on trade and reliable civic arrangements, with diverse religious loyalties.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.614498,
      isActive: true,
      isForced: true,
    },
    baseline: 0.52,
    factionCategory: "demographic",
  },
  {
    id: "french-refugees-membership",
    type: "faction",
    name: "French-speaking Refugee Households: Membership",
    description:
      "A later-emerging constituency. Calvin’s Strasbourg congregation of 1538–1541 is a historical reference, not a turn-zero institution. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0,
      isActive: true,
      isForced: true,
    },
    baseline: 0,
    factionCategory: "demographic",
  },
  {
    id: "french-refugees-satisfaction",
    type: "faction",
    name: "French-speaking Refugee Households: Satisfaction",
    description:
      "A later-emerging constituency. Calvin’s Strasbourg congregation of 1538–1541 is a historical reference, not a turn-zero institution.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.519185,
      isActive: true,
      isForced: true,
    },
    baseline: 0.25,
    factionCategory: "demographic",
  },
  {
    id: "dominican-convents-membership",
    type: "faction",
    name: "Dominican Convent Communities: Membership",
    description:
      "Communities defending inherited religious life and property; their concerns cannot be reduced to the bishop’s position. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.08,
      isActive: true,
      isForced: true,
    },
    baseline: 0.055,
    factionCategory: "institutional",
  },
  {
    id: "dominican-convents-satisfaction",
    type: "faction",
    name: "Dominican Convent Communities: Satisfaction",
    description:
      "Communities defending inherited religious life and property; their concerns cannot be reduced to the bishop’s position.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.6,
      isActive: true,
      isForced: true,
    },
    baseline: 0.75,
    factionCategory: "institutional",
  },
  {
    id: "rural-parishes-membership",
    type: "faction",
    name: "Connected Rural Parishioners: Membership",
    description:
      "Households in congregations linked to Strasbourg’s ministry, not a claim of rule over all rural Alsace. Membership changes represent constituency presence, not demographic census counts or a migration system.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.3,
      isActive: true,
      isForced: true,
    },
    baseline: 0.27499999999999997,
    factionCategory: "geographic",
  },
  {
    id: "rural-parishes-satisfaction",
    type: "faction",
    name: "Connected Rural Parishioners: Satisfaction",
    description:
      "Households in congregations linked to Strasbourg’s ministry, not a claim of rule over all rural Alsace.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.566649,
      isActive: true,
      isForced: true,
    },
    baseline: 0.3,
    factionCategory: "geographic",
  },
  {
    id: "money",
    type: "resource",
    name: "Money",
    description:
      "Funds for common ministry. A deficit can be recovered; five consecutive insolvent turns end the common institution.",
    category: "Finance and Assets",
    domain: {
      min: -200,
      max: 300,
      clamp: true,
    },
    initial: {
      value: 65,
      isActive: true,
      isForced: true,
    },
    graphVisible: false,
  },
  {
    id: "authority",
    type: "resource",
    name: "Authority",
    description:
      "Capacity to coordinate policy. Change costs are 1 + 10 × absolute adjustment, with at most 0.25 per action; multiple affordable actions are legal.",
    category: "Governance",
    domain: {
      min: 0,
      max: 100,
      clamp: true,
    },
    initial: {
      value: 45,
      isActive: true,
      isForced: true,
    },
    graphVisible: false,
  },
  {
    id: "street-unrest",
    type: "situation",
    name: "Conflict at the Church Door",
    description:
      "Controversy disrupts parish life. Forbearance and dependable care can restore peace.",
    category: "Governance",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.5515,
      isActive: false,
      isForced: false,
    },
    baseline: 0.65,
    startThreshold: 0.68,
    stopThreshold: 0.43,
  },
  {
    id: "imperial-exposure",
    type: "situation",
    name: "Imperial Exposure",
    description:
      "An isolated public church lacks protection. Diplomacy and civic support can reduce exposure.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.535,
      isActive: false,
      isForced: false,
    },
    baseline: 0.76,
    startThreshold: 0.67,
    stopThreshold: 0.43,
  },
  {
    id: "relief-strain",
    type: "situation",
    name: "Relief Strain",
    description:
      "Regular care is falling behind need. Better relief or lower household hardship can restore capacity.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.471489,
      isActive: false,
      isForced: false,
    },
    baseline: 0.78,
    startThreshold: 0.64,
    stopThreshold: 0.4,
  },
  {
    id: "provisioning-crisis",
    type: "situation",
    name: "Provisioning Crisis",
    description:
      "Essential provision becomes unreliable. Grain arrangements and hospital support offer separate responses.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.423877,
      isActive: false,
      isForced: false,
    },
    baseline: 0.78,
    startThreshold: 0.64,
    stopThreshold: 0.4,
  },
  {
    id: "pastoral-shortage",
    type: "situation",
    name: "Pastoral Shortage",
    description:
      "There are too few prepared ministers for the work. Training and sustained parish coverage can help.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.33115,
      isActive: false,
      isForced: false,
    },
    baseline: 0.8,
    startThreshold: 0.65,
    stopThreshold: 0.4,
  },
  {
    id: "confessional-polarization",
    type: "situation",
    name: "Confessional Polarization",
    description:
      "Doctrinal disagreement hardens into institutional separation. Forbearance and parish peace can reduce the pressure.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.410015,
      isActive: false,
      isForced: false,
    },
    baseline: 0.35,
    startThreshold: 0.67,
    stopThreshold: 0.43,
  },
  {
    id: "flourishing-schools",
    type: "situation",
    name: "Flourishing Schools",
    description:
      "Instruction and prepared teachers reinforce a flourishing learning community. Gains are modest and require continued provision.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.588297,
      isActive: false,
      isForced: false,
    },
    baseline: 0.1,
    startThreshold: 0.68,
    stopThreshold: 0.48,
  },
  {
    id: "trusted-common-provision",
    type: "situation",
    name: "Trusted Common Provision",
    description:
      "Reliable care and trustworthy accounts sustain public cooperation; this is confidence, not free income.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.605895,
      isActive: false,
      isForced: false,
    },
    baseline: 0.1,
    startThreshold: 0.68,
    stopThreshold: 0.48,
  },
  {
    id: "image-controversy",
    type: "situation",
    name: "Image Controversy",
    description:
      "Disagreement over devotional objects escalates. Slower removal or more pastoral accompaniment can calm it.",
    category: "Worship and Practice",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.375,
      isActive: false,
      isForced: false,
    },
    baseline: 0.25,
    startThreshold: 0.67,
    stopThreshold: 0.42,
  },
  {
    id: "refugee-strain",
    type: "situation",
    name: "Refugee Accommodation Strain",
    description:
      "Reception outpaces practical integration and provision. Improve lodging support or moderate the intake commitment.",
    category: "Care and Charity",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.37228,
      isActive: false,
      isForced: false,
    },
    baseline: 0.4,
    startThreshold: 0.65,
    stopThreshold: 0.4,
  },
  {
    id: "printing-controversy",
    type: "situation",
    name: "Printing Controversy",
    description:
      "Pamphlet circulation outruns instruction and common understanding. Teach more or reduce subsidized polemic.",
    category: "Belief and Teaching",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.383081,
      isActive: false,
      isForced: false,
    },
    baseline: 0.3,
    startThreshold: 0.66,
    stopThreshold: 0.41,
  },
  {
    id: "rural-estrangement",
    type: "situation",
    name: "Rural Estrangement",
    description:
      "Connected villages lose confidence in city-led ministry. Better rural coverage or appointment consultation can repair relations.",
    category: "Mission and Expansion",
    domain: {
      min: 0,
      max: 1,
      clamp: true,
    },
    initial: {
      value: 0.311317,
      isActive: false,
      isForced: false,
    },
    baseline: 0.75,
    startThreshold: 0.64,
    stopThreshold: 0.4,
  },
] satisfies readonly NodeDefinition[];
