import { test as setup } from "@playwright/test";
import { writeFileSync } from "fs";
import path from "path";
import { login } from "./helpers";

const AUTH_FILE = path.join(__dirname, ".auth.json");

setup("authenticate production test user", async ({ page }) => {
  const email = process.env.PROD_TEST_EMAIL;
  const password = process.env.PROD_TEST_PASSWORD;
  if (!email || !password) {
    setup.skip();
    return;
  }

  await login(page, email, password);

  const cookies = await page.context().cookies();
  writeFileSync(
    AUTH_FILE,
    JSON.stringify({ email, password, userId: "prod-test-user", cookies }),
  );
});
