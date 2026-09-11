const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { createApp } = require("../app");
const { cookieOptions } = require("../middleware/auth");

test("production cross-site sessions use a secure partitioned cookie", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSameSite = process.env.COOKIE_SAME_SITE;
  try {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAME_SITE = "none";
    const app = express().get("/", (_req, res) => res.cookie("session", "token", cookieOptions()).end());
    const cookie = (await request(app).get("/")).headers["set-cookie"][0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=None/);
    assert.match(cookie, /Partitioned/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSameSite === undefined) delete process.env.COOKIE_SAME_SITE;
    else process.env.COOKIE_SAME_SITE = previousSameSite;
  }
});

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
