import { NPCPF2e } from "foundry-pf2e";
import { applyCreatureAdjustment } from "./CreatureAdjustmentApplier";
import { CreatureTemplate } from "./CreatureTemplate";
Hooks.on('renderActorSheet', async (sheet, html) => {
    const actor = sheet.object
    if (actor?.type !== 'npc') {
        return;
    }

    if (!actor.canUserModify(game.user!, 'update')) {
        return;
    }
    const element = html.find('.window-header .window-title');
    const label = "Adjustment";
    const button = $(
        `<a class="popout" style><i style="padding: 0 4px;" class="fas fa-book"></i>${label}</a>`,
    );
    const options = CreatureTemplate.getList();
    let optionElements = '';
    options.forEach((option) => {
        optionElements += `<option value="${option.key}">${option.name}</option>`;
    });

    button.on('click', async () => {
        await foundry.applications.api.DialogV2.wait({
            window: {
                title: "Apply NPC Adjustment",
            },
            content:
                `<p>Apply a specific adjustment to the selected NPC.</p>` +
                `<div class="form-group"><label>Adjustment</label><select id="adjustment">` +
                optionElements +
                `</select></div>`,
            buttons: [
                {
                    icon: '<i class="fa-solid fa-level-up-alt"></i>',
                    label: "Apply",
                    action: "apply",
                    default: true,
                    callback: async (_event, button, _dialog) => {
                        ui.notifications?.info(`Apply adjustment to NPC... please wait.`);
                        const adjustment = button?.form?.elements["adjustment"].value;
                        await applyCreatureAdjustment(actor, adjustment);
                        ui.notifications?.info(`Apply ${adjustment} adjustment to ${actor.name}.`);
                    },
                },
            ],
        });
    })
    element.after(button);
})