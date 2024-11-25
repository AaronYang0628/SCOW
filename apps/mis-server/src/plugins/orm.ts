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

import { plugin } from "@ddadaal/tsgrpc-server";
import { MikroORM } from "@mikro-orm/core";
import { Migrator } from "@mikro-orm/migrations";
import { defineConfig, MySqlDriver } from "@mikro-orm/mysql";
import { SeedManager } from "@mikro-orm/seeder";
import { join } from "path";
import { config } from "src/config/env";
import { misConfig } from "src/config/mis";
import { DatabaseSeeder } from "src/seeders/DatabaseSeeder";

import { entities } from "../entities";

const distPath = process.env.NODE_ENV === "production" ? "build" : "src";

export const ormConfigs = defineConfig({
  host: misConfig.db.host,
  port: misConfig.db.port,
  user: misConfig.db.user,
  dbName: config.DB_NAME ?? misConfig.db.dbName,
  password: config.DB_PASSWORD ?? misConfig.db.password,
  forceUndefined: true,
  extensions: [Migrator, SeedManager],
  migrations: {
    path: join(distPath, "migrations"),
    glob: "*.{js,ts}",
  },
  entities,
  debug: misConfig.db.debug,
  seeder: {
    path: join(distPath, "seenders"),
  },
});

export const ormPlugin = plugin(async (server) => {
  // create the database if not exists.

  const logger = server.logger.child({ plugin: "orm" });

  const orm = await MikroORM.init<MySqlDriver>({
    ...ormConfigs,
    logger: (msg) => logger.info(msg),
  });

  const schemaGenerator = orm.getSchemaGenerator();
  await schemaGenerator.ensureDatabase();
  await orm.getMigrator().up();

  await orm.getSeeder().seed(DatabaseSeeder);

  server.addExtension("orm", orm);

  server.addRequestHook((req) => {
    req.em = orm.em.fork();
  });

  server.addCloseHook(async () => {
    logger.info("Closing db connection.");
    await orm.close();
    logger.info("db connection has been closed.");
  });

});
