import { IgrantReaderProvider } from "./igrant_reader_provider";

export { IgrantReaderProvider };
export { OwsClient } from "./ows/client";
export { SettingsResolver } from "./ows/settings";
export {
  IgrantPluginOptions,
  SettingsRegisterOptions,
  OwsSettings,
  ISSUANCE_DONE_STATUSES,
  VERIFICATION_DONE_STATUS,
} from "./ows/types";
export default IgrantReaderProvider;
