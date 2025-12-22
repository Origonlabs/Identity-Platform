import { yupNumber, yupObject, yupString } from "@opendex/stack-shared/dist/schema-fields";
import { deindent } from "@opendex/stack-shared/dist/utils/strings";
import { createSmartRouteHandler } from "./smart-route-handler";

export const NotFoundHandler = createSmartRouteHandler({
  metadata: {
    hidden: true,
  },
  request: yupObject({
    url: yupString().defined(),
  }),
  response: yupObject({
    statusCode: yupNumber().oneOf([404]).defined(),
    bodyType: yupString().oneOf(["text"]).defined(),
    body: yupString().defined(),
  }),
  handler: async (req, fullReq) => {
    return {
      statusCode: 404,
      bodyType: "text",
      body: deindent`
        404 — this page does not exist in Atlas Identity Platform's API.
        
        Please see the API documentation at https://docs.opendex.com, or visit the dashboard at https://dashboard.opendex.com.

        URL: ${req.url}
      `,
    };
  },
});
