/**
 * Copyright (c) 2022 Peking University and Peking University Institute for Computing and Digital Economy
 * OpenSCOW is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2.
 * You may obtain a copy of Mulan PSL v2 at:
 *          http://license.coscl.org.cn/MulanPSL2
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT,
 * MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.
 * See the Mulan PSL v2 for more details.
 */

import { existsSync, readFileSync } from "fs";
// import { join } from "path";

interface VersionJsonInfo {
  tag?: string;
  commit: string;
}

export type VersionInfo = VersionJsonInfo;

export function readVersionFile(versionJsonFileName = "version.json") {

  const jsonInfo: VersionInfo = existsSync(versionJsonFileName)
    ? JSON.parse(readFileSync(versionJsonFileName, "utf-8"))
    : {};

  return jsonInfo;
}


// SemVer类型version
export interface ApiVersion {
  major: number;
  minor: number;
  patch: number;
};
