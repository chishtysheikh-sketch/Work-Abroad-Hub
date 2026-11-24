import fs from "node:fs";
import { expect } from "@playwright/test";
import { LOG } from "./global-setup.js";

let n = 0;
// real domain (the server checks it can receive mail); nothing is sent, emails go to the log
export const newEmail = tag => `wah.e2e.${tag}.${Date.now()}.${++n}@gmail.com`;
export const PASSWORD = "E2e-Pass-2468";

// the 6-digit code of the last "Confirm your email" email to this address
export async function emailCode(email) {
  let code = null;
  await expect.poll(() => {
    const log = fs.readFileSync(LOG, "utf8");
    const i = log.lastIndexOf(`to: ${email}`);
    code = i < 0 ? null : (log.slice(i, i + 400).match(/Your code: (\d{6})/) || [])[1] || null;
    return code;
  }, { message: `email code for ${email}` }).not.toBeNull();
  return code;
}

// open the student sign-up form from the header
export async function openStudentSignup(page) {
  await page.goto("/");
  await page.locator("#signupBtn").click();
  await page.locator("#pickStudent").click();
  await expect(page.locator("#stForm")).toBeVisible();
}

export async function fillStudent(page, { email, name = "E2E Student", phone = "01012345678" }) {
  const f = page.locator("#stForm");
  await f.locator('[name="name"]').fill(name);
  await f.locator('[name="email"]').fill(email);
  await f.locator('[name="password"]').fill(PASSWORD);
  await f.locator('[name="password2"]').fill(PASSWORD);
  await f.locator('[name="address"]').fill("Busan, Nam-gu");
  await f.locator('[name="phone"]').pressSequentially(phone);
  await f.locator('[name="school"]').fill("KSU");
  await f.locator('[name="agree"]').check();
}
