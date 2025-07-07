import { splitwiseHandlers } from "./splitwise-handlers";
import { ynabHandlers } from "./ynab-handlers";

export const handlers = [...splitwiseHandlers, ...ynabHandlers];
