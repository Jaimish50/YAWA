import React from "react";
import { TextEncoder } from "util";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Register from "./Register";
import api from "../utils/api";
import { registerRoute, verifyRegistrationRoute } from "../utils/APIRoutes";

jest.mock("../utils/api", () => ({
  __esModule: true, default: { post: jest.fn() },
  apiError: (error) => error.response?.data?.msg || "Request failed",
}));
jest.mock("react-toastify", () => ({
  ToastContainer: () => null,
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => { api.post.mockReset(); global.TextEncoder = TextEncoder; localStorage.clear(); });

function fillRegistration() {
  render(<MemoryRouter initialEntries={["/register"]}><Routes>
    <Route path="/register" element={<Register />} />
    <Route path="/setAvatar" element={<p>Choose your avatar</p>} />
  </Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "alice" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.test" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "TestPassword!1234" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "TestPassword!1234" } });
}

test("registration waits for email verification and never puts credentials in localStorage", async () => {
  api.post.mockResolvedValueOnce({ data: { challengeId: "challenge", email: "alice@example.test", resendAfter: 60 } })
    .mockResolvedValueOnce({ data: { status: true } });
  fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
  expect(await screen.findByLabelText("Email verification code")).toBeInTheDocument();
  expect(api.post).toHaveBeenNthCalledWith(1, registerRoute, { username: "alice", email: "alice@example.test" });
  expect(screen.queryByText("Choose your avatar")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Resend code in/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Email verification code"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify & create account" }));
  await waitFor(() => expect(screen.getByText("Choose your avatar")).toBeInTheDocument());
  expect(api.post).toHaveBeenNthCalledWith(2, verifyRegistrationRoute, {
    username: "alice", email: "alice@example.test", password: "TestPassword!1234", challengeId: "challenge", code: "123456",
  });
  expect(localStorage.length).toBe(0);
});

test("invalid OTP keeps the user on verification and allows another attempt", async () => {
  api.post.mockResolvedValueOnce({ data: { challengeId: "challenge", email: "alice@example.test", resendAfter: 60 } })
    .mockRejectedValueOnce({ response: { data: { msg: "Invalid code" } } });
  fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
  fireEvent.change(await screen.findByLabelText("Email verification code"), { target: { value: "000000" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify & create account" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Verify & create account" })).toBeEnabled());
  expect(screen.queryByText("Choose your avatar")).not.toBeInTheDocument();
});
