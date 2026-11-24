import { test, expect } from "@playwright/test";
import { newEmail, emailCode, openStudentSignup, fillStudent } from "./helpers.js";

test("a misspelled email gets a warning before sign-up", async ({ page }) => {
  await openStudentSignup(page);
  const email = page.locator('#stForm [name="email"]');
  await email.fill("someone@gmial.com");
  await email.blur();
  await expect(page.locator("#err_email")).toContainText("Did you mean someone@gmail.com?");
  await email.fill("someone@mailinator.com");
  await email.blur();
  await expect(page.locator("#err_email")).toContainText("temporary inbox");
});

test("the phone number is formatted and must start with 010", async ({ page }) => {
  await openStudentSignup(page);
  const phone = page.locator('#stForm [name="phone"]');
  await phone.pressSequentially("01012345678");
  await expect(phone).toHaveValue("010-1234-5678");
  await phone.fill("");
  await phone.pressSequentially("0111234");
  await expect(page.locator("#err_phone")).toContainText("start with 010");
});

test("student signs up, confirms the email with the code, and the reminder goes away", async ({ page }) => {
  const email = newEmail("student");
  await openStudentSignup(page);
  await fillStudent(page, { email });
  await page.locator("#stSubmit").click();

  // the code screen opens right after sign-up
  await expect(page.locator("#vcInput")).toBeVisible();
  await expect(page.locator(".vcode")).toContainText(email);

  // a wrong code is refused
  await page.locator("#vcInput").fill("000000");
  await expect(page.locator("#vcErr")).toContainText(/Wrong code|tries left/);

  // "Later" → the banner reminds; "Enter code" reopens the screen
  await page.locator("#vcLater").click();
  await expect(page.locator("#verifyBar")).toContainText("Confirm your email");
  await page.locator("#vbOpen").click();
  await page.locator("#vcInput").fill(await emailCode(email));      // auto-submits at 6 digits
  await expect(page.locator(".toast")).toContainText("Email confirmed");
  await expect(page.locator("#verifyBar")).toHaveCount(0);
});

test("the dashboard's avatar menu and stat cards open their pages", async ({ page }) => {
  const email = newEmail("menu");
  await openStudentSignup(page);
  await fillStudent(page, { email });
  await page.locator("#stSubmit").click();
  await page.locator("#vcInput").fill(await emailCode(email));
  await expect(page.locator(".toast")).toContainText("Email confirmed");

  await page.goto("/#me");
  await expect(page.locator("#sMe")).toBeVisible();
  await page.locator("#sMe").click();
  await page.getByRole("menuitem", { name: /My Profile/ }).click();
  await expect(page.locator("#sp_profile")).toBeVisible();

  await page.locator("#sNav [data-s=home]").click();
  await page.locator('.p-stat-link[data-sgo="saved"]').click();
  await expect(page.locator("#sp_saved")).toBeVisible();
});
