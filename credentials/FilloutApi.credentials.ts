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
      name: "domain",
      type: "options",
      options: [
        {
          name: "api.fillout.com",
          value: "api.fillout.com",
        },
        {
          name: "eu-api.fillout.com",
          value: "eu-api.fillout.com",
        },
        {
          name: "ca-api.fillout.com",
          value: "ca-api.fillout.com",
        },
      ],
      default: "api.fillout.com",
      description:
        "This may be different if your Fillout account data is stored in another region",
    },
  ];
}
