export function sortContacts(contacts) {
  return [...contacts].sort((a, b) =>
    new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0) ||
    (b.lastMessageId || "").localeCompare(a.lastMessageId || "") ||
    a.username.localeCompare(b.username) || a._id.localeCompare(b._id));
}

export function applyIncomingMessage(contacts, event, currentUserId, activeChatId, visible) {
  const incoming = event.to === currentUserId;
  const peer = incoming ? event.sender : event.recipient;
  if (!peer || (!incoming && event.from !== currentUserId)) return contacts;
  const previous = contacts.find((contact) => contact._id === peer._id);
  const unread = incoming && !(peer._id === activeChatId && visible);
  const isLatest = !previous?.lastMessageAt || new Date(event.createdAt) > new Date(previous.lastMessageAt) ||
    (new Date(event.createdAt).getTime() === new Date(previous.lastMessageAt).getTime() &&
      event.id >= (previous.lastMessageId || ""));
  const updated = {
    ...previous, ...peer,
    lastMessageAt: isLatest ? event.createdAt : previous.lastMessageAt,
    lastMessageId: isLatest ? event.id : previous.lastMessageId,
    lastMessage: isLatest ? event.text : previous.lastMessage,
    unreadCount: (previous?.unreadCount || 0) + (unread ? 1 : 0),
  };
  return sortContacts([updated, ...contacts.filter((contact) => contact._id !== peer._id)]);
}

export function belongsToChat(message, userId, peerId) {
  return (message.from === userId && message.to === peerId) ||
    (message.from === peerId && message.to === userId);
}

export function mergeMessages(current, incoming) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt) || a.id.localeCompare(b.id));
}
