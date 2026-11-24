import { test, expect } from "@playwright/test";
import { newEmail, emailCode, openStudentSignup, fillStudent, PASSWORD } from "./helpers.js";

async function confirmEmail(page, email) {
  await expect(page.locator("#vcInput")).toBeVisible();
  await page.locator("#vcInput").fill(await emailCode(email));
  await expect(page.locator(".toast")).toContainText("Email confirmed");
}

test("employer posts a job, a student applies, the employer sees the applicant", async ({ browser }) => {
  const title = `E2E Barista ${Date.now()}`;

  // ---- employer: sign up (invalid business number first), confirm email, post a job ----
  const emp = await (await browser.newContext()).newPage();
  const empEmail = newEmail("employer");
  await emp.goto("/");
  await emp.locator("#signupBtn").click();
  await emp.locator("#pickEmployer").click();
  const ef = emp.locator("#emForm");
  await ef.locator('[name="email"]').fill(empEmail);
  await ef.locator('[name="password"]').fill(PASSWORD);
  await ef.locator('[name="password2"]').fill(PASSWORD);
  await ef.locator('[name="name"]').fill("E2E Coffee");
  await ef.locator('[name="biz"]').fill("123-45-67890");
  await ef.locator('[name="contact"]').fill("Kim Manager");
  await ef.locator('[name="phone"]').fill("02-123-4567");
  await ef.locator('[name="agree"]').check();
  await emp.locator("#emSubmit").click();
  await expect(emp.locator("#err_biz")).toContainText("isn't valid");
  await ef.locator('[name="biz"]').fill("220-81-62517");
  await emp.locator("#emSubmit").click();
  await confirmEmail(emp, empEmail);

  const jf = emp.locator("#jobForm");
  await expect(jf).toBeVisible();
  await jf.locator('[name="title"]').fill(title);
  await jf.locator('[name="city"]').selectOption("Remote");
  await jf.locator('[name="area"]').fill("Online");
  await jf.locator('[name="hours"]').fill("Sat 10:00–16:00");
  await jf.locator('[name="payType"]').selectOption("hourly");
  await jf.locator('[name="pay"]').fill("9000");                     // below minimum wage → refused
  await jf.locator('[name="desc"]').fill("Make coffee and talk with customers in English.");
  // below the minimum wage: warning shown and Publish disabled
  await expect(emp.locator("#jfMinPay")).toContainText("Below minimum wage");
  await expect(emp.locator("#jfSubmit")).toBeDisabled();
  await jf.locator('[name="pay"]').fill("12000");
  await expect(emp.locator("#jfSubmit")).toBeEnabled();
  await emp.locator("#jfSubmit").click();
  await expect(emp.locator(".toast")).toContainText("Job published");

  // ---- student: sign up, confirm email, find the job, apply ----
  const stu = await (await browser.newContext()).newPage();
  const stuEmail = newEmail("applicant");
  await openStudentSignup(stu);
  await fillStudent(stu, { email: stuEmail, name: "Applicant Lee" });
  await stu.locator("#stSubmit").click();
  await confirmEmail(stu, stuEmail);
  await stu.goto("/");
  await stu.locator("article.job", { hasText: title }).locator("h3, h4, .t, b").first().click();
  await stu.locator('#applyForm [name="msg"]').fill("I can work every Saturday.");
  await stu.locator('#applyForm button[type="submit"]').click();
  await expect(stu.locator(".success")).toContainText("Application sent");

  // ---- employer: the applicant shows up (live, no reload) ----
  await emp.locator('#pNav [data-p="applicants"]').click();
  await expect(emp.locator("#pg_applicants")).toContainText("Applicant Lee", { timeout: 15_000 });
});
