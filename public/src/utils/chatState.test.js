import { applyIncomingMessage, belongsToChat, mergeMessages } from "./chatState";

const contact = (id, time = null, unread = 0) => ({ _id: id, username: id, lastMessageAt: time, unreadCount: unread });
const event = (from, to, id = "1") => ({
  id, from, to, text: "Hello", createdAt: "2026-09-11T10:00:00Z",
  sender: { _id: from, username: from }, recipient: { _id: to, username: to },
});

test("incoming sender moves to the top and gets an unread dot while another chat is open", () => {
  const result = applyIncomingMessage([contact("alice"), contact("bob")], event("bob", "me"), "me", "alice", true);
  expect(result.map((item) => item._id)).toEqual(["bob", "alice"]);
  expect(result[0].unreadCount).toBe(1);
});

test("unread state is tracked independently for several senders", () => {
  let result = applyIncomingMessage([contact("alice"), contact("bob")], event("bob", "me"), "me", null, true);
  result = applyIncomingMessage(result, event("alice", "me", "2"), "me", null, true);
  expect(result[0]._id).toBe("alice");
  expect(result.every((item) => item.unreadCount === 1)).toBe(true);
});

test("a visible active chat does not gain an unread dot; a background tab does", () => {
  expect(applyIncomingMessage([contact("bob")], event("bob", "me"), "me", "bob", true)[0].unreadCount).toBe(0);
  expect(applyIncomingMessage([contact("bob")], event("bob", "me"), "me", "bob", false)[0].unreadCount).toBe(1);
});

test("outgoing messages reorder the peer but do not count as unread", () => {
  expect(applyIncomingMessage([contact("bob")], event("me", "bob"), "me", "bob", true)[0].unreadCount).toBe(0);
});

test("messages from other conversations are excluded", () => {
  expect(belongsToChat(event("bob", "me"), "me", "alice")).toBe(false);
  expect(belongsToChat(event("alice", "me"), "me", "alice")).toBe(true);
});

test("HTTP responses, live events and history fetches merge without duplicates or lost messages", () => {
  const earlier = { ...event("bob", "me", "1"), createdAt: "2026-09-11T09:00:00Z" };
  const latest = event("bob", "me", "2");
  expect(mergeMessages([latest], [earlier, latest]).map((message) => message.id)).toEqual(["1", "2"]);
});
