import { NPCPF2e } from "foundry-pf2e";
import { getDC } from "./Utilities";
export class CreatureTemplate {
    name: string;
    suffix: string;
    level: number | undefined;
    rarity: string | ((oldRarity: string) => string) | undefined;
    traitsToAdd: (oldTraits: string[]) => string[] | string[] | undefined;
    traitsToRemove: (oldTraits: string[]) => string[] | string[] | undefined;
    size: (oldSize: string) => string | string | undefined;
    ac: number | undefined;
    attack: number | undefined;
    DC: number | undefined;
    perception: number | undefined;
    saves: Record<string, number> | undefined;
    attributes: Record<string, (oldValue: number) => number | number> | undefined;
    skills: Record<string, number | "max"> | undefined;
    damage: Record<string, number> | undefined;
    hp: (oldLevel: number) => number | number | undefined;
    abilities: {pack: string, id: string, slug: string}[] | undefined;
    optionalAbilities: {pack: string, id: string, slug: string, name: string}[] | undefined;
    specialAdjustments: (actor: NPCPF2e) => Promise<void> | undefined;

    constructor(name: string) {
        const template = templates[name];
        this.name = template?.name;
        this.suffix = template?.suffix;
        this.level = template?.level;
        this.rarity = template?.rarity;
        this.traitsToAdd = template?.traitsToAdd;
        this.traitsToRemove = template?.traitsToRemove;
        this.size = template?.size;
        this.ac = template?.ac;
        this.attack = template?.attack;
        this.DC = template?.DC;
        this.perception = template?.perception;
        this.saves = template?.saves;
        this.attributes = template?.attributes;
        this.skills = template?.skills;
        this.damage = template?.damage;
        this.hp = template?.hp;
        this.abilities = template?.abilities;
        this.optionalAbilities = template?.optionalAbilities;
        this.specialAdjustments = template?.specialAdjustments;
    }
    static getList() {
        // return key, value.name of templates
        return Object.entries(templates).map(([key, value]) => ({ key, name: value.name }));
    }
}
const MAX = "max";
const templates: Record<string, any> = {
    "primevalCryptid": {
        name: "Primeval Cryptid",
        suffix: " (Primeval Cryptid)",
        level: 1,
        rarity: function (oldRarity: string) {
            if (oldRarity === "common") {
                return "uncommon";
            } else if (oldRarity === "uncommon") {
                return "rare";
            } else {
                return oldRarity;
            }
        },
        traitsToAdd: function (oldTraits: string[]) {
            if (oldTraits.includes("animal")) {
                return ["beast"];
            }
            return [];
        },
        traitsToRemove: function (oldTraits: string[]) {
            if (oldTraits.includes("animal")) {
                return ["animal"];
            }
            return [];
        },
        size: function(oldSize: string) {
            const sizes = ["tiny", "sm", "med", "lg", "huge", "grg"];
            const index = sizes.indexOf(oldSize);
            return sizes[index + 1] || oldSize;
        },
        ac: 1,
        attack: 1,
        DC: 1,
        perception: 1,
        saves: {
            fortitude: 1,
            reflex: 1,
            will: 1
        },
        skills: {
            all: 1
        },
        damage: {
            strike: 1,
            limitAction: 2
        },
        hp: function (oldLevel: number) {
            if (oldLevel <= 1){
                return 10;
            } else if (oldLevel <= 4) {
                return 15;
            } else if (oldLevel <= 19) {
                return 20;
            } else {
                return 30;
            }
        },
        optionalAbilities: [
            {pack: "pf2e.bestiary-family-ability-glossary", id:"7llQJrvVuCh7KjZO", slug: "cryptid-primeval-stench", name:"Stench"}, // Stench
            {pack: "pf2e.bestiary-family-ability-glossary", id:"z9yqLBExOMk1y9cg", slug: "cryptid-primeval-broken-arsenal", name:"Broken Arsenal"}, // Broken Arsenal
            {pack: "pf2e.bestiary-family-ability-glossary", id:"R0tsWv6QHd2jbQON", slug: "cryptid-primeval-grasp-for-life", name:"Grasp for Life"}, // Grasp for Life
            {pack: "pf2e.bestiary-family-ability-glossary", id:"l5FyTQQ0OfICCS1c", slug: "cryptid-primeval-shockwave", name:"Shockwave"}, // Shockwave
        ],
        specialAdjustments: async function (actor: NPCPF2e) {
            // if size is huge or gargantuan, the reach will be increased by 5 feet
            const system = actor.system;
            const size = system.traits.size;
            if (size.equals("huge") || size.equals("grg")) {
                // increase reach of all melee weapons by 5 feet
                actor.items.filter(i => i.type === "melee").forEach(async i => {
                    const traits = i.system.traits.value as string[];
                    // if there's no reach trait, add reach-10, else increase the reach by 5
                    const reachTrait = traits.find(t => t.startsWith("reach-"));
                    if (reachTrait) {
                        const reach = parseInt(reachTrait.split("-")[1]);
                        const newReach = reach + 5;
                        const newReachTrait = `reach-${newReach}`;
                        const newTraits = traits.filter(t => !t.startsWith("reach-")).concat(newReachTrait);
                        await i.update({ "system.traits.value": newTraits });
                    } else {
                        await i.update({ "system.traits.value": traits.concat("reach-10") });
                    }
                });
            }
            // apply dc for Stench
            const stench = actor.items.find(i => i.system.slug === "cryptid-primeval-stench");
            if (stench) {
                const description = (stench.system as any)?.description?.value ?? "";

                // Find @Check[fortitude|dc:] and add DC adjustment to the value after dc
                const newDescription = description.replace(/@Check\[(.*?)\]/g, (_full: any, inner: string) => {
                    // inner is like: fortitude|dc:20...
                    const m = inner.match(/^(.*?)(\|dc:)(\d+)(.*)$/);
                    if (!m) return `@Check[${inner}]`;
                    const type = m[1];
                    const dc = getDC(system.details.level.value, "standard");
                    return `@Check[${type}|dc:${dc}]`;
                });
                await stench.update({ "system.description.value": newDescription });
            }
        }
    },
    "rumouredCryptid": {
        name: "Rumoured Cryptid",
        suffix: " (Rumoured Cryptid)",
        level: 1,
        rarity: "rare",
        traitsToAdd: function (oldTraits: string[]) {
            if (oldTraits.includes("animal")) {
                return ["beast"];
            }
            return [];
        },
        traitsToRemove: function (oldTraits: string[]) {
            if (oldTraits.includes("animal")) {
                return ["animal"];
            }
            return [];
        },
        attributes: {
            int: function (oldInt: number) {
                if (oldInt <= -4) {
                    return -3;
                }
                return oldInt;
            }
        },
        skills: {
            stealth: MAX,
        },
        damage: {
            strike: 1,
            limitAction: 2
        },
        hp: function (oldLevel: number) {
            if (oldLevel <= 1){
                return 10;
            } else if (oldLevel <= 4) {
                return 15;
            } else if (oldLevel <= 19) {
                return 20;
            } else {
                return 30;
            }
        },
        abilities: [
            {pack: "pf2e.bestiary-family-ability-glossary", id:"l2ov5uPpfOAoyXAL", slug: "cryptid-rumored-obscura-vulnerability"}, // Obscura Vulnerability
            {pack: "pf2e.bestiary-family-ability-glossary", id:"Bqnh5wiXVymfDgTw", slug: "cryptid-rumored-burning-eyes"}, // Burning Eyes
            {pack: "pf2e.bestiary-family-ability-glossary", id:"qfDwBrCXeIYp0W8T", slug: "cryptid-rumored-creature-obscura"}, // Creature Obscura
            {pack: "pf2e.bestiary-family-ability-glossary", id:"XpGCN9KJN0CCIlzU", slug: "cryptid-rumored-stalk"}, // Stalk
            {pack: "pf2e.bestiary-family-ability-glossary", id:"N9OUII3LfRr6hNP8", slug: "cryptid-rumored-vanishing-escape"}, // Vanishing Escape
            {pack: "pf2e.bestiary-family-ability-glossary", id:"K0scCV18j5FzM2ei", slug: "cryptid-rumored-shifting-form"} // Shifting Form
        ],
        optionalAbilities: [
            {pack: "pf2e.bestiary-family-ability-glossary", id:"a7SNHoP22SBoOAmA", slug: "cryptid-rumored-hybrid-form", name:"Hybrid Form"}, // Hybrid Form
            {pack: "pf2e.bestiary-family-ability-glossary", id:"KLMdplDgOfXSLh6g", slug: "cryptid-rumored-howl", name:"Howl"} // Howl
        ],
        specialAdjustments: async function (actor: NPCPF2e) {
            const system = actor.system;
            const updateData: any = {};
            // add darvision of greater-darkvision for burning eyes ability
            const oldSenses = system.perception.senses;
            const newSense: any = {
                "acuity": "precise",
                "emphasizeLabel": false,
                "range": Infinity,
                "source": null
            }
            if (oldSenses.some((sense) => sense.type === "darkvision")) {
                newSense["type"] = "greater-darkvision";
                newSense["label"] = "Greater Darkvision";
                updateData["system.perception.senses"] = [...oldSenses, newSense];
            } else {
                newSense["type"] = "darkvision";
                newSense["label"] = "Darkvision";
                updateData["system.perception.senses"] = [...oldSenses, newSense];
            }
            // add a new speed type if the creature has Hybrid Form optional ability
            if (actor.items.some((i) => i.system.slug === "cryptid-rumored-hybrid-form")) {
                // apply speed adjustment for hybrid form
                let speedType: string | null = null;
                await foundry.applications.api.DialogV2.wait({
                    window: {
                        title: "Select Hybrid Form Speed",
                    },
                    content:
                        `<p>Select Hybrid Form Speed Type</p>` +
                        `<div class="form-group"><label>Adjustment</label><select id="speedType">` +
                        `<option value="burrow">Burrow</option>` +
                        `<option value="climb">Climb</option>` +
                        `<option value="swim">Swim</option>` +
                        `</select></div>`,
                    buttons: [
                        {
                            icon: '<i class="fa-solid fa-level-up-alt"></i>',
                            label: "Select",
                            action: "select",
                            default: true,
                            callback: async (_event, button, _dialog) => {
                                speedType = (button?.form?.elements.namedItem("speedType") as HTMLSelectElement | null)?.value ?? null;
                            },
                        },
                    ],
                });
                const speed = system.movement.speeds.land.value;
                updateData['system.attributes.speed.otherSpeeds'] = [{ type: speedType, value: speed }];
            }
            await actor.update(updateData);
        }
    }
}