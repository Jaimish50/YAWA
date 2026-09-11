const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { createApp } = require("../app");

test("health reflects database readiness and shutdown", async () => {
  const app = createApp();
  const previous = mongoose.connection.readyState;
  try {
    mongoose.connection.readyState = 0;
    await request(app).get("/healthz").expect(503);
    mongoose.connection.readyState = 1;
    await request(app).get("/healthz").expect(200, { status: "ok" });
    app.set("shuttingDown", true);
    await request(app).get("/healthz").expect(503);
  } finally {
    mongoose.connection.readyState = previous;
  }
});
