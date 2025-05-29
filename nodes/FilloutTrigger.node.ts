import {
  IHookFunctions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  NodeConnectionType,
} from "n8n-workflow";

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
        displayName: "Form name",
        name: "form",
        type: "options",
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
        console.log("[Fillout] webhook checkExists:", webhookData.webhookId);
        return webhookData.webhookId !== undefined;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const { apiKey, baseUrl } = await this.getCredentials("filloutApi");

        const webhookData = this.getWorkflowStaticData("node");
        if (webhookData.webhookId !== undefined) {
          console.log("[Fillout] webhook already created, no changes");
          return true;
        }

        const webhookUrl = this.getNodeWebhookUrl("default");
        const formId = this.getNodeParameter("form") as string;

        console.log("[Fillout] creating webhook...");
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

        console.log("[Fillout] created webhook", data.id);
        webhookData.webhookId = data.id;
        return true;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const { apiKey, baseUrl } = await this.getCredentials("filloutApi");

        const webhookData = this.getWorkflowStaticData("node");
        if (webhookData.webhookId === undefined) {
          console.log("[Fillout] webhook already deleted, no changes");
          return true;
        }

        console.log("[Fillout] deleting webhook...");
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

        console.log("[Fillout] deleted webhook", webhookData.webhookId);
        delete webhookData.webhookId;
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    try {
      const body: any = this.getBodyData();
      const { submission } = JSON.parse(body);

      return {
        workflowData: [this.helpers.returnJsonArray([submission])],
      };
    } catch (error) {
      console.error("[Fillout] webhook error:", error);

      return {
        workflowData: [
          this.helpers.returnJsonArray([
            { error: "Error processing webhook data" },
          ]),
        ],
      };
    }
  }
}
