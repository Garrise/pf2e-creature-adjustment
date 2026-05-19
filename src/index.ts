import { NPCPF2e } from "foundry-pf2e";
import { applyCreatureAdjustment } from "./CreatureAdjustmentApplier";
import { CreatureTemplate } from "./CreatureTemplate";
import { localize, format } from "./localization";
Hooks.on('renderActorSheet', async (sheet, html) => {
    const actor = sheet.object
    if (actor?.type !== 'npc') {
        return;
    }

    if (!actor.canUserModify(game.user!, 'update')) {
        return;
    }
    const element = html.find('.window-header .window-title');
    const label = localize("PF2ECREATUREADJUSTMENT.buttonEntry");
    const button = $(
        `<a class="popout" style><i style="padding: 0 4px;" class="fas fa-book"></i>${label}</a>`,
    );
    const options = CreatureTemplate.getList();
    let optionElements = '';
    options.forEach((option) => {
        optionElements += `<option value="${option.key}">${option.name}</option>`;
    });

    button.on('click', async () => {
        // open main dialog
        await foundry.applications.api.DialogV2.wait({
            window: {
                title: localize("PF2ECREATUREADJUSTMENT.mainDialog.title"),
            },
            content:
                `<p>${localize("PF2ECREATUREADJUSTMENT.mainDialog.description")}</p>` +
                `<div><select id="adjustment">` +
                optionElements +
                `</select></div>`,
            buttons: [
                {
                    icon: '<i class="fa-solid fa-level-up-alt"></i>',
                    label: localize("PF2ECREATUREADJUSTMENT.mainDialog.buttonApply"),
                    action: "apply",
                    default: true,
                    callback: async (_event, button, _dialog) => {
                        ui.notifications?.info(localize("PF2ECREATUREADJUSTMENT.notification.applying"));
                        const adjustment = button?.form?.elements["adjustment"].value;
                        const adjustmentName = options.find((option) => option.key === adjustment)?.name || adjustment;
                        const originalName = actor.name;
                        await applyCreatureAdjustment(actor, adjustment);
                        ui.notifications?.info(
                            format("PF2ECREATUREADJUSTMENT.notification.applied", {
                                adjustment: adjustmentName,
                                name: originalName,
                            }),
                        );
                    },
                },
            ],
        });
    })
    element.after(button);
})