import { afterEach, describe, expect, it } from "vitest";
import {
  ANNOTATE_ROOT_ATTR,
  applyAnnotations,
  clearAnnotations,
  PAGE_GLOW_CLASS,
  SCAMHELP_ANNOTATION,
} from "./decorate.ts";

const decision = {
  title: "Rushing you on purpose",
  dont: "Don't hurry.",
  do: "Do take a break.",
};

describe("applyAnnotations scoping", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.className = "";
    document.getElementById("scamhelp-annotation-styles")?.remove();
  });

  it("only wraps quotes inside the provided root", () => {
    document.body.innerHTML = `
      <div id="outside">within 24 hours outside</div>
      <div id="email" ${ANNOTATE_ROOT_ATTR}="1">verify within 24 hours or closed</div>
    `;
    const root = document.getElementById("email");
    expect(root).toBeTruthy();

    const applied = applyAnnotations(
      decision,
      [{ quote: "within 24 hours", message: "Fake deadline." }],
      { root: root! },
    );

    expect(applied).toBe(1);
    expect(root!.querySelectorAll(`mark[${SCAMHELP_ANNOTATION}]`)).toHaveLength(
      1,
    );
    expect(
      document.querySelectorAll(`#outside mark[${SCAMHELP_ANNOTATION}]`),
    ).toHaveLength(0);
    expect(root!.classList.contains(PAGE_GLOW_CLASS)).toBe(true);
    expect(document.body.classList.contains(PAGE_GLOW_CLASS)).toBe(false);
  });

  it("staggers highlight sweep delays in reading order", () => {
    document.body.innerHTML = `<div id="email">first act now, then within 24 hours or closed</div>`;
    const root = document.getElementById("email")!;

    applyAnnotations(
      decision,
      [
        { quote: "act now", message: "Pressure." },
        { quote: "within 24 hours or closed", message: "Fake deadline." },
      ],
      { root },
    );

    const marks = [
      ...root.querySelectorAll<HTMLElement>(`mark[${SCAMHELP_ANNOTATION}]`),
    ];
    expect(marks.map((m) => [m.textContent, m.style.animationDelay])).toEqual([
      ["act now", "0ms"],
      ["within 24 hours or closed", "150ms"],
    ]);
    expect(marks[0].classList.contains("sh-hl")).toBe(true);
  });

  it("resolves rootSelector the same way", () => {
    document.body.innerHTML = `
      <div id="email" ${ANNOTATE_ROOT_ATTR}="1">act within 24 hours now</div>
    `;

    applyAnnotations(
      decision,
      [{ quote: "within 24 hours", message: "Fake deadline." }],
      { rootSelector: `[${ANNOTATE_ROOT_ATTR}]` },
    );

    expect(
      document.querySelectorAll(`#email mark[${SCAMHELP_ANNOTATION}]`),
    ).toHaveLength(1);
  });

  it("clears only marks inside the scoped root", () => {
    document.body.innerHTML = `
      <div id="email" ${ANNOTATE_ROOT_ATTR}="1">within 24 hours</div>
    `;
    applyAnnotations(
      decision,
      [{ quote: "within 24 hours", message: "Fake deadline." }],
      { rootSelector: `[${ANNOTATE_ROOT_ATTR}]` },
    );

    clearAnnotations({ rootSelector: `[${ANNOTATE_ROOT_ATTR}]` });
    expect(
      document.querySelectorAll(`mark[${SCAMHELP_ANNOTATION}]`),
    ).toHaveLength(0);
  });
});
