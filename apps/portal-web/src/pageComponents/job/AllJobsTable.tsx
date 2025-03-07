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

import { QuestionCircleOutlined } from "@ant-design/icons";
import { formatDateTime, getDefaultPresets } from "@scow/lib-web/build/utils/datetime";
import { compareNumber, compareTimeAsSeconds } from "@scow/lib-web/build/utils/math";
import { DEFAULT_PAGE_SIZE } from "@scow/lib-web/build/utils/pagination";
import { JobInfo } from "@scow/protos/build/portal/job";
import { Button, DatePicker, Form, InputNumber, Popover, Space, Table } from "antd";
import dayjs from "dayjs";
import Router from "next/router";
import { join } from "path";
import React, { useCallback, useMemo, useState } from "react";
import { useAsync } from "react-async";
import { useStore } from "simstate";
import { api } from "src/apis";
import { SingleClusterSelector } from "src/components/ClusterSelector";
import { ClusterNotAvailablePage } from "src/components/errorPages/ClusterNotAvailablePage";
import { FilterFormContainer } from "src/components/FilterFormContainer";
import { prefix, useI18n, useI18nTranslateToString } from "src/i18n";
import { ClusterInfoStore } from "src/stores/ClusterInfoStore";
import { Cluster } from "src/utils/cluster";

interface FilterForm {
  time: [dayjs.Dayjs, dayjs.Dayjs];
  jobId: number | undefined;
  cluster: Cluster;
}

interface Props {
  userId: string;
}

export const AllJobQueryTable: React.FC<Props> = ({
  userId,
}) => {

  const { currentClusters, defaultCluster } = useStore(ClusterInfoStore);

  if (!defaultCluster && currentClusters.length === 0) {
    return <ClusterNotAvailablePage />;
  }

  const [query, setQuery] = useState<FilterForm>(() => {
    const now = dayjs();
    return {
      time: [now.subtract(1, "week").startOf("day"), now.endOf("day")],
      jobId: undefined,
      cluster: defaultCluster ?? currentClusters[0],
    };
  });

  const [form] = Form.useForm<FilterForm>();

  const languageId = useI18n().currentLanguage.id;

  const promiseFn = useCallback(async () => {
    return await api.getAllJobs({ query: {
      cluster: query.cluster.id,
      startTime: query.time[0].toISOString(),
      endTime: query.time[1].toISOString(),
    } });
  }, [userId, query.cluster, query.time]);

  const { data, isLoading, reload } = useAsync({ promiseFn });

  const filteredData = useMemo(() => {
    if (!data) { return undefined; }

    let filtered = data.results;
    if (query.jobId) {
      filtered = filtered.filter((x) => x.jobId === query.jobId);
    }

    return filtered;
  }, [data, query.jobId]);

  const t = useI18nTranslateToString();
  const p = prefix("pageComp.job.allJobsTable.searchForm.");

  return (
    <div>
      <FilterFormContainer>
        <Form<FilterForm>
          layout="inline"
          form={form}
          initialValues={query}
          onFinish={async () => {
            setQuery({
              ...(await form.validateFields()),
            });
          }}
        >
          <Form.Item label={t(p("clusterLabel"))} name="cluster">
            <SingleClusterSelector />
          </Form.Item>
          <Form.Item
            label={(
              <Space>
                {t(p("time"))}
                <Popover
                  title={t(p("popoverTitle"))}
                >
                  <QuestionCircleOutlined />
                </Popover>
              </Space>
            )}
            name="time"
          >
            <DatePicker.RangePicker
              showTime
              presets={getDefaultPresets(languageId)}
              allowClear={false}
            />
          </Form.Item>
          <Form.Item label={t(p("jobId"))} name="jobId">
            <InputNumber style={{ minWidth: "160px" }} min={1} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">{t("button.searchButton")}</Button>
          </Form.Item>
          <Form.Item>
            <Button loading={isLoading} onClick={reload}>{t("button.refreshButton")}</Button>
          </Form.Item>
        </Form>
      </FilterFormContainer>
      <JobInfoTable
        data={filteredData}
        isLoading={isLoading}
        reload={reload}
        cluster={query.cluster}
      />
    </div>
  );
};

