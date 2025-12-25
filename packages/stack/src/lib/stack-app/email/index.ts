
//===========================================
// THIS FILE IS AUTO-GENERATED FROM TEMPLATE. DO NOT EDIT IT DIRECTLY
//===========================================
import { XOR } from "@opendex/stack-shared/dist/utils/types";

export type AdminSentEmail = {
  id: string,
  to: string[],
  subject: string,
  recipient: string, // We'll derive this from to[0] for display
  sentAt: Date, // We'll derive this from sent_at_millis for display
  error?: unknown,
}

type SendEmailOptionsBase = {
  themeId?: string | null | false,
  subject?: string,
  notificationCategoryName?: string,
}


export type SendEmailOptions = SendEmailOptionsBase
  & XOR<[
    { userIds: string[] },
    { allUsers: true }
  ]>
  & XOR<[
    { html: string },
    {
      templateId: string,
      variables?: Record<string, any>,
    },
    { draftId: string }
  ]>
