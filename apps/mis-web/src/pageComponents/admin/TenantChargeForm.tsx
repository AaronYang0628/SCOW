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

import { App, Button, Form, Input, InputNumber, Tag } from "antd";
import React, { useState } from "react";
import { useAsync } from "react-async";
import { api } from "src/apis";
import { ClickableA } from "src/components/ClickableA";
import { prefix, useI18nTranslateToString } from "src/i18n";
import { publicConfig } from "src/utils/config";

import { TenantSelector } from "../tenant/TenantSelector";

interface ChargeFields {
  tenantName: string;
  amount: number;
  comment: string;
  type: string;
}

const p = prefix("pageComp.admin.tenantChargeForm.");
const pCommon = prefix("common.");

const getTypes = async () => api.getUsedPayTypes({});

const UsedType: React.FC<{ onClick: (type: string) => void }> = ({ onClick }) => {

  const t = useI18nTranslateToString();

  const { isLoading, data } = useAsync({ promiseFn: getTypes });

  const createTag = (x: string) => (
    <Tag key={x} onClick={() => onClick(x)}>
      <ClickableA>{x}</ClickableA>
    </Tag>
  );

  return (
    <div>
      {
        publicConfig.PREDEFINED_CHARGING_TYPES.map(createTag)
      }
      {isLoading
        ? t(p("loadType"))
        : (data ? data.types.filter((x) => x && !publicConfig.PREDEFINED_CHARGING_TYPES.includes(x)) : [])
          .map(createTag)
      }
    </div>
  );

};

export const TenantChargeForm: React.FC = () => {

  const t = useI18nTranslateToString();

  const { message } = App.useApp();
  const [form] = Form.useForm<ChargeFields>();

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const { tenantName, amount, comment, type } = await form.validateFields();

    setLoading(true);

    const hide = message.loading(t(p("charging")), 0);

    // 2. upload the rest
    await api.tenantFinancePay({
      body: {
        tenantName,
        type,
        amount,
        comment,
      },
    })
      .httpError(404, () => {
        message.error(t(p("accountNotFound")));
      })
      .then(() => {
        message.success(t(p("chargeFinish")));
        form.resetFields();
      })
      .finally(() => {
        setLoading(false);
        hide();
      });

  };

  return (
    <Form
      form={form}
      wrapperCol={{ span: 20 }}
      labelCol={{ span: 4 }}
      labelAlign="right"
      onFinish={submit}
    >
      <Form.Item
        name="tenantName"
        label={t(pCommon("tenant"))}
        rules={[{ required: true }]}
      >
        <TenantSelector
          placeholder={t(pCommon("selectTenant"))}
          autoSelect
          // onChange={(tenantName) => form.setFieldValue("tenantName", tenantName)}
        />
      </Form.Item>
      <Form.Item name="amount" label={t(pCommon("amount"))} rules={[{ required: true }]}>
        <InputNumber
          step={1 / Math.pow(10, publicConfig.JOB_CHARGE_DECIMAL_PRECISION)}
          addonAfter={t(pCommon("unit"))}
          precision={publicConfig.JOB_CHARGE_DECIMAL_PRECISION}
        />
      </Form.Item>
      <Form.Item
        name="type"
        label={t(pCommon("type"))}
        required
        extra={(
          <div style={{ margin: "8px 0" }}>
            <UsedType
              onClick={(type) => form.setFieldsValue({ type })}
            />
          </div>
        )}
      >
        <Input />
      </Form.Item>
      <Form.Item name="comment" label={t(pCommon("comment"))}>
        <Input.TextArea />
      </Form.Item>
      <Form.Item wrapperCol={{ span: 6, offset: 4 }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          {t(pCommon("submit"))}
        </Button>
      </Form.Item>
    </Form>
  );
};
