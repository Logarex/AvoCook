export function shoppingChanges(before, after) {
  const previous = new Set((before ?? []).map((item) => item.id));
  const current = new Set((after ?? []).map((item) => item.id));
  return {
    added: [...current].filter((id) => !previous.has(id)).length,
    removed: [...previous].filter((id) => !current.has(id)).length,
  };
}
export function shoppingMessage(subscriber, changes, code, eventId) {
  const body = [
    changes.added ? subscriber.added.replaceAll("{count}", String(changes.added)) : "",
    changes.removed ? subscriber.removed.replaceAll("{count}", String(changes.removed)) : "",
  ].filter(Boolean).join(" · ");
  return {
    to: subscriber.token, title: subscriber.title, body, sound: "default",
    channelId: "shopping", priority: "high", ttl: 3600,
    data: { kind: "shopping", code, eventId },
  };
}
