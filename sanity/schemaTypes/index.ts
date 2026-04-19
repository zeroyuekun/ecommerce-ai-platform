import type { SchemaTypeDefinition } from "sanity";

import { categoryType } from "./categoryType";
import { customerType } from "./customerType";
import { newsletterSignupType } from "./newsletterSignupType";
import { orderType } from "./orderType";
import { productType } from "./productType";
import { searchQueryType } from "./searchQueryType";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    categoryType,
    customerType,
    productType,
    orderType,
    searchQueryType,
    newsletterSignupType,
  ],
};
