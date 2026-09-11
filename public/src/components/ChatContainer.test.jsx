import React, { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatContainer from "./ChatContainer";
import api from "../utils/api";
import { markReadRoute } from "../utils/APIRoutes";

jest.mock("../utils/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("./ChatInput", () => () => null);
jest.mock("./Logout", () => () => null);

const first = { id: "1", from: "alice", to: "me", text: "Alice says hello", createdAt: "2026-09-11T10:00:00Z" };
let socket, listeners;
beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: [first] });
  api.post.mockReset().mockResolvedValue({ data: { status: true } });
  localStorage.clear();
  Element.prototype.scrollIntoView = jest.fn();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  listeners = {};
  socket = { on: jest.fn((name, callback) => { listeners[name] = callback; }),
    off: jest.fn((name) => { delete listeners[name]; }) };
});
afterEach(() => Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }));

function showChat() {
  return render(<ChatContainer currentChat={{ _id: "alice", username: "Alice" }}
    currentUser={{ _id: "me" }} socket={socket} onActivity={jest.fn()} onError={jest.fn()} />);
}

test("messages from another sender never appear in the selected conversation", async () => {
  const { unmount } = showChat();
  await screen.findByText(first.text);
  act(() => listeners["message:new"]({ ...first, id: "2", from: "bob", text: "Bob's private chat" }));
  expect(screen.queryByText("Bob's private chat")).not.toBeInTheDocument();
  act(() => listeners["message:new"]({ ...first, id: "3", text: "Another Alice message" }));
  expect(screen.getByText("Another Alice message")).toBeInTheDocument();
  act(() => listeners["message:new"]({ ...first, id: "3", text: "Another Alice message" }));
  expect(screen.getAllByText("Another Alice message")).toHaveLength(1);
  unmount();
  expect(socket.off).toHaveBeenCalledWith("message:new", expect.any(Function));
});

test("a hidden tab waits until visible before marking displayed messages read", async () => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  showChat();
  await screen.findByText(first.text);
  expect(api.post).not.toHaveBeenCalled();
  act(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(markReadRoute, { to: "alice", through: "1" }));
});
