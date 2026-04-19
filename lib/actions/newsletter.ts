"use server";

import { client, writeClient } from "@/sanity/lib/client";

export async function subscribeNewsletter(email: string) {
  const trimmed = email.toLowerCase().trim();
  if (!trimmed) return { success: false, message: "Email is required." };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  try {
    const existing = await client.fetch(
      `*[_type == "newsletterSignup" && email == $email][0]`,
      { email: trimmed },
    );

    if (existing) {
      return { success: false, message: "You're already signed up!" };
    }

    await writeClient.create({
      _type: "newsletterSignup",
      email: trimmed,
      signedUpAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Thanks! Check your inbox for your code.",
    };
  } catch (error) {
    console.error("Newsletter signup failed:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
