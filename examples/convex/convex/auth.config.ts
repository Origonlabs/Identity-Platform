import { getConvexProvidersConfig } from "@opendex/stack";

export default {
  providers: getConvexProvidersConfig({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  }),
}
