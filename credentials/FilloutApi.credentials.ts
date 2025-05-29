import { ICredentialType, INodeProperties } from "n8n-workflow";

export class FilloutApi implements ICredentialType {
  name = "filloutApi";
  displayName = "Fillout API";
  documentationUrl = "https://build.fillout.com/home/settings/developer";
  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "options",
      options: [
        {
          name: "https://api.fillout.com/v1/api",
          value: "https://api.fillout.com/v1/api",
        },
        {
          name: "https://eu-api.fillout.com/v1/api",
          value: "https://eu-api.fillout.com/v1/api",
        },
        {
          name: "https://ca-api.fillout.com/v1/api",
          value: "https://ca-api.fillout.com/v1/api",
        },
      ],
      default: "https://api.fillout.com/v1/api",
      description:
        "This may be different if your Fillout account data is stored in another region",
    },
  ];
}
