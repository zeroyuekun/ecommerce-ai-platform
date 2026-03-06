import { SearchIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const searchQueryType = defineType({
  name: "searchQuery",
  title: "Search Query",
  type: "document",
  icon: SearchIcon,
  fields: [
    defineField({
      name: "query",
      type: "string",
      description: "The search term (lowercase, trimmed)",
      validation: (rule) => [rule.required()],
    }),
    defineField({
      name: "count",
      type: "number",
      description: "Number of times this query has been searched",
      initialValue: 1,
      validation: (rule) => [rule.min(0)],
    }),
  ],
  preview: {
    select: {
      title: "query",
      subtitle: "count",
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: `${subtitle ?? 0} searches`,
      };
    },
  },
});
