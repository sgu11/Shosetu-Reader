import { expect, test } from "@playwright/test";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("home, library, and profiles basic flow render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation").getByRole("link", { name: /^library$|^서재$/i })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: /^profiles$|^프로필$/i })).toBeVisible();

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: /library|서재/i })).toBeVisible();

  await page.goto("/profiles");
  await expect(page.getByRole("heading", { level: 1, name: /^profiles$|^프로필$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /create profile|프로필 만들기/i })).toBeVisible();
});

test("creating a profile updates the visible active profile state", async ({ page }) => {
  const profileName = `Loop Profile ${Date.now()}`;
  const escapedProfileName = escapeRegExp(profileName);

  await page.goto("/profiles");
  await page.getByPlaceholder(/profile name|프로필 이름/i).fill(profileName);
  await page.getByRole("button", { name: /create profile|프로필 만들기/i }).click();

  await expect(
    page.getByText(/profile created and activated|프로필을 만들고 바로 활성화했습니다/i),
  ).toBeVisible();
  await expect(page.getByText(new RegExp(`^active:\\s*${escapedProfileName}$|^활성:\\s*${escapedProfileName}$`, "i"))).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(new RegExp(`^active:\\s*${escapedProfileName}$|^활성:\\s*${escapedProfileName}$`, "i"))).toBeVisible();
});

test("navigation stays usable on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");

  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: /^library$|^서재$/i })).toBeVisible();
  await expect(nav.getByRole("link", { name: /^profiles$|^프로필$/i })).toBeVisible();
  await expect(nav.getByRole("link", { name: /^settings$|^설정$/i })).toBeVisible();
});

test("profile creation shows friendly validation feedback", async ({ page }) => {
  await page.goto("/profiles");
  await page.getByPlaceholder(/profile name|프로필 이름/i).fill("   ");
  await page.getByRole("button", { name: /create profile|프로필 만들기/i }).click();

  await expect(
    page.getByText(/could not create the profile|프로필을 만들지 못했습니다/i),
  ).toBeVisible();
});
