import { defineQuery } from "next-sanity";

export const PRODUCT_FOR_INDEXING_QUERY = defineQuery(`
  *[_type == "product" && _id == $id][0]{
    _id,
    "slug": slug.current,
    name,
    description,
    price,
    stock,
    material,
    color,
    "category": category->slug.current
  }
`);
