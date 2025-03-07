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

import { PictureOutlined } from "@ant-design/icons";
import { Avatar, Card, Col, Result, Row, Spin, Tooltip } from "antd";
import Link from "next/link";
import { join } from "path";
import { useCallback, useState } from "react";
import { useAsync } from "react-async";
import { api } from "src/apis";
import { prefix, useI18nTranslateToString } from "src/i18n";
import { publicConfig } from "src/utils/config";
import { styled } from "styled-components";

const CardContainer = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
`;

const AvatarContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const NameContainer = styled.div`
  text-align: center;
  margin-top: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;


interface Props {
  clusterId: string;
}

type ImageErrorMap = Record<string, boolean>;

const p = prefix("pageComp.app.createApps.");

export const CreateAppsTable: React.FC<Props> = ({ clusterId }) => {

  const t = useI18nTranslateToString();

  const { data, isLoading } = useAsync({ promiseFn: useCallback(async () => {
    return await api.listAvailableApps({ query: { cluster: clusterId } });
  }, [clusterId]) });

  const [imageErrorMap, setImageErrorMap] = useState<ImageErrorMap>({});

  const handleImageError = (appId: string) => {
    setImageErrorMap((prevMap) => ({ ...prevMap, [appId]: true }));
  };

  if (!isLoading && data?.apps.length === 0) {
    return (
      <Result
        status="404"
        title={"404"}
        subTitle={t(p("notFoundMessage"))}
      />
    );
  }

  return (
    <Spin spinning={isLoading} tip={isLoading ? t(p("loading")) : ""} style={{ marginTop: "150px" }}>
      <CardContainer>
        <Row gutter={16} style={{ flex: 1, width: "100%" }}>
          {data?.apps.map((app) => (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4} key={app.id} style={{ marginBottom: "16px" }}>
              <Card bodyStyle={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <Tooltip title={`${t(p("create"))}${app.name}`} placement="bottom">
                  <Link href={`/apps/${clusterId}/create/${app.id}`}>
                    <AvatarContainer>
                      {
                        (app.logoPath && imageErrorMap[app.id] !== true) ? (
                          <img
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              objectFit: "contain",
                              width: "150px",
                              height: "150px",
                            }}
                            src={join(publicConfig.PUBLIC_PATH, app.logoPath)}
                            onError={() => handleImageError(app.id)}
                          />
                        ) : (
                          <Avatar
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "0",
                            }}
                            size={150}
                            icon={<PictureOutlined />}
                          />
                        )
                      }
                    </AvatarContainer>
                    <NameContainer>{app.name}</NameContainer>
                  </Link>
                </Tooltip>
              </Card>
            </Col>
          ))}
        </Row>
      </CardContainer>
    </Spin>
  );
};
