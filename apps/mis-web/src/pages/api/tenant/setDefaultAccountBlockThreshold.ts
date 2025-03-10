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
import { asyncClientCall } from "@ddadaal/tsgrpc-client";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { numberToMoney } from "@scow/lib-decimal";
import { OperationType } from "@scow/lib-operation-log";
import { TenantServiceClient } from "@scow/protos/build/server/tenant";
import { Type } from "@sinclair/typebox";
import { authenticate } from "src/auth/server";
import { OperationResult } from "src/models/operationLog";
import { TenantRole } from "src/models/User";
import { callLog } from "src/server/operationLog";
import { getClient } from "src/utils/client";
import { route } from "src/utils/route";
import { handlegRPCError, parseIp } from "src/utils/server";

export const SetDefaultAccountBlockThresholdSchema = typeboxRouteSchema({
  method: "PUT",

  body: Type.Object({
    tenantName: Type.String(),
    blockThresholdAmount: Type.Number(),
  }),

  responses: {
    200: Type.Object({
      executed: Type.Boolean(),
      reason: Type.Optional(Type.String()),
    }),
  },
});
export default /* #__PURE__*/route(SetDefaultAccountBlockThresholdSchema, async (req, res) => {

  const { tenantName, blockThresholdAmount } = req.body;

  const auth = authenticate((u) => {
    return u.tenantRoles.includes(TenantRole.TENANT_ADMIN);
  });

  const info = await auth(req, res);

  if (!info) { return; }

  const client = getClient(TenantServiceClient);

  const logInfo = {
    operatorUserId: info.identityId,
    operatorIp: parseIp(req) ?? "",
    operationTypeName: OperationType.setAccountDefaultBlockThreshold,
    operationTypePayload:{
      tenantName, thresholdAmount: numberToMoney(blockThresholdAmount),
    },
  };

  return await asyncClientCall(client, "setDefaultAccountBlockThreshold", {
    tenantName,
    blockThresholdAmount: numberToMoney(blockThresholdAmount),
  })
    .then(async () => {
      await callLog(logInfo, OperationResult.SUCCESS);
      return { 200: {
        executed: true,
      } };
    })
    .catch(handlegRPCError({
      [Status.NOT_FOUND]: (e) => ({ 200: { executed: false, reason: e.details } }),
    },
    async () => await callLog(logInfo, OperationResult.FAIL),
    ));
});
