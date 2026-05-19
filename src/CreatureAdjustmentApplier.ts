import { getActor, getFolder, getFolderInFolder } from "./Utilities";
import { AbilityItemPF2e, ItemPF2e, NPCPF2e, NPCSystemData } from "foundry-pf2e";
import { logDebug } from "./utils/utils";
import { IDataUpdates, IHandledItemType } from "./NPCTypes";
import { CompendiumCollection } from "foundry-pf2e/foundry/client/documents/collections/_module.mjs";
import { CreatureTemplate } from "./CreatureTemplate";
import { localize } from "./localization";

export async function applyCreatureAdjustment(actor: NPCPF2e, adjustment: string): Promise<void> {
    const rootFolder = getFolder("cr-scaler");

    const folderName = `Adjusted Creatures`;
    const folder =
        getFolderInFolder(folderName, rootFolder?.name as string) ??
        (await Folder.create({
            name: folderName,
            type: "Actor",
            parent: rootFolder ? rootFolder.id : "",
        })) as Folder;

    const system: NPCSystemData = <NPCSystemData>actor.system;
    const updateData: Record<string, unknown> = {
        folder: folder.id
    };
    const template = new CreatureTemplate(adjustment);
    const itemUpdates: IDataUpdates[] = [];
    const itemAdds: Array<any> = [];

    // apply name adjustment
    updateData["name"] = `${template.prefix}${actor.name}`;

    // apply level adjustment
    const oldLevel = system.details.level.value;
    if (template.level) {
        const newLevel = oldLevel + template.level;
        updateData["system.details.level.value"] = newLevel;
    }

    // apply rarity adjustment
    if (template.rarity) {
        if (typeof template.rarity === "function") {
            updateData["system.traits.rarity"] = template.rarity(system.traits.rarity);
        } else {
            updateData["system.traits.rarity"] = template.rarity;
        }
    }

    // apply traits adjustments
    if (template.traitsToAdd || template.traitsToRemove) {
        const oldTraits = system.traits.value;
        let traitsToAdd: string[] = [];
        let traitsToRemove: string[] = [];
        if (typeof template.traitsToAdd === "function") {
            traitsToAdd = [...traitsToAdd, ...template.traitsToAdd(oldTraits) as string[]];
        } else if (Array.isArray(template.traitsToAdd)) {
            traitsToAdd = [...traitsToAdd, ...(template.traitsToAdd as string[])];
        }
        if (typeof template.traitsToRemove === "function") {
            traitsToRemove = [...traitsToRemove, ...template.traitsToRemove(oldTraits) as string[]];
        } else if (Array.isArray(template.traitsToRemove)) {
            traitsToRemove = [...traitsToRemove, ...(template.traitsToRemove as string[])];
        }
        const newTraits = oldTraits.filter((trait) => !traitsToRemove.includes(trait)).concat(traitsToAdd);
        updateData["system.traits.value"] = newTraits;
    }
    
    // apply size adjustment
    if (template.size) {
        const oldSize = system.traits.size.value;
        if (typeof template.size === "function") {
            updateData["system.traits.size.value"] = template.size(oldSize);
        } else {
            updateData["system.traits.size.value"] = template.size;
        }
    }

    // apply ac adjustment
    if (template.ac) {
        const oldAc = system.attributes.ac.value;
        updateData["system.attributes.ac.value"] = oldAc + template.ac;
    }

    // apply perception adjustment
    if (template.perception) {
        const oldPerception = system.perception.mod;
        updateData["system.perception.mod"] = oldPerception + template.perception;
    }
    
    // apply saves adjustment
    if (template.saves) {
        for (const [key, adjustment] of Object.entries(template.saves)) {
            const oldValue = system.saves[key as keyof typeof system.saves].value;
            updateData[`system.saves.${key}.value`] = oldValue + adjustment;
        }
    }

    // apply attribute adjustments
    if (template.attributes) {
        for (const [key, adjustment] of Object.entries(template.attributes)) {
            const oldValue = system.abilities[key as keyof typeof system.abilities].mod;
            if (typeof template.attributes[key] === "function") {
                updateData[`system.abilities.${key}.mod`] = template.attributes[key](oldValue) as number;
            } else {
                updateData[`system.abilities.${key}.mod`] = template.attributes[key] as number;
            }
        }
    }

    // apply skill adjustments
    if (template.skills) {
        let maxSkillModifier = 0;
        for (const [key, attr] of Object.entries(system.skills).filter(([, attr]) => attr.base > 0)) {
            const skillAttr = attr as unknown as { mod: string; value: string; base: string };
            const mod = parseInt(skillAttr.mod);
            if (mod > maxSkillModifier) {
                maxSkillModifier = mod;
            }
        }
        for (const [key, adjustment] of Object.entries(system.skills)) {
            if (key === "all") {
                continue; // "all" is handled separately below
            }
            const skill = template.skills[key];
            const skillAttr = adjustment as unknown as { mod: string; value: string; base: string };
            const mod = parseInt(skillAttr.mod);
            if (skill === "max") {
                updateData[`system.skills.${key}`] = { ...system.skills[key], mod: maxSkillModifier, value: maxSkillModifier, base: maxSkillModifier };
            } else if (typeof skill === "number") {
                const newMod = mod + skill;
                updateData[`system.skills.${key}`] = { ...system.skills[key], mod: newMod, value: newMod, base: newMod };
            }
        }
        if (template.skills["all"] === "max") {
            for (const [key, attr] of Object.entries(system.skills).filter(([, attr]) => attr.base > 0)) {
                const skillAttr = attr as unknown as { mod: string; value: string; base: string };
                const mod = parseInt(skillAttr.mod);
                updateData[`system.skills.${key}`] = { ...system.skills[key], mod: maxSkillModifier, value: maxSkillModifier, base: maxSkillModifier };
            }
        } else if (typeof template.skills["all"] === "number") {
            for (const [key, attr] of Object.entries(system.skills).filter(([, attr]) => attr.base > 0)) {
                const skillAttr = attr as unknown as { mod: string; value: string; base: string };
                const mod = parseInt(skillAttr.mod);
                const newMod = mod + (template.skills["all"] as number);
                updateData[`system.skills.${key}`] = { ...system.skills[key], mod: newMod, value: newMod, base: newMod };
            }
        }
    }   

    // apply hp adjustment
    if (template.hp) {
        const oldHp = system.attributes.hp.max;
        if (typeof template.hp === "function") {
            updateData["system.attributes.hp.max"] = oldHp + (template.hp(oldLevel) as number);
            updateData["system.attributes.hp.value"] = oldHp + (template.hp(oldLevel) as number);
        } else {
            updateData["system.attributes.hp.max"] = oldHp + (template.hp as number);
            updateData["system.attributes.hp.value"] = oldHp + (template.hp as number);
        }
    }

    // apply item adjustments
    if (template.attack || template.DC || template.damage) {
        const items = actor.items as Collection<string, ItemPF2e>;
        for (const itemId of items.keys()) {
            const itemUpdate: IDataUpdates = {
                _id: itemId,
            };
            const item = items.get(itemId) as ItemPF2e;
            // apply attack adjustment
            if (template.attack) {
                if ((item.type) === "melee") {
                    itemUpdate["system.bonus.value"] = parseInt((item.system as unknown as { bonus: { value: string } }).bonus.value) + template.attack;
                }
            }
            // apply DC adjustment
            if (template.DC) {
                if ((item.type) === "spellcastingEntry") {
                    itemUpdate["system.spelldc.dc"] = parseInt((item.system as unknown as { spelldc: { dc: string } }).spelldc.dc) + template.DC;
                } else if (item.type === "action") {
                    const description = (item.system as any)?.description?.value ?? "";

                    // Replace all @Check[{type}|dc:{value}] occurrences and increment the value after the dice
                    const newDescription = description.replace(/@Check\[(.*?)\]/g, (_full: any, inner: string) => {
                        // inner is like: fortitude|dc:20... or reflex|dc:21|basic|name:Flame Lash|options:area-effect
                        const m = inner.match(/^(.*?)(\|dc:(\d+))(.*)$/);
                        if (!m) return `@Check[${inner}]`;
                        const before = m[1];
                        const dcPart = m[2];
                        const dcValue = parseInt(m[3]);
                        const after = m[4] ?? "";
                        const newDcValue = dcValue + template.DC;
                        return `@Check[${before}|dc:${newDcValue}${after}]`;
                    });
                    if (newDescription !== description) {
                        itemUpdate["system.description.value"] = newDescription;
                    }
                }
            }
            // apply damage adjustment
            if (template.damage) {
                if ((item.type) === "melee") {
                    const damage = (item.system as unknown as { damageRolls: unknown }).damageRolls as { damage: string; damageType: string }[] | Record<string, { damage: string; damageType: string }>;
                    if (Array.isArray(damage)) {
                        for (let i = 0; i < damage.length; i++) {
                            const damageRoll = damage[i].damage.split("+")[0].trim();
                            const damageModifier = damage[i].damage.split("+")[1] ? parseInt(damage[i].damage.split("+")[1].trim()) : 0;
                            itemUpdate[`system.damageRolls.${i}.damage`] = damageRoll + " + " + (damageModifier + 1);
                            itemUpdate[`system.damageRolls.${i}.damageType`] = damage[i].damageType;
                        }
                    } else {
                        for (const key in damage) {
                            const damageRoll = damage[key].damage.split("+")[0].trim();
                            const damageModifier = damage[key].damage.split("+")[1] ? parseInt(damage[key].damage.split("+")[1].trim()) : 0;
                            itemUpdate[`system.damageRolls.${key}.damage`] = damageRoll + " + " + (damageModifier + 1);
                            itemUpdate[`system.damageRolls.${key}.damageType`] = damage[key].damageType;
                            break; // Only apply once
                        }
                    }
                } else if (item.type === "action") {
                    const frequency = (item.system as unknown as { frequency?: { value?: string } })?.frequency?.value ?? null;
                    let description = (item.system as any)?.description?.value ?? "";
                    if (itemUpdate["system.description.value"]) {
                        description = itemUpdate["system.description.value"];
                    }
                    // Replace all @Damage[...] occurrences and increment the flat modifier after the dice
                    const newDescription = description.replace(/@Damage\[(.*?)\]/g, (_full: any, inner: string) => {
                        // inner is like: 7d6[cold]|options:area-damage  OR 7d6+3[cold]|...
                        const m = inner.match(/^(\d+d\d+)([+-]\d+)?(.*)$/);
                        if (!m) return `@Damage[${inner}]`;
                        const dice = m[1];
                        const existingMod = m[2] ? parseInt(m[2]) : 0;
                        const rest = m[3] ?? "";
                        const inc = frequency ? 2 : 1;
                        const newMod = existingMod + inc;
                        const modStr = newMod >= 0 ? `+${newMod}` : `${newMod}`;
                        return `@Damage[${dice}${modStr}${rest}]`;
                    });
                    if (newDescription !== description) {
                        itemUpdate["system.description.value"] = newDescription;
                    }
                }
            }
            itemUpdates.push(itemUpdate);
        }
    }

    // apply abilities adjustments
    if (template.abilities) {
        template.abilities.forEach((ability: {pack: string, id: string}) => {
            const pack = game.packs.get(ability.pack) as CompendiumCollection;
            pack.getDocument(ability.id).then(doc => {
                const abilityItemData = doc?.toJSON()
                itemAdds.push(abilityItemData)
            });
        });
    }

    // apply optional abilities adjustments
    if (template.optionalAbilities) {
        let optionalAbilities: string[] = [];
        let inputOptions = "";
        for (const ability of template.optionalAbilities) {
            inputOptions += `<label><input type="checkbox" name="optionalAbilities" value="${ability.id}"/>${localize(ability.name)}</label>`;
        }
        // open dialog to select optional abilities
        await foundry.applications.api.DialogV2.wait({
            window: {
                title: localize("PF2ECREATUREADJUSTMENT.optionalAbilitiesDialog.title"),
            },
            content:
                `<p>${localize("PF2ECREATUREADJUSTMENT.optionalAbilitiesDialog.description")}</p>` +
                `<div>` +
                    inputOptions +
                `</select></div>`,
            buttons: [
                {
                    icon: '<i class="fa-solid fa-level-up-alt"></i>',
                    label: localize("PF2ECREATUREADJUSTMENT.optionalAbilitiesDialog.button"),
                    action: "select",
                    default: true,
                    callback: (_event, button, _dialog) => {
                        const form = button?.form as HTMLFormElement | undefined;
                        if (!form) return;

                        optionalAbilities = Array.from(
                            form.querySelectorAll<HTMLInputElement>('input[name="optionalAbilities"]:checked'),
                        ).map((input) => input.value);
                        optionalAbilities.forEach((abilityId) => {
                            const ability = template.optionalAbilities?.find((a) => a.id === abilityId);
                            if (!ability) return;
                            const pack = game.packs.get(ability.pack) as CompendiumCollection;
                            pack.getDocument(ability.id).then(doc => {
                                const abilityItemData = doc?.toJSON()
                                itemAdds.push(abilityItemData)
                            });
                        });
                    },
                },
            ],
        });
    }

    // update actor
    await actor.update(updateData);
    // combine item updates with same _id
    const combinedUpdates: Record<string, IDataUpdates> = {};
    itemUpdates.forEach((update) => {
        if (!combinedUpdates[update._id]) {
            combinedUpdates[update._id] = update;
        } else {
            combinedUpdates[update._id] = { ...combinedUpdates[update._id], ...update };
        }
    });
    await actor.updateEmbeddedDocuments("Item", Object.values(combinedUpdates));
    // add items that are not already on the actor
    const itemsToCreate = itemAdds.filter((item) => {
        return !actor.items.some((i) => i.name === item.name);
    });
    if (itemsToCreate.length > 0) {
        await actor.createEmbeddedDocuments("Item", itemsToCreate);
    }
    // apply special adjustments
    if (template.specialAdjustments) {
        await template.specialAdjustments(actor);
    }
    // fill up hp after all adjustments are done
    const updatedHp = actor.system.attributes.hp.max;
    await actor.update({ "system.attributes.hp.value": updatedHp });
}
