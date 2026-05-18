/*
 * Copyright 2021 Andrew Cuccinello, 2022 Jonas Karlsson
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ActorPF2e } from "foundry-pf2e";

export function getFolder(name: string) {
    return game.folders?.getName(name);
}

export function getFolderInFolder(name: string, parentName?: string) {
    let parent: any;
    if (parentName) {
        parent = game.folders?.getName(parentName);
        return parent.getSubfolders().find((f) => f.name === name);
    } else {
        return getFolder(name);
    }
}

export function getActor(name: string, folder: string): ActorPF2e | undefined {
    return game.actors?.find((a) => a.name === name && a.folder?.name === folder);
}

export function getDC(level: number, difficulty: "inc-easy" | "very-easy" | "easy" | "standard" | "hard" | "very-hard" | "inc-hard"): number {
    const baseDCs = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50];
    const difficultyAdjustments: Record<string, number> = {
        "inc-easy": -10,
        "very-easy": -5,
        "easy": -2,
        "standard": 0,
        "hard": 2,
        "very-hard": 5,
        "inc-hard": 10,
    };
    return baseDCs[level] + difficultyAdjustments[difficulty];
}
