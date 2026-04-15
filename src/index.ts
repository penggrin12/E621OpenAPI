import SwaggerUI from "swagger-ui";
import "swagger-ui/dist/swagger-ui.css";
import "swagger-themes/themes/dark.css";

// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
declare function plausible(event: string, properties?: { props: Record<string, string> }): void;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const spec = require("../openapi.yaml") as Record<string, unknown>;

function addEvent(selector: string, event: string, properties: (element: Element) => Record<string, string>): void {
    const items = Array.from(document.querySelectorAll(selector));
    for (const item of items) {
        const props = properties(item);
        item.classList.add(`plausible-event-name=${event.replaceAll(" ", "+")}`);
        for (const [key, value] of Object.entries(props)) {
            item.classList.add(`plausible-event-${key}=${value.replaceAll(" ", "+")}`);
        }
    }
}

interface E621ngCompareMetadata {
    behindBy: number | null;
    compareUrl: string;
}

function getBadgeColor(behindBy: number | null): string {
    if (behindBy === null) {
        return "#7f8c8d";
    }

    if (behindBy === 0) {
        return "#2ecc71";
    }

    return behindBy < 10 ? "#f1c40f" : "#e67e22";
}

function getBadgeText(commit: string | undefined, behindBy: number | null): string {
    if (behindBy === null) {
        return `e621ng master lag unknown${commit ? ` | ${commit.slice(0, 7)}` : ""}`;
    }

    if (behindBy === 0) {
        return `e621ng master up to date${commit ? ` | ${commit.slice(0, 7)}` : ""}`;
    }

    return `e621ng master ${behindBy} commit${behindBy === 1 ? "" : "s"} behind | ${commit?.slice(0, 7) ?? "unknown"}`;
}

function fetchLiveE621ngCompareMetadata(commit: string): Promise<E621ngCompareMetadata | null> {
    const compareApiUrl = `https://api.github.com/repos/e621ng/e621ng/compare/${commit}...master`;

    return fetch(compareApiUrl, {
        headers: {
            accept: "application/vnd.github+json",
        },
    }).then((response) => {
        if (!response.ok) {
            return null;
        }

        return response.json() as Promise<{ ahead_by?: unknown; html_url?: unknown }>;
    }).then((compare) => {
        if (!compare) {
            return null;
        }

        return {
            behindBy: typeof compare.ahead_by === "number" ? compare.ahead_by : null,
            compareUrl: typeof compare.html_url === "string" ? compare.html_url : "https://github.com/e621ng/e621ng/commits/master",
        };
    }).catch(() => null);
}

function renderE621ngStatus(): void {
    const info = (spec as { info: Record<string, string | undefined> }).info;
    const commit = info["x-e621ng-commit"];
    const compareUrl = info["x-e621ng-master-compare-url"] ?? "https://github.com/e621ng/e621ng";
    const rawBehindBy = Number.parseInt(info["x-e621ng-master-behind-by"] ?? "", 10);
    const initialBehindBy = Number.isNaN(rawBehindBy) ? null : rawBehindBy;

    const banner = document.createElement("div");
    banner.style.cssText = [
        "display:flex",
        "justify-content:center",
        "padding:16px 16px 0",
        "font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
    ].join(";");

    const badge = document.createElement("a");
    badge.href = compareUrl;
    badge.target = "_blank";
    badge.rel = "noreferrer";
    badge.title = "Compare this tracked e621ng commit against current master";
    badge.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "gap:10px",
        "padding:10px 14px",
        "border-radius:999px",
        "background:#1d2b34",
        "border:1px solid #395062",
        "color:#f3f7fb",
        "text-decoration:none",
        "font-size:13px",
        "line-height:1",
    ].join(";");

    const statusDot = document.createElement("span");
    statusDot.style.cssText = [
        "width:10px",
        "height:10px",
        "border-radius:999px",
        `background:${getBadgeColor(initialBehindBy)}`,
    ].join(";");

    const text = document.createElement("span");
    text.textContent = getBadgeText(commit, initialBehindBy);

    badge.append(statusDot, text);
    banner.append(badge);
    document.body.insertBefore(banner, document.querySelector("#swagger-ui"));

    if (!commit) {
        return;
    }

    void fetchLiveE621ngCompareMetadata(commit).then((compareMetadata) => {
        if (!compareMetadata) {
            return;
        }

        badge.href = compareMetadata.compareUrl;
        statusDot.style.background = getBadgeColor(compareMetadata.behindBy);
        text.textContent = getBadgeText(commit, compareMetadata.behindBy);
    });
}

renderE621ngStatus();

SwaggerUI({
    spec,
    dom_id: "#swagger-ui",
    onComplete() {
        addEvent("button.opblock-summary-control", "Toggle Endpoint", element => ({ endpoint: element.querySelector(".opblock-summary-description")!.textContent! }));
        addEvent(".btn.authorize ", "Open Authorize", () => ({}));
        addEvent(".json-schema-2020-12-accordion", "Toggle Schema", element => ({ schema: element.querySelector(".json-schema-2020-12__title")!.textContent! }));
        addEvent(".json-schema-2020-12-expand-deep-button", "Toggle Schema", element => ({ schema: element.parentNode!.querySelector(".json-schema-2020-12__title")!.textContent! }));
    },
    tryItOutEnabled: false,
    supportedSubmitMethods: [],
    validatorUrl: "none",
});
