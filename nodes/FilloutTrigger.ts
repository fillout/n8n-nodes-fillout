import {
  IHookFunctions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
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
        const { apiKey, domain } = await this.getCredentials("filloutApi");

        const forms: any[] = await this.helpers.request({
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          method: "GET",
          uri: `https://${domain}/v1/api/forms`,
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
        const { apiKey, domain } = await this.getCredentials("filloutApi");

        const webhookUrl = this.getNodeWebhookUrl("default");
        const webhookData = this.getWorkflowStaticData("node");
        const formId = this.getNodeParameter("form") as string;

        const data = await this.helpers.request({
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          uri: `https://${domain}/v1/api/webhook/create`,
          body: { formId, url: webhookUrl },
          json: true,
        });

        webhookData.webhookId = data.id;
        return true;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const { apiKey, domain } = await this.getCredentials("filloutApi");

        const webhookData = this.getWorkflowStaticData("node");

        await this.helpers.request({
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          uri: `https://${domain}/v1/api/webhook/delete`,
          body: { webhookId: webhookData.webhookId },
          json: true,
        });

        delete webhookData.webhookId;
        return true;
      },
    },
  };
}
