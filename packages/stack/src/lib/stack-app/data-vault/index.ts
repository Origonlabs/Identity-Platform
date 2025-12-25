
//===========================================
// THIS FILE IS AUTO-GENERATED FROM TEMPLATE. DO NOT EDIT IT DIRECTLY
//===========================================
import { AsyncStoreProperty } from "../common";

export type DataVaultStore =
  & {
    id: string,
    setValue: (key: string, value: string, options: { secret: string }) => Promise<void>,
  }
 & AsyncStoreProperty<"value", [key: string, options: { secret: string }], string | null, false>;
