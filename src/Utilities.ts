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
import Papa from "papaparse";

async function loadCsv(filename: string): Promise<any[]> {
    const csvPath = `data/${filename}.csv`;
    try {
        const response = await fetch(csvPath);
        if (!response.ok) {
            throw new Error(`Failed to load CSV file: ${filename}`);
        }
        const csvText =  await response.text();
        const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });
        if (results.errors.length > 0) {
            throw new Error(`Failed to parse CSV file: ${filename}`);
        }
        return results.data;
    } catch (error) {
        throw error;
    }
}

function loadCsvString(csvString: string): any[] {
    const csvText =  csvString;
    const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: function(value, columnName) {
            if (typeof value === 'string' && /^\+\d+$/.test(value.trim())) {
                return Number(value.trim());
            } else if (typeof value === 'string' && /^-\d+$/.test(value.trim())) {
                return Number(value.trim());
            } else {
                return value;
            }
        }
    });
    if (results.errors.length > 0) {
        throw new Error(`Failed to parse CSV string`);
    }
    return results.data;
}

export function getFolder(name: string) {
    return game.folders?.getName(name);
}

export function getFolderInFolder(name: string, parentName?: string) {
    let parent: any;
    if (parentName) {
        parent = game.folders?.getName(parentName);
        return parent.getSubfolders().find((f: any) => f.name === name);
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

export  function getStrikeAttackBonus(level: number, power: "extreme" | "high" | "moderate" | "low"): number {
    const csvString = 
`Level	Extreme	High	Moderate	Low
–1	+10	+8	+6	+4
0	+10	+8	+6	+4
1	+11	+9	+7	+5
2	+13	+11	+9	+7
3	+14	+12	+10	+8
4	+16	+14	+12	+9
5	+17	+15	+13	+11
6	+19	+17	+15	+12
7	+20	+18	+16	+13
8	+22	+20	+18	+15
9	+23	+21	+19	+16
10	+25	+23	+21	+17
11	+27	+24	+22	+19
12	+28	+26	+24	+20
13	+29	+27	+25	+21
14	+31	+29	+27	+23
15	+32	+30	+28	+24
16	+34	+32	+30	+25
17	+35	+33	+31	+27
18	+37	+35	+33	+28
19	+38	+36	+34	+29
20	+40	+38	+36	+31
21	+41	+39	+37	+32
22	+43	+41	+39	+33
23	+44	+42	+40	+35
24	+46	+44	+42	+36
`;
    const data = loadCsvString(csvString);
    const index = level + 1; // level start from -1
    const attackBonus: number = data[index]?.[capitalize(power)];
    return attackBonus;
}

export  function getStrikeDamage(level: number, power: "extreme" | "high" | "moderate" | "low"): {dice: number, die: string, modifier: number} {
    const csvString = 
`Level	Extreme	High	Moderate	Low
–1	1d6+1 (4)	1d4+1 (3)	1d4 (3)	1d4 (2)
0	1d6+3 (6)	1d6+2 (5)	1d4+2 (4)	1d4+1 (3)
1	1d8+4 (8)	1d6+3 (6)	1d6+2 (5)	1d4+2 (4)
2	1d12+4 (11)	1d10+4 (9)	1d8+4 (8)	1d6+3 (6)
3	1d12+8 (15)	1d10+6 (12)	1d8+6 (10)	1d6+5 (8)
4	2d10+7 (18)	2d8+5 (14)	2d6+5 (12)	2d4+4 (9)
5	2d12+7 (20)	2d8+7 (16)	2d6+6 (13)	2d4+6 (11)
6	2d12+10 (23)	2d8+9 (18)	2d6+8 (15)	2d4+7 (12)
7	2d12+12 (25)	2d10+9 (20)	2d8+8 (17)	2d6+6 (13)
8	2d12+15 (28)	2d10+11 (22)	2d8+9 (18)	2d6+8 (15)
9	2d12+17 (30)	2d10+13 (24)	2d8+11 (20)	2d6+9 (16)
10	2d12+20 (33)	2d12+13 (26)	2d10+11 (22)	2d6+10 (17)
11	2d12+22 (35)	2d12+15 (28)	2d10+12 (23)	2d8+10 (19)
12	3d12+19 (38)	3d10+14 (30)	3d8+12 (25)	3d6+10 (20)
13	3d12+21 (40)	3d10+16 (32)	3d8+14 (27)	3d6+11 (21)
14	3d12+24 (43)	3d10+18 (34)	3d8+15 (28)	3d6+13 (23)
15	3d12+26 (45)	3d12+17 (36)	3d10+14 (30)	3d6+14 (24)
16	3d12+29 (48)	3d12+18 (37)	3d10+15 (31)	3d6+15 (25)
17	3d12+31 (50)	3d12+19 (38)	3d10+16 (32)	3d6+16 (26)
18	3d12+34 (53)	3d12+20 (40)	3d10+17 (33)	3d6+17 (27)
19	4d12+29 (55)	4d10+20 (42)	4d8+17 (35)	4d6+14 (28)
20	4d12+32 (58)	4d10+22 (44)	4d8+19 (37)	4d6+15 (29)
21	4d12+34 (60)	4d10+24 (46)	4d8+20 (38)	4d6+17 (31)
22	4d12+37 (63)	4d10+26 (48)	4d8+22 (40)	4d6+18 (32)
23	4d12+39 (65)	4d12+24 (50)	4d10+20 (42)	4d6+19 (33)
24	4d12+42 (68)	4d12+26 (52)	4d10+22 (44)	4d6+21 (35)    
`;
    const data = loadCsvString(csvString);
    const index = level + 1; // level start from -1
    const rawDamage = data[index]?.[capitalize(power)];
    const damage = rawDamage.split(" (")[0];
    const match = damage.match(/^(\d+)(d\d+)([+-]\d+)$/);
    if (match) {
        const dice = parseInt(match[1]);
        const die = match[2];
        const modifier = parseInt(match[3]);
        return {
            dice,
            die,
            modifier
        };
    } else {
        throw new Error(`Failed to parse damage: ${rawDamage}`);
    }
}

const capitalize = (str: string): string => 
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
