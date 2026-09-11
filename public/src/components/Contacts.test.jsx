import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Contacts from "./Contacts";

test("selection follows the contact ID after reorder and unread senders have a green dot", () => {
  const alice = { _id: "a", username: "Alice", unreadCount: 0 };
  const bob = { _id: "b", username: "Bob", unreadCount: 2 };
  const changeChat = jest.fn();
  const { rerender } = render(<Contacts contacts={[alice, bob]} currentChatId="a" changeChat={changeChat} />);
  rerender(<Contacts contacts={[bob, alice]} currentChatId="a" changeChat={changeChat} />);
  expect(screen.getByRole("button", { name: "Alice" })).toHaveAttribute("aria-pressed", "true");
  const unread = screen.getByRole("button", { name: "Bob, 2 unread messages" });
  expect(unread.querySelector(".unread-dot")).toBeInTheDocument();
  fireEvent.click(unread);
  expect(changeChat).toHaveBeenCalledWith(bob);
});
