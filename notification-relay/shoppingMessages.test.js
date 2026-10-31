import test from "node:test";
import assert from "node:assert/strict";
import { shoppingChanges, shoppingMessage } from "./shoppingMessages.js";

test("notifies additions to an empty list", () => {
  assert.deepEqual(shoppingChanges([], [{ id: "milk" }]), { added: 1, removed: 0 });
});
test("ignores checking, renaming and reordering existing items", () => {
  assert.deepEqual(shoppingChanges([{ id: "a" }, { id: "b" }], [{ id: "b", checked: true }, { id: "a", label: "Milk" }]), { added: 0, removed: 0 });
});
test("counts additions and removals independently", () => {
  assert.deepEqual(shoppingChanges([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }, { id: "d" }]), { added: 2, removed: 1 });
});
test("uses a shopping notification rather than a timer alarm", () => {
  const message = shoppingMessage({ token: "token", title: "Courses", added: "{count} ajouts", removed: "{count} suppressions" }, { added: 2, removed: 1 }, "ABC234", "event");
  assert.equal(message.body, "2 ajouts · 1 suppressions");
  assert.equal(message.channelId, "shopping");
  assert.equal(message.data.kind, "shopping");
  assert.equal(message.ttl, 3600);
  assert.equal(message.categoryId, undefined);
});
