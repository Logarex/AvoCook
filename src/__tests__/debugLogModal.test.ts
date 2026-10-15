import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DebugLogModal } from "../components/DebugLogModal";
const mocks = vi.hoisted(() => ({
  logs: [] as { id: string; timestamp: string; level: string; tag: string; message: string }[],
  copy: vi.fn(), share: vi.fn(), alert: vi.fn()
}));
vi.mock("react-native", () => ({ Modal: "Modal", Pressable: "Pressable", ScrollView: "ScrollView", View: "View", Platform: { select: () => "monospace" }, StyleSheet: { create: (styles: unknown) => styles }, Alert: { alert: mocks.alert } }));
vi.mock("lucide-react-native", () => ({ AlertTriangle: "Warning", Check: "Check", Copy: "Copy", FileText: "File", RefreshCw: "Refresh", Share2: "Share", Trash2: "Trash", X: "Close" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { primary: "green", background: "white", border: "grey" } }) }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../features/logging/logService", () => ({ logService: {
  getLogs: () => mocks.logs, isLikelySelfSignedSslError: () => false,
  copyLogsToClipboard: mocks.copy, shareLogReport: mocks.share, clearLogs: vi.fn()
} }));
let screen: ReactTestRenderer;
const props = { visible: false, onClose: vi.fn() };
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mocks.logs = []; mocks.copy.mockResolvedValue(true); mocks.share.mockResolvedValue(true); });
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); });
async function render(visible = true) { await act(async () => { screen = create(React.createElement(DebugLogModal, { ...props, visible })); }); }

it("reloads diagnostic entries when the modal is reopened", async () => {
  await render(false);
  mocks.logs = [{ id: "1", timestamp: "2026-10-14T12:00:00Z", level: "ERROR", tag: "test", message: "Latest entry" }];
  await act(async () => { screen.update(React.createElement(DebugLogModal, { ...props, visible: true })); });
  expect(JSON.stringify(screen.toJSON())).toContain("Latest entry");
});

it("reports unavailable clipboard access instead of showing a false success", async () => {
  mocks.copy.mockResolvedValueOnce(false);
  await render();
  const copy = screen.root.findAll((node) => String(node.type) === "Button")[0];
  await act(async () => { await copy.props.onPress(); });
  expect(mocks.alert).toHaveBeenCalledWith("logs.exportFailedTitle", "logs.exportFailed");
  expect(JSON.stringify(screen.toJSON())).not.toContain("auth.copied");
});

it("handles a rejected share without an unhandled promise", async () => {
  mocks.share.mockRejectedValueOnce(new Error("Sharing unavailable"));
  await render();
  const share = screen.root.findAll((node) => String(node.type) === "Button")[1];
  await act(async () => { await share.props.onPress(); });
  expect(mocks.alert).toHaveBeenCalledWith("logs.exportFailedTitle", "logs.exportFailed");
});
