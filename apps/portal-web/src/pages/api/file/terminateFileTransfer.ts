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

import { typeboxRouteSchema } from "@ddadaal/next-typed-api-routes-runtime";
import { asyncUnaryCall } from "@ddadaal/tsgrpc-client";
import { status } from "@grpc/grpc-js";
import { FileServiceClient } from "@scow/protos/build/portal/file";
import { Type } from "@sinclair/typebox";
import { authenticate } from "src/auth/server";
import { getClient } from "src/utils/client";
import { route } from "src/utils/route";
import { handlegRPCError } from "src/utils/server";

export const TerminateFileTransferSchema = typeboxRouteSchema({
  method: "POST",

  body: Type.Object({
    fromCluster: Type.String(),
    toCluster: Type.String(),
    fromPath: Type.String(),
  }),

  responses: {
    204: Type.Null(),
    415: Type.Object({
      code: Type.Literal("SCOW_SYNC_TERMINATE_CMD_FAILED"),
      // stderr of the scow-sync command
      error: Type.String(),
    }),
    400: Type.Object({ code: Type.Literal("INVALID_CLUSTER") }),
  },
});

const auth = authenticate(() => true);

export default route(TerminateFileTransferSchema, async (req, res) => {

  const info = await auth(req, res);

  if (!info) { return; }

  const { fromCluster, toCluster, fromPath } = req.body;

  const client = getClient(FileServiceClient);

  return asyncUnaryCall(client, "terminateFileTransfer", {
    userId: info.identityId,
    fromCluster: fromCluster,
    toCluster: toCluster,
    fromPath: fromPath,
  }).then(() => ({ 204: null }), handlegRPCError({
    [status.INTERNAL]: (e) => ({ 415: { code: "SCOW_SYNC_TERMINATE_CMD_FAILED" as const, error: e.details } }),
    [status.NOT_FOUND]: () => ({ 400: { code: "INVALID_CLUSTER" as const } }),
  }));
});
