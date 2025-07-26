import {
  IHookFunctions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  NodeConnectionType,
  NodeOperationError,
} from "n8n-workflow";
import type { FilloutSubmission } from "@fillout/api";

export class FilloutTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Fillout Trigger",
    name: "filloutTrigger",
    icon: "file:fillout.svg",
    group: ["trigger"],
    version: 1,
    description: "Handle Fillout submissions via webhooks",
    defaults: {
      name: "Fillout Trigger",
    },
    inputs: [],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: "filloutApi",
        required: true,
      },
    ],
    webhooks: [
      {
        name: "default",
        httpMethod: "POST",
        responseMode: "onReceived",
        path: "webhook",
      },
    ],
    properties: [
      {
        displayName: "Form Name or ID",
        name: "form",
        type: "options",
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        required: true,
        typeOptions: {
          loadOptionsMethod: "getForms",
        },
        default: "",
      },
    ],
  };

  methods = {
    loadOptions: {
      async getForms(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        const { apiKey, baseUrl } = await this.getCredentials("filloutApi");

        const forms: any[] = await this.helpers.request({
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          method: "GET",
          uri: `${baseUrl}/forms`,
          json: true,
        });

        return forms.map((form) => ({
          name: String(form.name),
          value: String(form.formId),
        }));
      },
    },
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions) {
        const webhookData = this.getWorkflowStaticData("node");
        return webhookData.webhookId !== undefined;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const { apiKey, baseUrl } = await this.getCredentials("filloutApi");

        const webhookData = this.getWorkflowStaticData("node");
        if (webhookData.webhookId !== undefined) {
          return true;
        }

        const webhookUrl = this.getNodeWebhookUrl("default");
        const formId = this.getNodeParameter("form") as string;

        const data = await this.helpers.request({
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          uri: `${baseUrl}/webhook/create`,
          body: { formId, url: webhookUrl },
          json: true,
        });

        webhookData.webhookId = data.id;
        return true;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const { apiKey, baseUrl } = await this.getCredentials("filloutApi");

        const webhookData = this.getWorkflowStaticData("node");
        if (webhookData.webhookId === undefined) {
          return true;
        }

        await this.helpers.request({
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          uri: `${baseUrl}/webhook/delete`,
          body: { webhookId: webhookData.webhookId },
          json: true,
        });

        delete webhookData.webhookId;
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    try {
      const body: any = this.getBodyData();
      const submission: FilloutSubmission = JSON.parse(body).submission;

      // strip widget type out for readability
      const questions = submission.questions.map((_question) => {
        const { type, ...question } = _question;
        return question;
      });

      const transformedSubmission: { [k in keyof FilloutSubmission]?: any } = {
        ...submission,
        questions: transformArrayToIdMap(questions),
        calculations: transformArrayToIdMap(submission.calculations),
        documents: transformArrayToIdMap(submission.documents),
        scheduling: transformArrayToIdMap(submission.scheduling),
        payments: transformArrayToIdMap(submission.payments),
        urlParameters: transformArrayToIdMap(submission.urlParameters),
      };

      return {
        workflowData: [this.helpers.returnJsonArray([transformedSubmission])],
      };
    } catch (error) {
      throw new NodeOperationError(this.getNode(), error);
    }
  }
}

const transformArrayToIdMap = <T extends { id: string }>(
  arr: T[] | undefined
) => {
  if (!arr) return {};

  return Object.fromEntries(
    arr.map((item) => {
      const { id, ...etc } = item;
      return [id, etc];
    })
  );
};