interface JobInfoTableProps {
  data: JobInfo[] | undefined;
  isLoading: boolean;
  reload: () => void;
  cluster: Cluster;
}

export const JobInfoTable: React.FC<JobInfoTableProps> = ({
  data, isLoading, cluster,
}) => {
  const t = useI18nTranslateToString();
  const p = prefix("pageComp.job.allJobsTable.tableInfo.");

  return (
    <Table
      dataSource={data}
      loading={isLoading}
      pagination={{
        showSizeChanger: true,
        defaultPageSize: DEFAULT_PAGE_SIZE,
      }}
      rowKey={(x) => x.jobId}
      scroll={{ x: data?.length ? 1850 : true }}
    >
      <Table.Column<JobInfo>
        dataIndex="jobId"
        width="5.2%"
        title={t(p("jobId"))}
        sorter={(a, b) => compareNumber(+a.jobId, +b.jobId)}
        defaultSortOrder="descend"
      />
      <Table.Column<JobInfo>
        dataIndex="name"
        ellipsis
        title={t(p("jobName"))}
        sorter={(a, b) => a.name.localeCompare(b.name)}
      />
      <Table.Column<JobInfo>
        dataIndex="account"
        width="10%"
        ellipsis
        title={t(p("account"))}
        sorter={(a, b) => a.account.localeCompare(b.account)}
      />
      <Table.Column<JobInfo>
        dataIndex="partition"
        width="6.5%"
        ellipsis
        title={t(p("partition"))}
        sorter={(a, b) => a.partition.localeCompare(b.partition)}
      />
      <Table.Column<JobInfo>
        dataIndex="qos"
        width="6.5%"
        ellipsis
        title={t(p("qos"))}
        sorter={(a, b) => (isNaN(Number(a.qos)) || isNaN(Number(b.qos))) ?
          a.qos.localeCompare(b.qos) : Number(a.qos) - Number(b.qos)}
      />
      <Table.Column<JobInfo>
        dataIndex="state"
        width="6%"
        title={t(p("state"))}
        sorter={(a, b) => a.state.localeCompare(b.state)}
      />
      <Table.Column<JobInfo>
        dataIndex="submitTime"
        width="8.6%"
        title={t(p("submitTime"))}
        render={(t) => formatDateTime(t)}
        sorter={(a, b) => Number(dayjs(a.submitTime).isAfter(dayjs(b.submitTime))) }
      />
      <Table.Column<JobInfo>
        dataIndex="startTime"
        width="8.6%"
        title={t(p("startTime"))}
        render={(t) => t ? formatDateTime(t) : "-"}
        sorter={(a, b) => Number(dayjs(a.startTime).isAfter(dayjs(b.startTime))) }
      />
      <Table.Column<JobInfo>
        dataIndex="endTime"
        width="8.6%"
        title={t(p("endTime"))}
        render={(t) => formatDateTime(t)}
        sorter={(a, b) => Number(dayjs(a.endTime).isAfter(dayjs(b.endTime))) }
      />
      <Table.Column<JobInfo>
        dataIndex="elapsed"
        width="5.4%"
        title={t(p("elapsed"))}
        sorter={(a, b) => compareTimeAsSeconds(a.elapsed, b.elapsed, ":")}
      />
      <Table.Column<JobInfo>
        dataIndex="timeLimit"
        width="6.5%"
        title={t(p("timeLimit"))}
        sorter={(a, b) => compareTimeAsSeconds(a.timeLimit, b.timeLimit, ":")}
      />
      <Table.Column<JobInfo>
        dataIndex="reason"
        ellipsis
        title={t(p("reason"))}
        render={(d: string) => d.startsWith("(") && d.endsWith(")") ? d.substring(1, d.length - 1) : d}
        sorter={(a, b) => a.reason.localeCompare(b.reason)}
      />
      <Table.Column<JobInfo>
        title={t(p("more"))}
        width="5%"
        fixed="right"
        render={(_, r) => (
          <Space>
            <a onClick={() => Router.push(join("/files", cluster.id, r.workingDirectory))}>
              {t(p("linkToPath"))}
            </a>
          </Space>
        )}
      />
    </Table>
  );
};


