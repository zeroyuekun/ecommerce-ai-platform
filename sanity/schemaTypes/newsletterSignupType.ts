import { EnvelopeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const newsletterSignupType = defineType({
  name: "newsletterSignup",
  title: "Newsletter Signup",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: "email",
      type: "string",
      validation: (rule) => [rule.required()],
    }),
    defineField({
      name: "signedUpAt",
      type: "datetime",
      validation: (rule) => [rule.required()],
    }),
  ],
  preview: {
    select: {
      title: "email",
      subtitle: "signedUpAt",
    },
  },
});
