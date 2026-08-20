(() => {
  const forms = [...document.querySelectorAll("form")].map((form) => ({
    action: form.action || undefined,
    inputs: [...form.querySelectorAll("input, select, textarea")].map((el) => {
      const name = el.name || el.id || el.getAttribute("autocomplete");
      if (name) return name;
      if (el.type) return el.type;
      return "field";
    }),
  }));

  return {
    url: location.href,
    pageTitle: document.title,
    text: (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 8000),
    forms,
  };
})();
