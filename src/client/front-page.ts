window.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form")!;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    window.location.pathname = `/${data.get("room-name")}`;
  });
  const input = form.querySelector("input")!;
  // @ts-ignore
  input.value = crypto.randomUUID();
});
