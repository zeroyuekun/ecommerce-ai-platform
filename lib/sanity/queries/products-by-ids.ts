import { defineQuery } from "next-sanity";

export const SEARCH_PRODUCTS_BY_IDS_QUERY = defineQuery(`
  *[_type == "product" && _id in $ids]{
    _id,
    name,
    "slug": slug.current,
    price,
    salePrice,
    "images": images[0...4]{
      _key,
      asset->{ _id, url }
    },
    category->{
      _id,
      title,
      "slug": slug.current
    },
    material,
    color,
    stock
  }
`);
